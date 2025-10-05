const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { performProfessionalSignatureVerification } = require('./signature-verification');

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
app.post('/verify-signature', async (req, res) => {
  try {
    const { username, image, trajectory } = req.body;

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

    console.log('🔍 Starting signature verification for:', username);
    console.log('📁 Baseline signature path:', baselinePath);
    console.log('📊 Live image data length:', image.length);
    if (trajectory) {
      console.log('📈 Trajectory data points:', trajectory.length);
    }

    // Use the new signature verification system
    const verificationResult = await performProfessionalSignatureVerification(
      baselinePath, 
      image, 
      { trajectory }
    );

    console.log(`✅ Signature verification completed for "${username}"`);
    console.log(`   - Verified: ${verificationResult.verified}`);
    console.log(`   - Scores:`, verificationResult.scores);

    // Calculate overall similarity percentage
    const overallSimilarity = Math.round(verificationResult.scores.combined * 100);
    const thresholdPercentage = Math.round(verificationResult.thresholds.combined * 100);

    res.json({
      verified: verificationResult.verified,
      scores: verificationResult.scores,
      thresholds: verificationResult.thresholds,
      similarity: {
        percentage: overallSimilarity,
        threshold: thresholdPercentage,
        message: verificationResult.verified 
          ? `✅ Signature verified! (${overallSimilarity}% similar)`
          : `❌ Signature rejected (${overallSimilarity}% similar, need ${thresholdPercentage}%)`,
        breakdown: {
          ssim: Math.round(verificationResult.scores.ssim * 100),
          contour: Math.round(verificationResult.scores.contour * 100),
          trajectory: Math.round(verificationResult.scores.trajectory * 100)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error verifying signature:', error);
    res.status(500).json({
      verified: false,
      error: 'Failed to verify signature: ' + error.message
    });
  }
});


// Verify OTP endpoint - stub implementation (always returns success)
app.post('/verify-otp', (req, res) => {
  res.json({
    success: true,
    message: 'OTP verification endpoint is working',
    timestamp: new Date().toISOString()
  });
});

// Enroll signature endpoint - saves baseline signature image and trajectory
app.post('/enroll-signature', async (req, res) => {
  console.log('📥 Received enrollment request');
  
  try {
    const { username, image, trajectory } = req.body;

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
    if (trajectory) {
      console.log('📈 Trajectory data points:', trajectory.length);
    }

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

    // Save trajectory data if provided
    if (trajectory && trajectory.length > 0) {
      // Save trajectory data to file
      const trajectoryPath = path.join(__dirname, 'signatures', `${sanitizedUsername}_trajectory.json`);
      fs.writeFileSync(trajectoryPath, JSON.stringify(trajectory, null, 2));
      console.log(`📈 Trajectory data saved for user: ${username}`);
    }

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

// Colors endpoint - returns available colors for gesture drawing
app.get('/colors', (req, res) => {
  const colors = [
    { name: 'blue', hex: '#0000FF' },
    { name: 'green', hex: '#00FF00' },
    { name: 'red', hex: '#FF0000' },
    { name: 'yellow', hex: '#FFFF00' },
    { name: 'purple', hex: '#FF00FF' },
    { name: 'orange', hex: '#FFA500' },
    { name: 'cyan', hex: '#00FFFF' },
    { name: 'magenta', hex: '#FF00FF' }
  ];
  
  res.json({ colors });
});

// Update settings endpoint - for MediaPipe detection settings
app.post('/update-settings', (req, res) => {
  try {
    const { min_detection_confidence, min_tracking_confidence } = req.body;
    
    // Store settings in memory (in production, use a database)
    global.mediapipeSettings = {
      min_detection_confidence: min_detection_confidence || 0.7,
      min_tracking_confidence: min_tracking_confidence || 0.7
    };
    
    console.log('⚙️ MediaPipe settings updated:', global.mediapipeSettings);
    
    res.json({
      success: true,
      settings: global.mediapipeSettings
    });
  } catch (error) {
    console.error('❌ Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings'
    });
  }
});

// Process frame endpoint - handles MediaPipe hand detection
app.post('/process-frame', (req, res) => {
  try {
    const { frame } = req.body;
    
    if (!frame) {
      return res.status(400).json({
        success: false,
        error: 'No frame data provided'
      });
    }
    
    // For now, return mock data since we don't have MediaPipe in Node.js
    // In a real implementation, you'd process the frame with MediaPipe
    const mockResponse = {
      success: true,
      hand_detected: Math.random() > 0.3, // Randomly detect hands 70% of the time
      landmarks: [
        { x: 0.5, y: 0.5, z: 0 },
        { x: 0.6, y: 0.4, z: 0 },
        { x: 0.7, y: 0.3, z: 0 },
        { x: 0.8, y: 0.2, z: 0 },
        { x: 0.9, y: 0.1, z: 0 }
      ],
      index_finger_pos: { x: 0.7, y: 0.3 },
      drawing_active: Math.random() > 0.5,
      gesture: Math.random() > 0.8 ? 'color_change' : null
    };
    
    res.json(mockResponse);
    
  } catch (error) {
    console.error('❌ Error processing frame:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process frame'
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