import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Check, RotateCcw } from 'lucide-react';

export default function App() {
  const [cartTotal] = useState(49.99);
  const [showModal, setShowModal] = useState(false);
  const [showGestureAuth, setShowGestureAuth] = useState(false);
  
  // Gesture drawing state
  const [isRunning, setIsRunning] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [backendUrl] = useState('http://localhost:5000');
  const [currentColor] = useState('#0000FF');
  const [brushSize] = useState(5);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  const prevPos = useRef({ x: null, y: null });
  const animationFrame = useRef(null);
  const processingFrame = useRef(false);

  // Check backend connection
  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        const response = await fetch(`${backendUrl}/health`);
        const data = await response.json();
        setBackendConnected(data.status === 'healthy');
      } catch (err) {
        setBackendConnected(false);
      }
    };
    
    if (showGestureAuth) {
      checkBackendConnection();
    }
  }, [backendUrl, showGestureAuth]);

  // Camera and gesture processing
  useEffect(() => {
    let stream = null;

    const initializeCamera = async () => {
      if (!isRunning) return;

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
        console.error('Error accessing camera:', err);
        alert('Could not access camera. Please grant camera permissions.');
      }
    };

    const processFrame = async () => {
      if (!videoRef.current || !canvasRef.current || !isRunning || !backendConnected) {
        if (isRunning) {
          animationFrame.current = requestAnimationFrame(processFrame);
        }
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
        const drawingCanvas = drawingCanvasRef.current;
        const ctx = canvas.getContext('2d');
        const drawCtx = drawingCanvas.getContext('2d');

        // Draw video frame to canvas (mirrored)
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();

        // Capture frame as base64
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = video.videoWidth;
        tempCanvas.height = video.videoHeight;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(video, 0, 0);
        const frameData = tempCanvas.toDataURL('image/jpeg', 0.8);

        // Send to Python backend
        const response = await fetch(`${backendUrl}/process-frame`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frame: frameData })
        });

        const data = await response.json();

        if (data.success && data.hand_detected) {
          const landmarks = data.landmarks;
          drawHandVisualization(ctx, landmarks, canvas.width, canvas.height);

          const indexPos = data.index_finger_pos;
          // Scale coordinates to canvas size
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

            ctx.beginPath();
            ctx.arc(x, y, brushSize + 5, 0, Math.PI * 2);
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = 3;
            ctx.stroke();
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

    if (isRunning && backendConnected) {
      initializeCamera();
    }

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isRunning, backendConnected, backendUrl, currentColor, brushSize]);

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
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];
      const startX = width - (startPoint.x * width);
      const startY = startPoint.y * height;
      const endX = width - (endPoint.x * width);
      const endY = endPoint.y * height;
      
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    });

    landmarks.forEach((landmark) => {
      const x = width - (landmark.x * width);
      const y = landmark.y * height;
      
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#FF0000';
      ctx.fill();
    });
  };

  const handlePay = () => setShowModal(true);
  
  const handleDigiSign = () => {
    setShowModal(false);
    setShowGestureAuth(true);
    // Auto-start camera when DigiSign is selected
    setTimeout(() => {
      if (backendConnected) {
        setIsRunning(true);
      }
    }, 100);
  };

  const handleOTP = () => {
    setShowModal(false);
    alert('OTP verification selected');
  };

  const startCamera = () => {
    if (!backendConnected) {
      alert('Backend server not connected. Please start the Flask server first:\n\npython app.py');
      return;
    }
    setIsRunning(true);
  };

  const stopCamera = () => {
    setIsRunning(false);
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
    prevPos.current = { x: null, y: null };
  };

  const clearCanvas = () => {
    const canvas = drawingCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    prevPos.current = { x: null, y: null };
  };

  const saveAndSubmit = () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `digisign-pattern-${timestamp}.png`;
    
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = filename;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      
      // Close gesture auth and show success
      stopCamera();
      setShowGestureAuth(false);
      alert(`Pattern saved as ${filename}\n\nTransaction approved ✅`);
    }, 'image/png');
  };

  const cancelGestureAuth = () => {
    stopCamera();
    setShowGestureAuth(false);
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2>Your Cart</h2>
        <div style={itemStyle}>
          <span>Example Product</span>
          <span>${cartTotal.toFixed(2)}</span>
        </div>
        <hr />
        <div style={totalStyle}>
          <span>Total</span>
          <span>${cartTotal.toFixed(2)}</span>
        </div>

        <h3 style={{ marginTop: '1.5rem' }}>Payment Details</h3>
        <input type="text" placeholder="Cardholder Name" style={inputStyle} />
        <input type="text" placeholder="Card Number" style={inputStyle} />
        <div style={{ display: 'flex', gap: '10px' }}>
          <input type="text" placeholder="MM/YY" style={{ ...inputStyle, flex: 1 }} />
          <input type="text" placeholder="CVV" style={{ ...inputStyle, flex: 1 }} />
        </div>
        <button onClick={handlePay} style={payBtnStyle}>
          Pay ${cartTotal.toFixed(2)}
        </button>
      </div>

      {/* MFA Modal */}
      {showModal && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <button onClick={() => setShowModal(false)} style={closeBtn} aria-label="Close">
              ✖
            </button>
            <h3>MFA Verification</h3>
            <p>Please approve this transaction using PayShield MFA.</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
              <button onClick={handleDigiSign} style={approveBtn}>
                DigiSign
              </button>
              <button onClick={handleOTP} style={cancelBtn}>
                OTP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gesture Authentication Modal */}
      {showGestureAuth && (
        <div style={modalOverlayStyle}>
          <div style={gestureModalStyle}>
            <button onClick={cancelGestureAuth} style={gestureCloseBtn} aria-label="Close">
              ✖
            </button>
            
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>DigiSign Authentication</h3>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
              Draw your signature pattern to verify
            </p>

            {!backendConnected && (
              <div style={warningStyle}>
                ⚠️ Backend not connected. Start server: <code>python app.py</code>
              </div>
            )}

            <div style={gestureContentStyle}>
              <div>
                <div style={labelStyle}>Camera Feed</div>
                <div style={canvasWrapperStyle}>
                  <video ref={videoRef} style={{ display: 'none' }} width="320" height="240" />
                  <canvas ref={canvasRef} width="320" height="240" style={canvasStyle} />
                  {!isRunning && (
                    <div style={placeholderStyle}>
                      <Camera size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                      <p style={{ fontSize: '0.8rem', margin: 0 }}>Connecting...</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div style={labelStyle}>Your Pattern</div>
                <div style={canvasWrapperStyle}>
                  <canvas 
                    ref={drawingCanvasRef} 
                    width="320" 
                    height="240" 
                    style={{ ...canvasStyle, backgroundColor: '#fff' }}
                  />
                </div>
              </div>
            </div>

            <div style={instructionsStyle}>
              <span style={{ fontSize: '0.85rem' }}>☝️ Point finger up to draw</span>
              <span style={{ fontSize: '0.85rem' }}>✋ Lower finger to stop</span>
            </div>

            <div style={gestureButtonsStyle}>
              <button onClick={clearCanvas} style={{ ...gestureBtn, backgroundColor: '#6c757d' }}>
                <RotateCcw size={16} />
                Clear
              </button>

              <button onClick={saveAndSubmit} style={{ ...gestureBtn, backgroundColor: '#007bff' }}>
                <Check size={16} />
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const containerStyle = {
  fontFamily: 'sans-serif',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  background: '#f2f2f2',
  padding: '1rem',
};

const cardStyle = {
  background: '#fff',
  padding: '2rem',
  borderRadius: '10px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  width: '100%',
  maxWidth: '350px',
};

const itemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '1rem',
};

const totalStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  fontWeight: 'bold',
  marginTop: '0.5rem',
};

const inputStyle = {
  width: '100%',
  padding: '0.5rem',
  margin: '0.5rem 0',
  border: '1px solid #ccc',
  borderRadius: '6px',
  fontSize: '0.9rem',
};

const payBtnStyle = {
  marginTop: '1rem',
  width: '100%',
  padding: '0.75rem',
  background: '#007bff',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '1rem',
};

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 9999,
};

const modalStyle = {
  background: '#fff',
  padding: '2rem',
  borderRadius: '10px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  width: '90%',
  maxWidth: '300px',
  textAlign: 'center',
  position: 'relative',
};

const closeBtn = {
  position: 'absolute',
  top: '10px',
  right: '10px',
  background: 'transparent',
  border: 'none',
  fontSize: '1.2rem',
  cursor: 'pointer',
  color: '#888',
};

const approveBtn = {
  flex: 1,
  padding: '0.5rem',
  background: 'green',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
};

const cancelBtn = {
  flex: 1,
  padding: '0.5rem',
  background: 'red',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
};

const gestureModalStyle = {
  background: '#fff',
  borderRadius: '10px',
  maxWidth: '700px',
  width: '90%',
  padding: '2rem',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  position: 'relative',
};

const gestureCloseBtn = {
  position: 'absolute',
  top: '10px',
  right: '10px',
  background: 'transparent',
  border: 'none',
  fontSize: '1.2rem',
  cursor: 'pointer',
  color: '#888',
};

const warningStyle = {
  background: '#fff3cd',
  color: '#856404',
  padding: '0.75rem',
  borderRadius: '6px',
  marginBottom: '1rem',
  fontSize: '0.85rem',
  border: '1px solid #ffeaa7',
};

const gestureContentStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1rem',
  marginBottom: '1rem',
};

const labelStyle = {
  fontSize: '0.9rem',
  fontWeight: '600',
  marginBottom: '0.5rem',
  color: '#333',
};

const canvasWrapperStyle = {
  position: 'relative',
  backgroundColor: '#000',
  borderRadius: '6px',
  overflow: 'hidden',
  border: '1px solid #ccc',
  aspectRatio: '4/3',
};

const canvasStyle = {
  width: '100%',
  height: '100%',
  display: 'block',
};

const placeholderStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#999',
  backgroundColor: '#f5f5f5',
};

const instructionsStyle = {
  background: '#f8f9fa',
  borderRadius: '6px',
  padding: '0.75rem',
  marginBottom: '1rem',
  color: '#666',
  display: 'flex',
  gap: '1.5rem',
  justifyContent: 'center',
  fontSize: '0.85rem',
  border: '1px solid #e9ecef',
};

const gestureButtonsStyle = {
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'center',
};

const gestureBtn = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 1rem',
  border: 'none',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '0.9rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'opacity 0.2s',
};