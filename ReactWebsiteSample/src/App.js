import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Check, RotateCcw } from 'lucide-react';

export default function App() {
  const [cartTotal] = useState(49.99);
  const [showModal, setShowModal] = useState(false);
  const [showGestureAuth, setShowGestureAuth] = useState(false);
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [nodeBackendUrl] = useState('http://localhost:3001');
  const [currentColor] = useState('#0000FF');
  const [brushSize] = useState(5);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [checkingEnrollment, setCheckingEnrollment] = useState(false);
  const [cardholderName, setCardholderName] = useState('');
  const [mediapipeLoaded, setMediapipeLoaded] = useState(false);
  const [mediapipeError, setMediapipeError] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  const prevPos = useRef({ x: null, y: null });
  const animationFrame = useRef(null);
  const handsRef = useRef(null);

  // Inject CSS styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .container {
        font-family: sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background: #f2f2f2;
        padding: 1rem;
      }
      
      .card {
        background: #fff;
        padding: 2rem;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        max-width: 350px;
        width: 100%;
      }
      
      .item, .total {
        display: flex;
        justify-content: space-between;
        margin-bottom: 1rem;
      }
      
      .total {
        font-weight: bold;
      }
      
      .input {
        width: 100%;
        padding: 0.5rem;
        margin: 0.5rem 0;
        border: 1px solid #ccc;
        border-radius: 6px;
        font-size: 0.9rem;
      }
      
      .row {
        display: flex;
        gap: 10px;
      }
      
      .half {
        flex: 1;
      }
      
      .pay-btn {
        margin-top: 1rem;
        width: 100%;
        padding: 0.75rem;
        background: #007bff;
        color: #fff;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 1rem;
      }
      
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
      }
      
      .modal {
        background: #fff;
        padding: 2rem;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        max-width: 300px;
        width: 90%;
        text-align: center;
        position: relative;
      }
      
      .close {
        position: absolute;
        top: 10px;
        right: 10px;
        background: transparent;
        border: none;
        font-size: 1.2rem;
        color: #888;
        cursor: pointer;
      }

      .checking {
        font-size: 0.85rem;
        color: #666;
        font-style: italic;
        margin: 0.5rem 0;
      }
      
      .approve {
        flex: 1;
        padding: 0.5rem;
        background: green;
        color: #fff;
        border: none;
        border-radius: 6px;
        cursor: pointer;
      }

      .approve:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      
      .cancel {
        flex: 1;
        padding: 0.5rem;
        background: red;
        color: #fff;
        border: none;
        border-radius: 6px;
        cursor: pointer;
      }
      
      .gesture-modal {
        background: #fff;
        border-radius: 10px;
        max-width: 700px;
        width: 90%;
        padding: 2rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        position: relative;
      }
      
      .gesture-close {
        position: absolute;
        top: 10px;
        right: 10px;
        background: transparent;
        border: none;
        font-size: 1.2rem;
        color: #888;
        cursor: pointer;
      }
      
      .warning {
        background: #fff3cd;
        color: #856404;
        padding: 0.75rem;
        border-radius: 6px;
        margin-bottom: 1rem;
        font-size: 0.85rem;
        border: 1px solid #ffeaa7;
      }

      .enrollment-info {
        background: #e7f3ff;
        color: #004085;
        padding: 0.75rem;
        border-radius: 6px;
        margin-bottom: 1rem;
        font-size: 0.85rem;
        border: 1px solid #b8daff;
        line-height: 1.5;
      }
      
      .gesture-content {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-bottom: 1rem;
      }
      
      .label {
        font-size: 0.9rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
        color: #333;
      }
      
      .canvas-wrapper {
        position: relative;
        background: #000;
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid #ccc;
        aspect-ratio: 4/3;
      }
      
      .canvas {
        width: 100%;
        height: 100%;
        display: block;
      }
      
      .white-bg {
        background-color: #fff;
      }
      
      .instructions {
        background: #f8f9fa;
        border-radius: 6px;
        padding: 0.75rem;
        margin-bottom: 1rem;
        color: #666;
        display: flex;
        gap: 1.5rem;
        justify-content: center;
        font-size: 0.85rem;
        border: 1px solid #e9ecef;
      }
      
      .gesture-buttons {
        display: flex;
        gap: 0.75rem;
        justify-content: center;
      }
      
      .gesture-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 6px;
        color: #fff;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      
      .gesture-btn.gray {
        background: #6c757d;
      }
      
      .gesture-btn.blue {
        background: #007bff;
      }

      .gesture-btn.green {
        background: #28a745;
      }

      .gesture-btn:hover {
        opacity: 0.9;
      }
      
      .subtext {
        font-size: 0.9rem;
        color: #666;
        margin-bottom: 1rem;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Load MediaPipe Hands
  useEffect(() => {
    const loadMediaPipe = async () => {
      try {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
        script.async = true;
        
        script.onload = async () => {
          try {
            const hands = new window.Hands({
              locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
              }
            });

            hands.setOptions({
              maxNumHands: 1,
              modelComplexity: 1,
              minDetectionConfidence: 0.7,
              minTrackingConfidence: 0.7
            });

            hands.onResults(onHandsResults);
            handsRef.current = hands;
            setMediapipeLoaded(true);
          } catch (err) {
            setMediapipeError('Failed to initialize MediaPipe: ' + err.message);
          }
        };

        script.onerror = () => {
          setMediapipeError('Failed to load MediaPipe library');
        };

        document.body.appendChild(script);

        return () => {
          if (document.body.contains(script)) {
            document.body.removeChild(script);
          }
        };
      } catch (err) {
        setMediapipeError('Error loading MediaPipe: ' + err.message);
      }
    };

    loadMediaPipe();
  }, []);

  const onHandsResults = (results) => {
    const canvas = canvasRef.current;
    const drawCanvas = drawingCanvasRef.current;
    if (!canvas || !drawCanvas) return;

    const ctx = canvas.getContext('2d');
    const drawCtx = drawCanvas.getContext('2d');

    // Clear and draw video frame (mirrored)
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(-1, 1);
    ctx.drawImage(results.image, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];

      // Get key finger positions
      const indexTip = landmarks[8];
      const indexKnuckle = landmarks[6];
      
      // Convert to canvas coordinates (mirrored)
      const x = canvas.width - (indexTip.x * canvas.width);
      const y = indexTip.y * canvas.height;

      // Check if index finger is up (drawing condition)
      const drawingActive = indexTip.y < indexKnuckle.y;

      if (drawingActive) {
        if (prevPos.current.x !== null) {
          drawCtx.strokeStyle = currentColor;
          drawCtx.lineWidth = brushSize;
          drawCtx.lineCap = 'round';
          drawCtx.lineJoin = 'round';
          drawCtx.beginPath();
          drawCtx.moveTo(prevPos.current.x, prevPos.current.y);
          drawCtx.lineTo(x, y);
          drawCtx.stroke();
        }
        prevPos.current = { x, y };
      } else {
        prevPos.current = { x: null, y: null };
      }
    } else {
      prevPos.current = { x: null, y: null };
    }
  };

  const drawHandVisualization = (ctx, landmarks, width, height) => {
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [0, 9], [9, 10], [10, 11], [11, 12],
      [0, 13], [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20],
      [5, 9], [9, 13], [13, 17]
    ];

    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    connections.forEach(([start, end]) => {
      const s = landmarks[start];
      const e = landmarks[end];
      ctx.beginPath();
      ctx.moveTo(width - (s.x * width), s.y * height);
      ctx.lineTo(width - (e.x * width), e.y * height);
      ctx.stroke();
    });
  };

  useEffect(() => {
    let stream = null;

    const initializeCamera = async () => {
      if (!isRunning || !mediapipeLoaded) return;
      
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          processFrame();
        }
      } catch (err) {
        alert('Could not access camera. Please grant camera permissions.');
      }
    };

    const processFrame = async () => {
      if (!videoRef.current || !canvasRef.current || !isRunning || !handsRef.current) {
        if (isRunning) {
          animationFrame.current = requestAnimationFrame(processFrame);
        }
        return;
      }

      try {
        await handsRef.current.send({ image: videoRef.current });
      } catch (err) {
        console.error('Error processing frame:', err);
      }

      animationFrame.current = requestAnimationFrame(processFrame);
    };

    if (isRunning && mediapipeLoaded) {
      initializeCamera();
    }

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isRunning, mediapipeLoaded]);

  const checkEnrollmentStatus = async () => {
    if (!cardholderName.trim()) {
      alert('Please enter cardholder name');
      return false;
    }
    
    setCheckingEnrollment(true);
    try {
      const response = await fetch(`${nodeBackendUrl}/check-enrollment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cardholderName.trim() }),
      });
      const data = await response.json();
      setIsEnrolled(data.enrolled);
      return data.enrolled;
    } catch {
      setIsEnrolled(false);
      return false;
    } finally {
      setCheckingEnrollment(false);
    }
  };

  const handlePay = () => setShowModal(true);
  
  const handleDigiSign = async () => {
    setShowModal(false);
    const enrolled = await checkEnrollmentStatus();
    
    if (enrolled) {
      setShowGestureAuth(true);
      setTimeout(() => setIsRunning(true), 100);
    } else {
      setShowEnrollment(true);
      setTimeout(() => setIsRunning(true), 100);
    }
  };

  const handleOTP = () => { 
    setShowModal(false); 
    alert('OTP verification selected'); 
  };
  
  const stopCamera = () => {
    setIsRunning(false);
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
    prevPos.current = { x: null, y: null };
  };
  
  const clearCanvas = () => {
    const ctx = drawingCanvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
    }
    prevPos.current = { x: null, y: null };
  };
  
  const enrollSignature = async () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    const imageData = canvas.toDataURL('image/png');
    
    try {
      const response = await fetch(`${nodeBackendUrl}/enroll-signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: cardholderName.trim(),
          image: imageData 
        }),
      });
      
      const data = await response.json();

      if (data.enrolled) {
        stopCamera();
        setShowEnrollment(false);
        setIsEnrolled(true);
        alert('Pattern enrolled successfully! ✅\n\nYou can now use DigiSign for authentication.');
      } else {
        alert('Failed to enroll pattern. Please try again.');
      }
    } catch (err) {
      console.error('Error enrolling signature:', err);
      alert(`Error enrolling pattern: ${err.message}\n\nPlease ensure Node.js backend is running on port 3001.`);
    }
  };

  const saveAndSubmit = async () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    
    const imageData = canvas.toDataURL('image/png');
    
    try {
      const response = await fetch(`${nodeBackendUrl}/verify-signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: cardholderName.trim(),
          image: imageData 
        }),
      });
      const data = await response.json();

      stopCamera();
      setShowGestureAuth(false);

      if (data.verified) {
        alert(`Signature verified! ✅\nSimilarity score: ${(data.score * 100).toFixed(1)}%\n\nTransaction approved!`);
      } else {
        alert(`Signature verification failed ❌\nSimilarity score: ${(data.score * 100).toFixed(1)}%\n\nPlease try again.`);
      }
    } catch (err) {
      console.error('Error verifying signature:', err);
      stopCamera();
      setShowGestureAuth(false);
      alert('Error verifying signature. Please ensure Node.js backend is running.');
    }
  };
  
  const cancelGestureAuth = () => { 
    stopCamera(); 
    setShowGestureAuth(false); 
  };
  
  const cancelEnrollment = () => { 
    stopCamera(); 
    setShowEnrollment(false); 
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Your Cart</h2>
        <div className="item">
          <span>Example Product</span>
          <span>${cartTotal.toFixed(2)}</span>
        </div>
        <hr />
        <div className="total">
          <span>Total</span>
          <span>${cartTotal.toFixed(2)}</span>
        </div>
        <h3>Payment Details</h3>
        <input 
          type="text" 
          placeholder="Cardholder Name" 
          className="input" 
          value={cardholderName} 
          onChange={(e) => setCardholderName(e.target.value)} 
        />
        <input type="text" placeholder="Card Number" className="input" />
        <div className="row">
          <input type="text" placeholder="MM/YY" className="input half" />
          <input type="text" placeholder="CVV" className="input half" />
        </div>
        <button 
          onClick={handlePay} 
          className="pay-btn" 
          disabled={!cardholderName.trim()}
          style={{ 
            opacity: cardholderName.trim() ? 1 : 0.6, 
            cursor: cardholderName.trim() ? 'pointer' : 'not-allowed' 
          }}
        >
          Pay ${cartTotal.toFixed(2)}
        </button>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <button onClick={() => setShowModal(false)} className="close">✖</button>
            <h3>MFA Verification</h3>
            <p>Please approve this transaction using PayShield MFA.</p>
            {checkingEnrollment && <p className="checking">Checking DigiSign status...</p>}
            <div className="row">
              <button onClick={handleDigiSign} className="approve" disabled={checkingEnrollment}>
                DigiSign
              </button>
              <button onClick={handleOTP} className="cancel">OTP</button>
            </div>
          </div>
        </div>
      )}

      {showEnrollment && (
        <div className="modal-overlay">
          <div className="gesture-modal">
            <button onClick={cancelEnrollment} className="gesture-close">✖</button>
            <h3>DigiSign Enrollment</h3>
            <p className="subtext">Create your signature pattern for future authentications</p>
            <div className="enrollment-info">
              ℹ️ This is your first time using DigiSign. Draw a unique pattern that you'll remember and use for all future MFA verifications.
            </div>
            {mediapipeError && (
              <div className="warning">⚠️ {mediapipeError}</div>
            )}
            {!mediapipeLoaded && !mediapipeError && (
              <div className="warning">⏳ Loading MediaPipe hand tracking...</div>
            )}
            <div className="gesture-content">
              <div>
                <div className="label">Camera Feed</div>
                <div className="canvas-wrapper">
                  <video ref={videoRef} style={{ display: 'none' }} width="320" height="240" />
                  <canvas ref={canvasRef} width="320" height="240" className="canvas" />
                </div>
              </div>
              <div>
                <div className="label">Your Pattern</div>
                <div className="canvas-wrapper">
                  <canvas ref={drawingCanvasRef} width="320" height="240" className="canvas white-bg" />
                </div>
              </div>
            </div>
            <div className="instructions">
              <span>☝️ Point finger up to draw</span>
              <span>✋ Lower finger to stop</span>
            </div>
            <div className="gesture-buttons">
              <button onClick={clearCanvas} className="gesture-btn gray">
                <RotateCcw size={16}/>Clear
              </button>
              <button onClick={enrollSignature} className="gesture-btn green">
                <Check size={16}/>Enroll Pattern
              </button>
            </div>
          </div>
        </div>
      )}

      {showGestureAuth && (
        <div className="modal-overlay">
          <div className="gesture-modal">
            <button onClick={cancelGestureAuth} className="gesture-close">✖</button>
            <h3>DigiSign Authentication</h3>
            <p className="subtext">Draw your signature pattern to verify</p>
            {mediapipeError && (
              <div className="warning">⚠️ {mediapipeError}</div>
            )}
            {!mediapipeLoaded && !mediapipeError && (
              <div className="warning">⏳ Loading MediaPipe hand tracking...</div>
            )}
            <div className="gesture-content">
              <div>
                <div className="label">Camera Feed</div>
                <div className="canvas-wrapper">
                  <video ref={videoRef} style={{ display: 'none' }} width="320" height="240" />
                  <canvas ref={canvasRef} width="320" height="240" className="canvas" />
                </div>
              </div>
              <div>
                <div className="label">Your Pattern</div>
                <div className="canvas-wrapper">
                  <canvas ref={drawingCanvasRef} width="320" height="240" className="canvas white-bg" />
                </div>
              </div>
            </div>
            <div className="instructions">
              <span>☝️ Point finger up to draw</span>
              <span>✋ Lower finger to stop</span>
            </div>
            <div className="gesture-buttons">
              <button onClick={clearCanvas} className="gesture-btn gray">
                <RotateCcw size={16}/>Clear
              </button>
              <button onClick={saveAndSubmit} className="gesture-btn blue">
                <Check size={16}/>Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}