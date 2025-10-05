const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const Stripe = require('stripe');

// Load environment variables
require('dotenv').config();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_YOUR_SECRET_KEY');

// Create signatures directory if it doesn't exist
const signaturesDir = path.join(__dirname, 'signatures');
if (!fs.existsSync(signaturesDir)) {
  fs.mkdirSync(signaturesDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- GEMINI AI SIGNATURE VERIFICATION ---
async function getGeminiQualitativeScore(baselineBuffer, liveBuffer) {
  // Ensure the API key is available
  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY is not set. Returning fallback score.");
    return 0.3;
  }

  const ai = new GoogleGenAI(process.env.GEMINI_API_KEY);

  // Helper to convert Buffer to Part format
  function bufferToGenerativePart(buffer, mimeType) {
    return {
      inlineData: {
        data: buffer.toString("base64"),
        mimeType
      }
    };
  }

  const baselinePart = bufferToGenerativePart(baselineBuffer, "image/png");
  const livePart = bufferToGenerativePart(liveBuffer, "image/png");

  // Prompt for signature analysis
  const prompt = `You are a forensic signature analysis expert. Compare these two hand-drawn patterns.
Pattern 1 (baseline): A reference signature/pattern
Pattern 2 (live): A signature/pattern to verify

Analyze the visual similarity considering:
- Overall shape and structure
- Number of loops, curves, and angles
- Drawing style and stroke characteristics
- Spatial relationships between elements

Rate the similarity from 0 to 100, where:
- 100 = Identical or extremely similar
- 80-99 = Very similar with minor differences
- 60-79 = Similar with noticeable differences
- 40-59 = Somewhat similar but clearly different
- 20-39 = Barely similar
- 0-19 = Completely different

Respond with ONLY the numerical score (0-100). No explanation needed.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [baselinePart, livePart, prompt]
    });

    const scoreText = response.text.trim();
    const score = parseInt(scoreText);

    if (isNaN(score)) {
      console.error("Gemini did not return a valid number, using fallback score (0.3).");
      return 0.3;
    }

    const normalizedScore = Math.max(0, Math.min(1.0, score / 100));
    console.log(`   - Gemini AI Similarity: ${(normalizedScore * 100).toFixed(1)}%`);
    return normalizedScore;

  } catch (error) {
    console.error("❌ Gemini API Error (returning 0.3 fallback):", error.message);
    return 0.3;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'DigiSign Gemini AI Backend',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// Verify signature endpoint - uses only Gemini AI
app.post('/verify-signature', async (req, res) => {
  try {
    const { image, username } = req.body;

    if (!image) {
      return res.status(400).json({
        verified: false,
        error: 'No live signature image provided'
      });
    }

    let baselinePath;
    if (username) {
      baselinePath = path.join(signaturesDir, `${username}_signature.png`);
    } else {
      baselinePath = path.join(__dirname, 'base.png');
    }

    if (!fs.existsSync(baselinePath)) {
      return res.status(404).json({
        verified: false,
        error: username
          ? `No signature found for user "${username}". Please enroll a signature first.`
          : 'Baseline signature not found. Please enroll a signature first.'
      });
    }

    console.log('🧠 Starting Gemini AI signature verification...');

    const baselineBuffer = fs.readFileSync(baselinePath);
    const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '');
    const liveBuffer = Buffer.from(base64Data, 'base64');

    const similarityScore = await getGeminiQualitativeScore(baselineBuffer, liveBuffer);
    const threshold = parseFloat(process.env.SIGNATURE_THRESHOLD) || 0.6;
    const isMatch = similarityScore >= threshold;

    console.log(`📊 Verification Results:`);
    console.log(`   - Similarity Score: ${(similarityScore * 100).toFixed(1)}%`);
    console.log(`   - Threshold: ${(threshold * 100).toFixed(1)}%`);
    console.log(`   - Result: ${isMatch ? 'MATCH ✅' : 'NO MATCH ❌'}`);

    res.json({
      verified: isMatch,
      similarity: similarityScore,
      threshold: threshold,
      details: {
        method: 'Gemini AI',
        confidence: similarityScore
      }
    });
  } catch (error) {
    console.error('❌ Error in signature verification:', error);
    res.status(500).json({
      verified: false,
      error: 'Signature verification failed',
      details: { message: error.message }
    });
  }
});

// Enroll signature endpoint
app.post('/enroll-signature', async (req, res) => {
  try {
    const { image, username } = req.body;

    if (!image) {
      return res.status(400).json({ success: false, error: 'No signature image provided' });
    }

    if (!username) {
      return res.status(400).json({ success: false, error: 'Username is required for signature enrollment' });
    }

    const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const signaturePath = path.join(signaturesDir, `${username}_signature.png`);
    fs.writeFileSync(signaturePath, imageBuffer);

    console.log(`✅ Signature enrolled successfully for user: ${username}`);

    res.json({
      success: true,
      message: 'Signature enrolled successfully',
      details: {
        username: username,
        signaturePath: signaturePath,
        imageSize: imageBuffer.length
      }
    });
  } catch (error) {
    console.error('❌ Error enrolling signature:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enroll signature',
      details: { message: error.message }
    });
  }
});

// Verify OTP endpoint (stub)
app.post('/verify-otp', (req, res) => {
  res.json({
    success: true,
    message: 'OTP verification successful (stub)'
  });
});

// --- STRIPE PAYMENT INTEGRATION ---
function validateCreditCard(cardData) {
  const errors = [];
  if (!cardData) {
    errors.push('Card information is required');
    return { isValid: false, errors };
  }
  return { isValid: true, errors: [] };
}

async function verifyAuthentication(username, authType, authData) {
  try {
    if (authType === 'signature') {
      const baselinePath = path.join(signaturesDir, `${username}_signature.png`);
      if (!fs.existsSync(baselinePath)) return false;

      const baselineBuffer = fs.readFileSync(baselinePath);
      const base64Data = authData.image.replace(/^data:image\/[a-z]+;base64,/, '');
      const liveBuffer = Buffer.from(base64Data, 'base64');

      const similarityScore = await getGeminiQualitativeScore(baselineBuffer, liveBuffer);
      const threshold = parseFloat(process.env.SIGNATURE_THRESHOLD) || 0.6;
      return similarityScore >= threshold;
    } else if (authType === 'otp') {
      return authData.otpCode === '123456';
    }
    return false;
  } catch (error) {
    console.error('Authentication verification failed:', error);
    return false;
  }
}

app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, username, authType, authData, paymentMethodId, cardData } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    if (cardData) {
      const cardValidation = validateCreditCard(cardData);
      if (!cardValidation.isValid) {
        return res.status(400).json({
          error: 'Invalid card data',
          details: cardValidation.errors
        });
      }
    }

    const isAuthenticated = await verifyAuthentication(username, authType, authData);
    if (!isAuthenticated) {
      return res.status(401).json({
        error: 'Authentication failed. Please verify your identity first.',
        requiresAuth: true
      });
    }

    console.log(`💳 Creating payment intent for user: ${username}, amount: $${amount}`);

    const paymentIntentData = {
      amount: Math.round(amount * 100),
      currency: 'usd',
      metadata: { username, authType, validated: true },
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' }
    };

    if (paymentMethodId) {
      paymentIntentData.payment_method = paymentMethodId;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

    res.json({
      clientSecret: paymentIntent.client_secret,
      authenticated: true,
      message: 'Payment authorized by DigiSign authentication',
      paymentIntentId: paymentIntent.id
    });
  } catch (err) {
    console.error('Payment intent creation failed:', err);
    res.status(400).json({ error: err.message });
  }
});

app.post('/verify-payment', async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    res.json({
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata
    });
  } catch (err) {
    console.error('Payment verification failed:', err);
    res.status(400).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 DigiSign Backend with Stripe Integration running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Available endpoints:`);
  console.log(`   POST /verify-signature (Gemini AI only)`);
  console.log(`   POST /enroll-signature`);
  console.log(`   POST /verify-otp`);
  console.log(`   POST /create-payment-intent (Stripe)`);
  console.log(`   POST /verify-payment (Stripe)`);
  console.log(`\n🧠 Using Gemini AI for signature verification`);
  console.log(`💳 Using Stripe for payment processing`);
  console.log(`🔐 Gemini API Key: ${process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`🔐 Stripe Secret Key: ${process.env.STRIPE_SECRET_KEY ? '✅ Set' : '❌ Not set'}`);
});

module.exports = { app };
