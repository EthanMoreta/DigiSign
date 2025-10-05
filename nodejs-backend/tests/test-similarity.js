const fs = require('fs');
const { advancedSignatureVerification } = require('../advanced-signature-verification');

async function testSimilarity() {
  console.log('🧪 TESTING SIGNATURE SIMILARITY');
  console.log('================================\n');
  
  try {
    // Read the baseline signature and enroll signature
    const baselineImageBuffer = fs.readFileSync('../baseline_signature.png');
    const enrollImageBuffer = fs.readFileSync('../enroll_sig.png');
    const enrollImageBase64 = enrollImageBuffer.toString('base64');
    
    console.log('📁 Testing with:');
    console.log('   - Baseline: baseline_signature.png');
    console.log('   - Live: enroll_sig.png (converted to base64)');
    console.log('');
    
    // Run the advanced signature verification
    const similarityScore = await advancedSignatureVerification('../baseline_signature.png', enrollImageBase64);
    
    console.log('\n🎯 FINAL RESULT:');
    console.log('================');
    console.log(`Similarity Score: ${(similarityScore * 100).toFixed(1)}%`);
    
    // Determine if it's a match based on threshold
    const threshold = 0.7; // 70% threshold
    const isMatch = similarityScore >= threshold;
    
    console.log(`Threshold: ${(threshold * 100).toFixed(0)}%`);
    console.log(`Result: ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
    
    if (isMatch) {
      console.log('\n🎉 The signatures are considered a match!');
    } else {
      console.log('\n⚠️  The signatures do not match the threshold.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSimilarity();
