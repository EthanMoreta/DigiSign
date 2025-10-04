import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Check, RotateCcw } from 'lucide-react';
import './App.css'; 

export default function App() {
  const [cartTotal] = useState(49.99);
  const [showModal, setShowModal] = useState(false);
  const [showGestureAuth, setShowGestureAuth] = useState(false);
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [pythonBackendUrl] = useState('http://localhost:5000');
  const [nodeBackendUrl] = useState('http://localhost:3001');
  const [currentColor] = useState('#0000FF');
  const [brushSize] = useState(5);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [checkingEnrollment, setCheckingEnrollment] = useState(false);
  const [cardholderName, setCardholderName] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  const prevPos = useRef({ x: null, y: null });
  const animationFrame = useRef(null);
  const processingFrame = useRef(false);

  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        const response = await fetch(`${pythonBackendUrl}/health`);
        const data = await response.json();
        setBackendConnected(data.status === 'healthy');
      } catch {
        setBackendConnected(false);
      }
    };
    if (showGestureAuth || showEnrollment) checkBackendConnection();
  }, [pythonBackendUrl, showGestureAuth, showEnrollment]);

  useEffect(() => {
    let stream = null;

    const initializeCamera = async () => {
      if (!isRunning) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          processFrame();
        }
      } catch {
        alert('Could not access camera. Please grant camera permissions.');
      }
    };

    const processFrame = async () => {
      if (!videoRef.current || !canvasRef.current || !isRunning || !backendConnected) {
        if (isRunning) animationFrame.current = requestAnimationFrame(processFrame);
        return;
      }
      if (processingFrame.current) {
        animationFrame.current = requestAnimationFrame(processFrame);
        return;
      }

      processingFrame.current = true;
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const drawCtx = drawingCanvasRef.current.getContext('2d');

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = video.videoWidth;
        tempCanvas.height = video.videoHeight;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(video, 0, 0);
        const frameData = tempCanvas.toDataURL('image/jpeg', 0.8);

        const response = await fetch(`${pythonBackendUrl}/process-frame`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frame: frameData }),
        });
        const data = await response.json();

        if (data.success && data.hand_detected) {
          const landmarks = data.landmarks;
          drawHandVisualization(ctx, landmarks, canvas.width, canvas.height);
          const indexPos = data.index_finger_pos;
          const x = canvas.width - (indexPos.x * canvas.width / video.videoWidth);
          const y = indexPos.y * canvas.height / video.videoHeight;

          if (data.drawing_active) {
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
      } catch (err) {
        console.error('Error processing frame:', err);
      }
      processingFrame.current = false;
      animationFrame.current = requestAnimationFrame(processFrame);
    };

    if (isRunning && backendConnected) initializeCamera();
    return () => {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [isRunning, backendConnected, pythonBackendUrl, currentColor, brushSize]);

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
      const s = landmarks[start], e = landmarks[end];
      ctx.beginPath();
      ctx.moveTo(width - (s.x * width), s.y * height);
      ctx.lineTo(width - (e.x * width), e.y * height);
      ctx.stroke();
    });
    landmarks.forEach(pt => {
      ctx.beginPath();
      ctx.arc(width - (pt.x * width), pt.y * height, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#FF0000';
      ctx.fill();
    });
  };

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
      setTimeout(() => backendConnected && setIsRunning(true), 100);
    } else {
      setShowEnrollment(true);
      setTimeout(() => backendConnected && setIsRunning(true), 100);
    }
  };

  const handleOTP = () => { setShowModal(false); alert('OTP verification selected'); };
  
  const stopCamera = () => {
    setIsRunning(false);
    if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    prevPos.current = { x: null, y: null };
  };
  
  const clearCanvas = () => {
    const ctx = drawingCanvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
    prevPos.current = { x: null, y: null };
  };
  
  const enrollSignature = async () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    const imageData = canvas.toDataURL('image/png');
    
    console.log('Attempting to enroll signature...');
    console.log('Node backend URL:', nodeBackendUrl);
    console.log('Username:', cardholderName);
    console.log('Image data length:', imageData.length);
    
    try {
      const response = await fetch(`${nodeBackendUrl}/enroll-signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: cardholderName.trim(),
          image: imageData 
        }),
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

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
  
  const cancelGestureAuth = () => { stopCamera(); setShowGestureAuth(false); };
  const cancelEnrollment = () => { stopCamera(); setShowEnrollment(false); };

  return (
    <div className="container">
      <div className="card">
        <h2>Your Cart</h2>
        <div className="item"><span>Example Product</span><span>${cartTotal.toFixed(2)}</span></div>
        <hr />
        <div className="total"><span>Total</span><span>${cartTotal.toFixed(2)}</span></div>
        <h3>Payment Details</h3>
        <input type="text" placeholder="Cardholder Name" className="input" value={cardholderName} onChange={(e) => setCardholderName(e.target.value)} />
        <input type="text" placeholder="Card Number" className="input" />
        <div className="row">
          <input type="text" placeholder="MM/YY" className="input half" />
          <input type="text" placeholder="CVV" className="input half" />
        </div>
        <button onClick={handlePay} className="pay-btn">Pay ${cartTotal.toFixed(2)}</button>
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
            {!backendConnected && (
              <div className="warning">⚠️ Python backend not connected. Start server: <code>python app.py</code></div>
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
              <button onClick={clearCanvas} className="gesture-btn gray"><RotateCcw size={16}/>Clear</button>
              <button onClick={enrollSignature} className="gesture-btn green"><Check size={16}/>Enroll Pattern</button>
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
            {!backendConnected && (
              <div className="warning">⚠️ Python backend not connected. Start server: <code>python app.py</code></div>
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
              <button onClick={clearCanvas} className="gesture-btn gray"><RotateCcw size={16}/>Clear</button>
              <button onClick={saveAndSubmit} className="gesture-btn blue"><Check size={16}/>Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}