const fs = require('fs');

// Enroll baseline signature
async function enrollBaseline() {
  console.log('📝 ENROLLING BASELINE SIGNATURE');
  console.log('================================\n');
  
  try {
    // Read the base.png and convert to base64
    const imageBuffer = fs.readFileSync('./base.png');
    const imageBase64 = imageBuffer.toString('base64');
    
    console.log('📁 Using base.png as baseline signature');
    console.log(`   Image size: ${imageBuffer.length} bytes`);
    console.log('   Sending to API...\n');
    
    // Make API call to enroll
    const response = await fetch('http://localhost:3001/enroll-signature', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageBase64
      })
    });
    
    const result = await response.json();
    
    console.log('📊 ENROLLMENT RESPONSE:');
    console.log('========================');
    console.log(`Status: ${response.status}`);
    console.log(`Success: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`Message: ${result.message}`);
    
    if (result.details) {
      console.log(`Baseline Path: ${result.details.baselinePath}`);
      console.log(`Image Size: ${result.details.imageSize} bytes`);
    }
    
    if (result.error) {
      console.log(`Error: ${result.error}`);
    }
    
  } catch (error) {
    console.error('❌ Enrollment failed:', error.message);
  }
}

// Run the enrollment
enrollBaseline();
