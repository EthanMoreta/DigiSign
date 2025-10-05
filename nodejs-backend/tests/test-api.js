const fs = require('fs');

// Test the Gemini-only API endpoint
async function testAPI() {
  console.log('🧪 TESTING GEMINI AI API ENDPOINT');
  console.log('==================================\n');
  
  try {
    // Read the enroll_sig.png and convert to base64
    const imageBuffer = fs.readFileSync('./enroll_sig.png');
    const imageBase64 = imageBuffer.toString('base64');
    
    console.log('📁 Testing with enroll_sig.png');
    console.log(`   Image size: ${imageBuffer.length} bytes`);
    console.log('   Sending to API...\n');
    
    // Make API call
    const response = await fetch('http://localhost:3001/verify-signature', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageBase64
      })
    });
    
    const result = await response.json();
    
    console.log('📊 API RESPONSE:');
    console.log('================');
    console.log(`Status: ${response.status}`);
    console.log(`Verified: ${result.verified ? '✅ YES' : '❌ NO'}`);
    console.log(`Similarity: ${(result.similarity * 100).toFixed(1)}%`);
    console.log(`Threshold: ${(result.threshold * 100).toFixed(1)}%`);
    console.log(`Method: ${result.details?.method || 'Unknown'}`);
    console.log(`Confidence: ${(result.details?.confidence * 100).toFixed(1)}%`);
    
    if (result.error) {
      console.log(`Error: ${result.error}`);
    }
    
  } catch (error) {
    console.error('❌ API Test failed:', error.message);
  }
}

// Run the test
testAPI();
