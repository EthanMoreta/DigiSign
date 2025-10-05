const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai'); // <-- ADDED
const { performProfessionalSignatureVerification } = require('./signature-verification');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- NEW FUNCTION: GEMINI API CALL FOR QUALITATIVE SCORE ---
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

  // Prompt to force a numerical output (0-100)
  const prompt = `You are a forensic pattern comparison tool. Analyze the two hand-drawn patterns. 
  Pattern 1 is the baseline; Pattern 2 is the live submission.
  
  Score the visual similarity from 0 to 100, where 100 is identical and 0 is completely different.
  Be strict in your assessment. Focus on: overall shape, number of loops/sides, and drawing style.
  
  Respond ONLY with the score as a plain number (e.g., "75"). Do not add any text, explanation, or punctuation.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: [baselinePart, livePart, prompt]
    });

    const scoreText = response.text.trim();
    const score = parseInt(scoreText);

    if (isNaN(score)) {
      console.error("Gemini did not return a valid number, using fallback score (0.5).");
      return 0.5; 
    }
    
    // Normalize to 0.0 to 1.0
    const normalizedScore = Math.max(0, Math.min(1.0, score / 100));
    console.log(`   - Gemini Qualitative Similarity: ${(normalizedScore * 100).toFixed(1)}%`);
    return normalizedScore;

  } catch (error) {
    console.error("❌ Gemini API Error (returning 0.3 fallback):", error.message);
    // Return low similarity score on API failure to maintain security-first posture
    return 0.3; 
  }
}
// ----------------------------------------------------------------

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'DigiSign Node.js Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Verify signature endpoint - compares live signature against baseline
app.post('/verify-signature', async (req, res) => {
  try {
    const { image } = req.body;

    // Validate that live signature image data is provided
    if (!image) {
      return res.status(400).json({
        verified: false,
        error: 'No live signature image provided'
      });
    }

    // Check if baseline signature exists
    const baselinePath = path.join(__dirname, 'baseline_signature.png');
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

    // Professional signature verification
    const verificationResult = await performProfessionalSignatureVerification(baselinePath, liveImageData, {
      strictness: 'strict'  // Use strict mode for high security
    });
    
    const similarityScore = verificationResult.score;
    const threshold = verificationResult.threshold;
    const verified = verificationResult.isValid;

    console.log(`✅ Signature verification complete: score=${(similarityScore * 100).toFixed(1)}%, verified=${verified}`);

    res.json({
      verified: verified,
      score: Math.round(similarityScore * 100) / 100, // Round to 2 decimal places
      threshold: threshold,
      details: {
        message: verified ? 'Signature verified successfully' : 'Signature verification failed',
        confidence: similarityScore >= 0.85 ? 'high' : similarityScore >= 0.70 ? 'medium' : 'low'
      }
    });

  } catch (error) {
    console.error('❌ Error verifying signature:', error);
    res.status(500).json({
      verified: false,
      error: 'Failed to verify signature',
      details: { message: error.message }
    });
  }
});

// Gemini AI-only signature verification function
async function performMLSimilarityCheck(baselinePath, liveImageData) {
  try {
    console.log('🤖 Gemini AI Signature Verification Starting...');
    console.log('   - Baseline image path:', baselinePath);
    console.log('   - Live image data length:', liveImageData.length);
    
    // Convert base64 to buffer for live signature
    const liveBuffer = Buffer.from(liveImageData, 'base64');
    
    // Read baseline image
    const baselineBuffer = require('fs').readFileSync(baselinePath);
    
    // Use only Gemini AI for verification
    const finalScore = await getGeminiQualitativeScore(baselineBuffer, liveBuffer);
    
    console.log('📊 Gemini AI Results:');
    console.log(`   - AI Similarity Score: ${(finalScore * 100).toFixed(1)}%`);
    console.log(`   - Final Score: ${(finalScore * 100).toFixed(1)}%`);
    
    return finalScore;
    
  } catch (error) {
    console.error('❌ Error in Gemini AI verification:', error.message);
    // Return low similarity score on error to be safe
    return 0.3;
  }
}

// All mathematical algorithms removed - using only Gemini AI

// Structural similarity using Sharp raw data
function calculateStructuralSimilaritySharp(img1Data, img2Data) {
  try {
    console.log('🔍 Calculating structural similarity...');
    
    const { data: data1, info: info1 } = img1Data;
    const { data: data2, info: info2 } = img2Data;
    
    // Ensure images are the same size
    if (info1.width !== info2.width || info1.height !== info2.height) {
      console.log('⚠️  Images have different dimensions');
      return 0.3;
    }
    
    const threshold = 128;
    let correlation = 0;
    let totalPixels = 0;
    
    // Process raw image data (assuming grayscale or taking first channel)
    for (let i = 0; i < data1.length; i += info1.channels) {
      const pixel1 = data1[i] < threshold ? 1 : 0; // Black = signature
      const pixel2 = data2[i] < threshold ? 1 : 0;
      
      if (pixel1 === pixel2) correlation++;
      totalPixels++;
    }
    
    const similarity = correlation / totalPixels;
    console.log(`   - Structural correlation: ${(similarity * 100).toFixed(1)}%`);
    return similarity;
    
  } catch (error) {
    console.error('Error in structural similarity:', error);
    return 0.3;
  }
}

// Hash-based similarity using perceptual hashing
async function calculateHashSimilarity(img1Buffer, img2Buffer) {
  return new Promise((resolve) => {
    console.log('🔍 Calculating hash similarity...');
    
    const { imageHash } = require('image-hash');
    const fs = require('fs');
    const path = require('path');
    
    try {
      // Create temporary files for the image-hash library
      const tempDir = __dirname;
      const temp1Path = path.join(tempDir, 'temp_hash_1.png');
      const temp2Path = path.join(tempDir, 'temp_hash_2.png');
      
      // Write buffers to temporary files
      fs.writeFileSync(temp1Path, img1Buffer);
      fs.writeFileSync(temp2Path, img2Buffer);
      
      imageHash(temp1Path, 16, 'hex', (error, hash1) => {
        if (error) {
          console.error('Hash error 1:', error);
          // Clean up temp files
          try { fs.unlinkSync(temp1Path); } catch (e) {}
          try { fs.unlinkSync(temp2Path); } catch (e) {}
          return resolve(0.3);
        }
        
        imageHash(temp2Path, 16, 'hex', (error, hash2) => {
          if (error) {
            console.error('Hash error 2:', error);
            // Clean up temp files
            try { fs.unlinkSync(temp1Path); } catch (e) {}
            try { fs.unlinkSync(temp2Path); } catch (e) {}
            return resolve(0.3);
          }
          
          // Calculate Hamming distance
          const hammingDistance = calculateHammingDistance(hash1, hash2);
          const maxDistance = hash1.length * 4; // 4 bits per hex digit
          const similarity = 1 - (hammingDistance / maxDistance);
          
          console.log(`   - Hash similarity: ${(similarity * 100).toFixed(1)}%`);
          console.log(`   - Hash 1: ${hash1}`);
          console.log(`   - Hash 2: ${hash2}`);
          console.log(`   - Hamming distance: ${hammingDistance}`);
          
          // Clean up temp files
          try { fs.unlinkSync(temp1Path); } catch (e) {}
          try { fs.unlinkSync(temp2Path); } catch (e) {}
          
          resolve(Math.max(0, similarity));
        });
      });
    } catch (error) {
      console.error('Error in hash similarity setup:', error);
      resolve(0.3);
    }
  });
}

// Calculate Hamming distance between two hex hashes
function calculateHammingDistance(hash1, hash2) {
  if (hash1.length !== hash2.length) return hash1.length * 4;
  
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
    distance += xor.toString(2).split('1').length - 1; // Count 1s
  }
  return distance;
}

// Contour-based similarity for signature comparison
function calculateContourSimilarity(img1Data, img2Data) {
  try {
    console.log('🔍 Calculating contour similarity...');
    
    const { data: data1, info: info1 } = img1Data;
    const { data: data2, info: info2 } = img2Data;
    
    // Ensure images are the same size
    if (info1.width !== info2.width || info1.height !== info2.height) {
      console.log('⚠️  Images have different dimensions for contour analysis');
      return 0.3;
    }
    
    // Extract contour features from both images
    const contours1 = extractContourFeatures(data1, info1);
    const contours2 = extractContourFeatures(data2, info2);
    
    // Compare contour features
    const similarity = compareContourFeatures(contours1, contours2);
    
    console.log(`   - Contour points: ${contours1.edgePixels} vs ${contours2.edgePixels}`);
    console.log(`   - Shape complexity: ${contours1.complexity.toFixed(2)} vs ${contours2.complexity.toFixed(2)}`);
    console.log(`   - Contour similarity: ${(similarity * 100).toFixed(1)}%`);
    
    return similarity;
    
  } catch (error) {
    console.error('Error in contour similarity:', error);
    return 0.3;
  }
}

// Extract contour features from image data
function extractContourFeatures(data, info) {
  const width = info.width;
  const height = info.height;
  const channels = info.channels;
  const threshold = 128;
  
  let edgePixels = 0;
  let totalSignaturePixels = 0;
  let boundingBox = { minX: width, maxX: 0, minY: height, maxY: 0 };
  
  // Find edge pixels and calculate bounding box
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * channels;
      const pixel = data[idx];
      
      // Check if this is part of the signature (dark pixel)
      if (pixel < threshold) {
        totalSignaturePixels++;
        
        // Update bounding box
        if (x < boundingBox.minX) boundingBox.minX = x;
        if (x > boundingBox.maxX) boundingBox.maxX = x;
        if (y < boundingBox.minY) boundingBox.minY = y;
        if (y > boundingBox.maxY) boundingBox.maxY = y;
        
        // Check if this is an edge pixel (has white neighbors)
        let hasWhiteNeighbor = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = (ny * width + nx) * channels;
              if (data[nIdx] >= threshold) {
                hasWhiteNeighbor = true;
                break;
              }
            }
          }
          if (hasWhiteNeighbor) break;
        }
        
        if (hasWhiteNeighbor) {
          edgePixels++;
        }
      }
    }
  }
  
  // Calculate shape features
  const boundingWidth = boundingBox.maxX - boundingBox.minX + 1;
  const boundingHeight = boundingBox.maxY - boundingBox.minY + 1;
  const aspectRatio = boundingWidth / boundingHeight;
  
  // Shape complexity (ratio of edge pixels to total signature pixels)
  const complexity = totalSignaturePixels > 0 ? edgePixels / totalSignaturePixels : 0;
  
  // Compactness (how filled the bounding box is)
  const compactness = totalSignaturePixels / (boundingWidth * boundingHeight);
  
  return {
    edgePixels,
    totalSignaturePixels,
    aspectRatio,
    complexity,
    compactness,
    boundingWidth,
    boundingHeight
  };
}

// Compare contour features between two signatures
function compareContourFeatures(features1, features2) {
  // Handle edge cases
  if (features1.totalSignaturePixels === 0 || features2.totalSignaturePixels === 0) {
    return features1.totalSignaturePixels === features2.totalSignaturePixels ? 1.0 : 0.0;
  }
  
  // Compare various shape metrics
  const edgeSim = 1 - Math.abs(features1.edgePixels - features2.edgePixels) / 
                     Math.max(features1.edgePixels, features2.edgePixels);
  
  const sizeSim = 1 - Math.abs(features1.totalSignaturePixels - features2.totalSignaturePixels) / 
                     Math.max(features1.totalSignaturePixels, features2.totalSignaturePixels);
  
  const aspectSim = 1 - Math.abs(features1.aspectRatio - features2.aspectRatio) / 
                       Math.max(features1.aspectRatio, features2.aspectRatio);
  
  const complexitySim = 1 - Math.abs(features1.complexity - features2.complexity);
  
  const compactnessSim = 1 - Math.abs(features1.compactness - features2.compactness);
  
  // Weighted combination
  const weights = {
    edge: 0.30,      // Edge similarity is important for shape
    size: 0.20,      // Overall size similarity
    aspect: 0.20,    // Aspect ratio similarity
    complexity: 0.15, // Shape complexity
    compactness: 0.15 // How filled the shape is
  };
  
  const finalSimilarity = 
    edgeSim * weights.edge +
    sizeSim * weights.size +
    aspectSim * weights.aspect +
    complexitySim * weights.complexity +
    compactnessSim * weights.compactness;
  
  return Math.max(0, Math.min(1, finalSimilarity));
}

// Calculate final score using ONLY Gemini AI (much more accurate)
function calculateWeightedScore(metrics) {
  // Use only Gemini AI score for final decision
  // Fallback to structural similarity if Gemini is not available
  return metrics.geminiScore !== undefined ? metrics.geminiScore : metrics.structural;
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
  try {
    const { image } = req.body;

    // Validate that image data is provided
    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'No image data provided'
      });
    }

    // Handle base64 image data
    let imageData;
    if (image.startsWith('data:image/')) {
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      imageData = image.split(',')[1];
    } else {
      // Assume it's already base64 encoded
      imageData = image;
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(imageData, 'base64');

    // Save to baseline_signature.png in the current directory
    const filePath = path.join(__dirname, 'baseline_signature.png');
    fs.writeFileSync(filePath, buffer);

    console.log(`Baseline signature saved to: ${filePath}`);

    res.json({
      enrolled: true
    });

  } catch (error) {
    console.error('Error saving signature:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save signature image'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 DigiSign Node.js Backend is running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Available endpoints:`);
  console.log(`   POST /verify-signature`);
  console.log(`   POST /verify-otp`);
  console.log(`   POST /enroll-signature`);
});

module.exports = { 
  app, 
  performProfessionalSignatureVerification 
};