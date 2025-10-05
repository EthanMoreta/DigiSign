import React, { useState, useRef, useEffect } from 'react';
import { RotateCcw, Check } from 'lucide-react';

/**
 * DigiSign Plugin - Gesture-based signature authentication
 * 
 * @param {Object} props
 * @param {string} props.backendUrl - URL of the DigiSign backend API (default: http://localhost:3001)
 * @param {Function} props.onVerified - Callback when signature is verified (receives {verified, score})
 * @param {Function} props.onEnrolled - Callback when user completes enrollment
 * @param {Function} props.onCancel - Callback when user cancels the process
 * @param {string} props.username - Username for signature enrollment/verification
 * @param {boolean} props.show - Controls plugin visibility
 * @param {string} props.mode - 'auto' (checks enrollment), 'enroll', or 'verify'
 */
export default function DigiSignPlugin({
  backendUrl = 'http://localhost:3001',
  onVerified = () => {},
  onEnrolled = () => {},
  onCancel = () => {},
  username = '',
  show = false,
  mode = 'auto'
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentMode, setCurrentMode] = useState(mode);
  const [mediapipeLoaded, setMediapipeLoaded] = useState(false);
  const [mediapipeError, setMediapipeError] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  const prevPos = useRef({ x: null, y: null });
  const animationFrame = useRef(null);
  const handsRef = useRef(null);

  const currentColor = '#0000FF';
  const brushSize = 5;

  // Inject CSS styles
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'digisign-plugin-styles';
    if (document.getElementById('digisign-plugin-styles')) return;
    
    style.textContent = `
      .digisign-overlay {
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
      
      .digisign-modal {
        background: #fff;
        border-radius: 10px;
        max-width: 700px;
        width: 90%;
        padding: 2rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        position: relative;
      }
      
      .digisign-close {
        position: absolute;
        top: 10px;
        right: 10px;
        background: transparent;
        border: none;
        font-size: 1.2rem;
        color: #888;
        cursor: pointer;
      }
      
      .digisign-warning {
        background: #fff3cd;
        color: #856404;
        padding: 0.75rem;
        border-radius: 6px;
        margin-bottom: 1rem;
        font-size: 0.85rem;
        border: 1px solid #ffeaa7;
      }

      .digisign-info {
        background: #e7f3ff;
        color: #004085;
        padding: 0.75rem;
        border-radius: 6px;
        margin-bottom: 1rem;
        font-size: 0.85rem;
        border: 1px solid #b8daff;
        line-height: 1.5;
      }
      
      .digisign-content {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-bottom: 1rem;
      }
      
      .digisign-label {
        font-size: 0.9rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
        color: #333;
      }
      
      .digisign-canvas-wrapper {
        position: relative;
        background: #000;
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid #ccc;
        aspect-ratio: 4/3;
      }
      
      .digisign-canvas {
        width: 100%;
        height: 100%;
        display: block;
      }
      
      .digisign-canvas.white-bg {
        background-color: #fff;
      }
      
      .digisign-instructions {
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
      
      .digisign-buttons {
        display: flex;
        gap: 0.75rem;
        justify-content: center;
      }
      
      .digisign-btn {
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
      
      .digisign-btn.gray {
        background: #6c757d;
      }
      
      .digisign-btn.blue {
        background: #007bff;
      }

      .digisign-btn.green {
        background: #28a745;
      }

      .digisign-btn:hover {
        opacity: 0.9;
      }
      
      .digisign-subtext {
        font-size: 0.9rem;
        color: #666;
        margin-bottom: 1rem;
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById('digisign-plugin-styles');
      if (el) document.head.removeChild(el);
    };
  }, []);

  // Load MediaPipe Hands
  useEffect(() => {
    const loadMediaPipe = async () => {
      if (document.getElementById('mediapipe-hands-script')) {
        setMediapipeLoaded(true);
        return;
      }

      try {
        const script = document.createElement('script');
        script.id = 'mediapipe-hands-script';
        script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
        script.async = true;
        
        script.onload = async () => {
          try {
            const hands = new window.Hands({
              locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
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
      } catch (err) {
        setMediapipeError('Error loading MediaPipe: ' + err.message);
      }
    };

    if (show) {
      loadMediaPipe();
    }
  }, [show]);

  const onHandsResults = (results) => {
    const canvas = canvasRef.current;
    const drawCanvas = drawingCanvasRef.current;
    if (!canvas || !drawCanvas) return;

    const ctx = canvas.getContext('2d');
    const drawCtx = drawCanvas.getContext('2d');

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(-1, 1);
    ctx.drawImage(results.image, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const indexTip = landmarks[8];
      const indexKnuckle = landmarks[6];
      
      const x = canvas.width - (indexTip.x * canvas.width);
      const y = indexTip.y * canvas.height;

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

  useEffect(() => {
    const checkEnrollment = async () => {
      if (!show || mode !== 'auto' || !username) return;
      
      setIsChecking(true);
      try {
        const response = await fetch(`${backendUrl}/check-enrollment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim() }),
        });
        const data = await response.json();
        setCurrentMode(data.enrolled ? 'verify' : 'enroll');
      } catch {
        setCurrentMode('enroll');
      } finally {
        setIsChecking(false);
      }
    };

    if (show && mode === 'auto') {
      checkEnrollment();
      setTimeout(() => setIsRunning(true), 100);
    } else if (show) {
      setCurrentMode(mode);
      setTimeout(() => setIsRunning(true), 100);
    }
  }, [show, mode, username, backendUrl]);

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
      const response = await fetch(`${backendUrl}/enroll-signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: username.trim(),
          image: imageData 
        }),
      });
      
      const data = await response.json();

      if (data.enrolled) {
        stopCamera();
        onEnrolled({ success: true, username: username.trim() });
      } else {
        alert('Failed to enroll pattern. Please try again.');
      }
    } catch (err) {
      console.error('Error enrolling signature:', err);
      alert(`Error enrolling pattern: ${err.message}`);
    }
  };

  const verifySignature = async () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    
    const imageData = canvas.toDataURL('image/png');
    
    try {
      const response = await fetch(`${backendUrl}/verify-signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: username.trim(),
          image: imageData 
        }),
      });
      const data = await response.json();

      stopCamera();
      onVerified({ 
        verified: data.verified, 
        score: data.score,
        username: username.trim()
      });
    } catch (err) {
      console.error('Error verifying signature:', err);
      stopCamera();
      onVerified({ verified: false, error: err.message });
    }
  };

  const handleCancel = () => {
    stopCamera();
    onCancel();
  };

  if (!show) return null;

  return (
    <div className="digisign-overlay">
      <div className="digisign-modal">
        <button onClick={handleCancel} className="digisign-close">✖</button>
        <h3>DigiSign {currentMode === 'enroll' ? 'Enrollment' : 'Authentication'}</h3>
        <p className="digisign-subtext">
          {currentMode === 'enroll' 
            ? 'Create your signature pattern for future authentications'
            : 'Draw your signature pattern to verify'}
        </p>
        
        {currentMode === 'enroll' && (
          <div className="digisign-info">
            ℹ️ This is your first time using DigiSign. Draw a unique pattern that you'll remember and use for all future MFA verifications.
          </div>
        )}
        
        {mediapipeError && (
          <div className="digisign-warning">⚠️ {mediapipeError}</div>
        )}
        
        {!mediapipeLoaded && !mediapipeError && (
          <div className="digisign-warning">⏳ Loading MediaPipe hand tracking...</div>
        )}
        
        {isChecking && (
          <div className="digisign-warning">🔍 Checking enrollment status...</div>
        )}
        
        <div className="digisign-content">
          <div>
            <div className="digisign-label">Camera Feed</div>
            <div className="digisign-canvas-wrapper">
              <video ref={videoRef} style={{ display: 'none' }} width="320" height="240" />
              <canvas ref={canvasRef} width="320" height="240" className="digisign-canvas" />
            </div>
          </div>
          <div>
            <div className="digisign-label">Your Pattern</div>
            <div className="digisign-canvas-wrapper">
              <canvas ref={drawingCanvasRef} width="320" height="240" className="digisign-canvas white-bg" />
            </div>
          </div>
        </div>
        
        <div className="digisign-instructions">
          <span>☝️ Point finger up to draw</span>
          <span>✋ Lower finger to stop</span>
        </div>
        
        <div className="digisign-buttons">
          <button onClick={clearCanvas} className="digisign-btn gray">
            <RotateCcw size={16}/>Clear
          </button>
          <button 
            onClick={currentMode === 'enroll' ? enrollSignature : verifySignature} 
            className={`digisign-btn ${currentMode === 'enroll' ? 'green' : 'blue'}`}
          >
            <Check size={16}/>
            {currentMode === 'enroll' ? 'Enroll Pattern' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}