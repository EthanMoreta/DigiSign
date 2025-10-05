const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

// Load environment variables from .env file
require('dotenv').config();

// Gemini AI-only signature verification test
async function testCompleteVerification() {
  console.log('🤖 GEMINI AI SIGNATURE VERIFICATION TEST');
  console.log('========================================\n');
  
  try {
    // Read the base image and convert to base64
    const baseImageBuffer = fs.readFileSync('./base.png');
    const baseImageBase64 = baseImageBuffer.toString('base64');
    
    console.log('📁 Testing with:');
    console.log('   - Baseline: base.png');
    console.log('   - Live: enroll_sig.png');
    console.log('');
    
    // Step 1: Gemini AI Analysis
    console.log('🤖 GEMINI AI SIGNATURE VERIFICATION');
    console.log('====================================');
    
    let geminiScore = 0.0;
    let geminiAvailable = false;
    
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI(process.env.GEMINI_API_KEY);
        
        const baseImageBase64 = baseImageBuffer.toString('base64');
        const enrollImageBuffer = fs.readFileSync('./enroll_sig.png');
        const enrollImageBase64 = enrollImageBuffer.toString('base64');
        
        const basePart = {
          inlineData: {
            data: baseImageBase64,
            mimeType: "image/png"
          }
        };
        
        const enrollPart = {
          inlineData: {
            data: enrollImageBase64,
            mimeType: "image/png"
          }
        };
        
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
        
        console.log('🔍 Analyzing signatures with Gemini AI...');
        
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash-exp",
          contents: [basePart, enrollPart, prompt]
        });
        
        const scoreText = response.text.trim();
        const score = parseInt(scoreText);
        
        if (!isNaN(score)) {
          geminiScore = score / 100; // Convert to 0-1 scale
          geminiAvailable = true;
          console.log(`✅ AI Similarity Score: ${score}/100`);
        } else {
          console.log('❌ Invalid response from Gemini:', scoreText);
          throw new Error('Invalid Gemini response');
        }
        
      } catch (error) {
        console.log(`❌ Gemini error: ${error.message}`);
        throw new Error('Gemini AI analysis failed');
      }
    } else {
      console.log('❌ GEMINI_API_KEY not set!');
      console.log('Set API key with: export GEMINI_API_KEY="your-key"');
      throw new Error('Gemini API key not configured');
    }
    
    // Step 2: Results
    console.log('\n📊 VERIFICATION RESULTS');
    console.log('========================');
    
    const finalScore = geminiScore;
    console.log(`Gemini AI Score: ${(geminiScore * 100).toFixed(1)}%`);
    console.log(`Final Score: ${(finalScore * 100).toFixed(1)}%`);
    
    // Step 4: Results
    console.log('\n🎯 FINAL RESULTS');
    console.log('================');
    
    const threshold = 0.6; // 60% threshold for balanced security
    const isMatch = finalScore >= threshold;
    
    console.log(`Threshold: ${(threshold * 100).toFixed(0)}%`);
    console.log(`Result: ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
    
    if (isMatch) {
      console.log('\n🎉 VERIFICATION SUCCESSFUL!');
      console.log('The signatures are considered a match.');
    } else {
      console.log('\n⚠️  VERIFICATION FAILED');
      console.log('The signatures do not meet the similarity threshold.');
    }
    
    // Additional insights
    console.log('\n💡 INSIGHTS');
    console.log('============');
    if (geminiScore > 0.8) {
      console.log('• Gemini AI confirms high visual similarity');
    } else if (geminiScore > 0.6) {
      console.log('• Gemini AI indicates moderate similarity');
    } else {
      console.log('• Gemini AI indicates low similarity - likely different signatures');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the complete test
testCompleteVerification();
