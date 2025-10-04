const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'DigiSign Node.js Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Check enrollment status endpoint - checks if baseline signature exists for user
app.post('/check-enrollment', (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username || !username.trim()) {
      return res.status(400).json({
        enrolled: false,
        error: 'Username is required'
      });
    }
    
    const sanitizedUsername = username.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const baselinePath = path.join(__dirname, 'signatures', `${sanitizedUsername}_signature.png`);
    const enrolled = fs.existsSync(baselinePath);
    
    console.log(`Enrollment check for "${username}": ${enrolled ? 'User is enrolled' : 'User not enrolled'}`);
    
    res.json({
      enrolled: enrolled
    });
  } catch (error) {
    console.error('Error checking enrollment:', error);
    res.status(500).json({
      enrolled: false,
      error: 'Failed to check enrollment status'
    });
  }
});

// Verify signature endpoint - compares live signature against baseline
app.post('/verify-signature', (req, res) => {
  try {
    const { username, image } = req.body;

    // Validate username
    if (!username || !username.trim()) {
      return res.status(400).json({
        verified: false,
        error: 'Username is required'
      });
    }

    // Validate that live signature image data is provided
    if (!image) {
      return res.status(400).json({
        verified: false,
        error: 'No live signature image provided'
      });
    }

    // Check if baseline signature exists for this user
    const sanitizedUsername = username.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const baselinePath = path.join(__dirname, 'signatures', `${sanitizedUsername}_signature.png`);
    
    if (!fs.existsSync(baselinePath)) {
      return res.status(400).json({
        verified: false,
        error: 'No baseline signature found. Please enroll a signature first.'
      });
    }

    // Load baseline signature
    console.log('Loading baseline signature from:', baselinePath);
    
    // Process live signature image
    let liveImageData;
    if (image.startsWith('data:image/')) {
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      liveImageData = image.split(',')[1];
    } else {
      // Assume it's already base64 encoded
      liveImageData = image;
    }

    // Placeholder for ML similarity check
    // TODO: Implement actual ML-based signature comparison
    const similarityScore = performMLSimilarityCheck(baselinePath, liveImageData);

    // Determine verification result based on threshold
    const threshold = 0.75; // 75% similarity threshold
    const verified = similarityScore >= threshold;

    console.log(`Signature verification for "${username}": score=${similarityScore}, verified=${verified}`);

    res.json({
      verified: verified,
      score: Math.round(similarityScore * 100) / 100 // Round to 2 decimal places
    });

  } catch (error) {
    console.error('Error verifying signature:', error);
    res.status(500).json({
      verified: false,
      error: 'Failed to verify signature'
    });
  }
});

// Placeholder function for ML similarity check
function performMLSimilarityCheck(baselinePath, liveImageData) {
  // TODO: Implement actual ML-based signature comparison
  // This should:
  // 1. Load and preprocess both images
  // 2. Extract signature features
  // 3. Compare using ML model or similarity algorithms
  // 4. Return similarity score between 0 and 1
  
  console.log('🤖 ML Similarity Check (Placeholder)');
  console.log('   - Baseline image path:', baselinePath);
  console.log('   - Live image data length:', liveImageData.length);
  console.log('   - Simulating ML model processing...');
  
  // Simulate processing time
  const processingTime = Math.random() * 100 + 50; // 50-150ms
  
  // Return a mock similarity score for demonstration
  // In real implementation, this would be the actual ML model result
  const mockScore = Math.random() * 0.5 + 0.5; // Random score between 0.5-1.0
  
  console.log(`   - Similarity score: ${mockScore.toFixed(3)}`);
  return mockScore;
}

// Verify OTP endpoint - stub implementation (always returns success)
app.post('/verify-otp', (req, res) => {
  res.json({
    success: true,
    message: 'OTP verification endpoint is working',
    timestamp: new Date().toISOString()
  });
});

// Enroll signature endpoint - saves baseline signature image
app.post('/enroll-signature', (req, res) => {
  console.log('📥 Received enrollment request');
  
  try {
    const { username, image } = req.body;

    // Validate username
    if (!username || !username.trim()) {
      console.log('❌ No username provided');
      return res.status(400).json({
        enrolled: false,
        error: 'Username is required'
      });
    }

    // Validate that image data is provided
    if (!image) {
      console.log('❌ No image data provided');
      return res.status(400).json({
        enrolled: false,
        error: 'No image data provided'
      });
    }

    console.log('👤 Username:', username);
    console.log('📊 Image data length:', image.length);

    // Handle base64 image data
    let imageData;
    if (image.startsWith('data:image/')) {
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      imageData = image.split(',')[1];
      console.log('🔄 Extracted base64 from data URL');
    } else {
      // Assume it's already base64 encoded
      imageData = image;
      console.log('✓ Using raw base64 data');
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(imageData, 'base64');
    console.log('📦 Buffer size:', buffer.length, 'bytes');

    // Create signatures directory if it doesn't exist
    const signaturesDir = path.join(__dirname, 'signatures');
    if (!fs.existsSync(signaturesDir)) {
      fs.mkdirSync(signaturesDir);
      console.log('📁 Created signatures directory');
    }

    // Sanitize username to create safe filename
    const sanitizedUsername = username.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(signaturesDir, `${sanitizedUsername}_signature.png`);
    fs.writeFileSync(filePath, buffer);

    console.log(`✅ Baseline signature saved to: ${filePath}`);
    console.log(`📝 User "${username}" is now enrolled in DigiSign`);

    res.json({
      enrolled: true
    });

  } catch (error) {
    console.error('❌ Error saving signature:', error);
    res.status(500).json({
      enrolled: false,
      error: 'Failed to save signature image'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 DigiSign Node.js Backend is running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Available endpoints:`);
  console.log(`   POST /check-enrollment`);
  console.log(`   POST /verify-signature`);
  console.log(`   POST /verify-otp`);
  console.log(`   POST /enroll-signature`);
  console.log(`\n💡 Signatures will be saved in: ${path.join(__dirname, 'signatures')}`);
});

module.exports = app;