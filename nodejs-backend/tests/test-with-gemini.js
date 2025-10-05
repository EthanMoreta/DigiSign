const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

// Load environment variables from .env file
require('dotenv').config();

// Test script that includes Gemini AI analysis
async function testWithGemini() {
  console.log('🤖 TESTING WITH GEMINI AI INTEGRATION');
  console.log('=====================================\n');
  
  // Check if API key is set
  if (!process.env.GEMINI_API_KEY) {
    console.log('❌ GEMINI_API_KEY not found!');
    console.log('Please set your API key:');
    console.log('export GEMINI_API_KEY="your-api-key-here"');
    console.log('\nOr run: GEMINI_API_KEY="your-key" node test-with-gemini.js');
    return;
  }
  
  try {
    const ai = new GoogleGenAI(process.env.GEMINI_API_KEY);
    
    // Read both images
    const baseImageBuffer = fs.readFileSync('./base.png');
    const enrollImageBuffer = fs.readFileSync('./enroll_sig.png');
    
    console.log('📁 Images loaded:');
    console.log(`   - base.png: ${baseImageBuffer.length} bytes`);
    console.log(`   - enroll_sig.png: ${enrollImageBuffer.length} bytes`);
    
    // Convert to base64 for Gemini
    const baseImageBase64 = baseImageBuffer.toString('base64');
    const enrollImageBase64 = enrollImageBuffer.toString('base64');
    
    // Create Gemini parts
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
    
    // Gemini prompt for signature analysis
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
    
    console.log('\n🔍 Sending to Gemini AI...');
    
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [basePart, enrollPart, prompt]
    });
    
    const scoreText = response.text.trim();
    const score = parseInt(scoreText);
    
    if (isNaN(score)) {
      console.log('❌ Gemini returned invalid response:', scoreText);
      return;
    }
    
    console.log(`\n🎯 GEMINI AI ANALYSIS:`);
    console.log('=====================');
    console.log(`AI Similarity Score: ${score}/100`);
    console.log(`Confidence Level: ${score >= 80 ? 'HIGH' : score >= 60 ? 'MEDIUM' : 'LOW'}`);
    
    // Determine match result
    const threshold = 70;
    const isMatch = score >= threshold;
    
    console.log(`\n📊 FINAL RESULT:`);
    console.log('================');
    console.log(`Threshold: ${threshold}/100`);
    console.log(`Result: ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
    
    if (isMatch) {
      console.log('\n🎉 Gemini AI confirms: These signatures are a match!');
    } else {
      console.log('\n⚠️  Gemini AI indicates: These signatures do not match.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('API_KEY')) {
      console.log('\n💡 Make sure your GEMINI_API_KEY is valid and has the right permissions.');
    }
  }
}

// Run the test
testWithGemini();
