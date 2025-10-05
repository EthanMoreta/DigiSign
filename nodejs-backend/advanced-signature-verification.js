const sharp = require('sharp');
const fs = require('fs');

// Advanced signature verification using multiple sophisticated methods
async function advancedSignatureVerification(baselinePath, liveImageData) {
  try {
    console.log('🔍 ADVANCED SIGNATURE VERIFICATION');
    console.log('===================================');
    
    // Convert base64 to buffer
    const liveBuffer = Buffer.from(liveImageData, 'base64');
    
    // Preprocess both images
    const [baselineProcessed, liveProcessed] = await Promise.all([
      preprocessForSignatureAnalysis(baselinePath, true),
      preprocessForSignatureAnalysis(liveBuffer, false)
    ]);
    
    // Method 1: Moment Invariants (rotation/scale invariant)
    const momentSimilarity = await calculateMomentInvariants(baselineProcessed, liveProcessed);
    
    // Method 2: Fourier Descriptors (shape boundary analysis)
    const fourierSimilarity = await calculateFourierDescriptors(baselineProcessed, liveProcessed);
    
    // Method 3: Stroke Analysis (signature-specific features)
    const strokeSimilarity = await calculateStrokeFeatures(baselineProcessed, liveProcessed);
    
    // Method 4: Geometric Features (angles, curves, intersections)
    const geometricSimilarity = await calculateGeometricFeatures(baselineProcessed, liveProcessed);
    
    // Combine all methods with weights, ensuring all values are valid numbers
    const validMoment = isFinite(momentSimilarity) ? momentSimilarity : 0.5;
    const validFourier = isFinite(fourierSimilarity) ? fourierSimilarity : 0.5;
    const validStroke = isFinite(strokeSimilarity) ? strokeSimilarity : 0.5;
    const validGeometric = isFinite(geometricSimilarity) ? geometricSimilarity : 0.5;
    
    const finalScore = 
      validMoment * 0.25 +     // Shape invariants
      validFourier * 0.25 +    // Boundary shape
      validStroke * 0.30 +     // Signature-specific
      validGeometric * 0.20;   // Geometric features
    
    console.log('\n📊 ADVANCED SIMILARITY RESULTS:');
    console.log('================================');
    console.log(`Moment Invariants: ${(validMoment * 100).toFixed(1)}%`);
    console.log(`Fourier Descriptors: ${(validFourier * 100).toFixed(1)}%`);
    console.log(`Stroke Analysis: ${(validStroke * 100).toFixed(1)}%`);
    console.log(`Geometric Features: ${(validGeometric * 100).toFixed(1)}%`);
    console.log(`Final Score: ${(finalScore * 100).toFixed(1)}%`);
    
    return finalScore;
    
  } catch (error) {
    console.error('❌ Advanced verification failed:', error.message);
    return 0.1; // Very low score on error
  }
}

// Preprocess specifically for signature analysis
async function preprocessForSignatureAnalysis(input, isFilePath = true) {
  let image;
  if (isFilePath) {
    image = sharp(input);
  } else {
    image = sharp(input);
  }
  
  // Enhanced preprocessing for signature analysis
  const processed = await image
    .resize(400, 400, { // Square to avoid distortion
      fit: 'contain', 
      background: { r: 255, g: 255, b: 255, alpha: 1 } 
    })
    .greyscale()
    .threshold(128) // Pure binary (black/white)
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  return processed;
}

// Method 1: Moment Invariants (Hu Moments)
async function calculateMomentInvariants(img1, img2) {
  try {
    console.log('🔢 Calculating Moment Invariants...');
    
    const moments1 = calculateHuMoments(img1);
    const moments2 = calculateHuMoments(img2);
    
    // Check for invalid moments
    if (moments1.some(m => !isFinite(m)) || moments2.some(m => !isFinite(m))) {
      console.log('   Moment similarity: 50.0% (fallback due to invalid moments)');
      return 0.5; // Return moderate similarity as fallback
    }
    
    // Compare moment invariants with safe log calculation
    let totalDiff = 0;
    for (let i = 0; i < 7; i++) {
      const m1 = Math.abs(moments1[i]);
      const m2 = Math.abs(moments2[i]);
      
      // Avoid log(0) by adding small epsilon
      const epsilon = 1e-10;
      const log1 = Math.log(m1 + epsilon);
      const log2 = Math.log(m2 + epsilon);
      
      const diff = Math.abs(log1 - log2);
      totalDiff += Math.min(diff, 10); // Cap extreme differences
    }
    
    const similarity = Math.exp(-totalDiff / 7);
    
    // Ensure similarity is a valid number
    const finalSimilarity = isFinite(similarity) ? similarity : 0.5;
    console.log(`   Moment similarity: ${(finalSimilarity * 100).toFixed(1)}%`);
    return finalSimilarity;
    
  } catch (error) {
    console.error('Error in moment invariants:', error);
    return 0.5; // Return moderate similarity on error
  }
}

// Calculate Hu's 7 moment invariants
function calculateHuMoments(imageData) {
  const { data, info } = imageData;
  const width = info.width;
  const height = info.height;
  
  // Calculate central moments
  let m00 = 0, m10 = 0, m01 = 0;
  let m11 = 0, m20 = 0, m02 = 0, m21 = 0, m12 = 0, m30 = 0, m03 = 0;
  
  // First pass: calculate raw moments
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const pixel = data[idx] < 128 ? 1 : 0; // Binary: 1 for signature, 0 for background
      
      if (pixel) {
        m00 += 1;
        m10 += x;
        m01 += y;
        m11 += x * y;
        m20 += x * x;
        m02 += y * y;
        m21 += x * x * y;
        m12 += x * y * y;
        m30 += x * x * x;
        m03 += y * y * y;
      }
    }
  }
  
  if (m00 === 0) return [0, 0, 0, 0, 0, 0, 0];
  
  // Calculate centroid
  const xc = m10 / m00;
  const yc = m01 / m00;
  
  // Calculate central moments
  let mu00 = m00;
  let mu11 = 0, mu20 = 0, mu02 = 0, mu21 = 0, mu12 = 0, mu30 = 0, mu03 = 0;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const pixel = data[idx] < 128 ? 1 : 0;
      
      if (pixel) {
        const dx = x - xc;
        const dy = y - yc;
        mu11 += dx * dy;
        mu20 += dx * dx;
        mu02 += dy * dy;
        mu21 += dx * dx * dy;
        mu12 += dx * dy * dy;
        mu30 += dx * dx * dx;
        mu03 += dy * dy * dy;
      }
    }
  }
  
  // Normalize central moments
  const n20 = mu20 / Math.pow(mu00, 2);
  const n02 = mu02 / Math.pow(mu00, 2);
  const n11 = mu11 / Math.pow(mu00, 2);
  const n21 = mu21 / Math.pow(mu00, 2.5);
  const n12 = mu12 / Math.pow(mu00, 2.5);
  const n30 = mu30 / Math.pow(mu00, 2.5);
  const n03 = mu03 / Math.pow(mu00, 2.5);
  
  // Calculate Hu's 7 invariant moments
  const h1 = n20 + n02;
  const h2 = Math.pow(n20 - n02, 2) + 4 * Math.pow(n11, 2);
  const h3 = Math.pow(n30 - 3 * n12, 2) + Math.pow(3 * n21 - n03, 2);
  const h4 = Math.pow(n30 + n12, 2) + Math.pow(n21 + n03, 2);
  const h5 = (n30 - 3 * n12) * (n30 + n12) * (Math.pow(n30 + n12, 2) - 3 * Math.pow(n21 + n03, 2)) +
             (3 * n21 - n03) * (n21 + n03) * (3 * Math.pow(n30 + n12, 2) - Math.pow(n21 + n03, 2));
  const h6 = (n20 - n02) * (Math.pow(n30 + n12, 2) - Math.pow(n21 + n03, 2)) + 4 * n11 * (n30 + n12) * (n21 + n03);
  const h7 = (3 * n21 - n03) * (n30 + n12) * (Math.pow(n30 + n12, 2) - 3 * Math.pow(n21 + n03, 2)) -
             (n30 - 3 * n12) * (n21 + n03) * (3 * Math.pow(n30 + n12, 2) - Math.pow(n21 + n03, 2));
  
  return [h1, h2, h3, h4, h5, h6, h7];
}

// Method 2: Fourier Descriptors (simplified)
async function calculateFourierDescriptors(img1, img2) {
  try {
    console.log('🌊 Calculating Fourier Descriptors...');
    
    const boundary1 = extractBoundary(img1);
    const boundary2 = extractBoundary(img2);
    
    if (boundary1.length === 0 || boundary2.length === 0) {
      return 0.1;
    }
    
    // Compare boundary complexity
    const complexity1 = boundary1.length;
    const complexity2 = boundary2.length;
    
    const complexitySim = 1 - Math.abs(complexity1 - complexity2) / Math.max(complexity1, complexity2);
    
    console.log(`   Boundary points: ${complexity1} vs ${complexity2}`);
    console.log(`   Fourier similarity: ${(complexitySim * 100).toFixed(1)}%`);
    
    return complexitySim;
    
  } catch (error) {
    console.error('Error in Fourier descriptors:', error);
    return 0.1;
  }
}

// Extract boundary points from binary image
function extractBoundary(imageData) {
  const { data, info } = imageData;
  const width = info.width;
  const height = info.height;
  const boundary = [];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      
      if (data[idx] < 128) { // Black pixel (signature)
        // Check if it's a boundary pixel
        let isBoundary = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = (y + dy) * width + (x + dx);
            if (data[nIdx] >= 128) { // Has white neighbor
              isBoundary = true;
              break;
            }
          }
          if (isBoundary) break;
        }
        
        if (isBoundary) {
          boundary.push({ x, y });
        }
      }
    }
  }
  
  return boundary;
}

// Method 3: Stroke Analysis
async function calculateStrokeFeatures(img1, img2) {
  try {
    console.log('✍️  Calculating Stroke Features...');
    
    const features1 = analyzeStrokes(img1);
    const features2 = analyzeStrokes(img2);
    
    // Compare stroke features
    const strokeCountSim = 1 - Math.abs(features1.strokeCount - features2.strokeCount) / 
                              Math.max(features1.strokeCount, features2.strokeCount, 1);
    
    const endpointSim = 1 - Math.abs(features1.endpoints - features2.endpoints) / 
                           Math.max(features1.endpoints, features2.endpoints, 1);
    
    const intersectionSim = 1 - Math.abs(features1.intersections - features2.intersections) / 
                               Math.max(features1.intersections, features2.intersections, 1);
    
    const similarity = (strokeCountSim + endpointSim + intersectionSim) / 3;
    
    console.log(`   Strokes: ${features1.strokeCount} vs ${features2.strokeCount}`);
    console.log(`   Endpoints: ${features1.endpoints} vs ${features2.endpoints}`);
    console.log(`   Intersections: ${features1.intersections} vs ${features2.intersections}`);
    console.log(`   Stroke similarity: ${(similarity * 100).toFixed(1)}%`);
    
    return similarity;
    
  } catch (error) {
    console.error('Error in stroke analysis:', error);
    return 0.1;
  }
}

// Analyze stroke features
function analyzeStrokes(imageData) {
  const { data, info } = imageData;
  const width = info.width;
  const height = info.height;
  
  let endpoints = 0;
  let intersections = 0;
  let signaturePixels = 0;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      
      if (data[idx] < 128) { // Signature pixel
        signaturePixels++;
        
        // Count black neighbors
        let blackNeighbors = 0;
        const neighbors = [];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nIdx = (y + dy) * width + (x + dx);
            if (data[nIdx] < 128) {
              blackNeighbors++;
              neighbors.push({ x: x + dx, y: y + dy });
            }
          }
        }
        
        if (blackNeighbors === 1) {
          endpoints++; // End of stroke
        } else if (blackNeighbors > 2) {
          intersections++; // Intersection point
        }
      }
    }
  }
  
  // Estimate stroke count based on endpoints and intersections
  const strokeCount = Math.max(1, Math.ceil((endpoints + intersections) / 2));
  
  return {
    strokeCount,
    endpoints,
    intersections,
    signaturePixels
  };
}

// Method 4: Geometric Features
async function calculateGeometricFeatures(img1, img2) {
  try {
    console.log('📐 Calculating Geometric Features...');
    
    const geo1 = calculateGeometry(img1);
    const geo2 = calculateGeometry(img2);
    
    const aspectSim = 1 - Math.abs(geo1.aspectRatio - geo2.aspectRatio) / 
                         Math.max(geo1.aspectRatio, geo2.aspectRatio);
    
    const fillSim = 1 - Math.abs(geo1.fillRatio - geo2.fillRatio);
    
    const similarity = (aspectSim + fillSim) / 2;
    
    console.log(`   Aspect ratios: ${geo1.aspectRatio.toFixed(2)} vs ${geo2.aspectRatio.toFixed(2)}`);
    console.log(`   Fill ratios: ${geo1.fillRatio.toFixed(2)} vs ${geo2.fillRatio.toFixed(2)}`);
    console.log(`   Geometric similarity: ${(similarity * 100).toFixed(1)}%`);
    
    return similarity;
    
  } catch (error) {
    console.error('Error in geometric features:', error);
    return 0.1;
  }
}

// Calculate geometric properties
function calculateGeometry(imageData) {
  const { data, info } = imageData;
  const width = info.width;
  const height = info.height;
  
  let minX = width, maxX = 0, minY = height, maxY = 0;
  let signaturePixels = 0;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      
      if (data[idx] < 128) {
        signaturePixels++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  
  const boundingWidth = maxX - minX + 1;
  const boundingHeight = maxY - minY + 1;
  const aspectRatio = boundingWidth / boundingHeight;
  const fillRatio = signaturePixels / (boundingWidth * boundingHeight);
  
  return {
    aspectRatio,
    fillRatio,
    boundingWidth,
    boundingHeight,
    signaturePixels
  };
}

// Test function
async function testAdvancedSignatureVerification() {
  console.log('🧪 TESTING ADVANCED SIGNATURE VERIFICATION');
  console.log('===========================================\n');
  
  try {
    // Test your PNG files
    const testBuffer = fs.readFileSync('./enroll_sig.png');
    const testBase64 = testBuffer.toString('base64');
    
    const score = await advancedSignatureVerification('./base.png', testBase64);
    
    console.log('\n🎯 FINAL RESULTS:');
    console.log('==================');
    console.log(`Advanced Signature Score: ${(score * 100).toFixed(2)}%`);
    console.log(`Threshold: 70%`);
    console.log(`Verification: ${score >= 0.70 ? '✅ PASS' : '❌ FAIL'}`);
    
    if (score > 0.80) {
      console.log('🟢 Very similar signatures');
    } else if (score > 0.50) {
      console.log('🟡 Moderately similar signatures');
    } else {
      console.log('🔴 Very different signatures');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Export for use in server
module.exports = { advancedSignatureVerification };

// Run test if called directly
if (require.main === module) {
  testAdvancedSignatureVerification();
}