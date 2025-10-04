import React, { useEffect, useRef, useState } from 'react';
import { Camera, Palette, Trash2, Settings } from 'lucide-react';

const GestureDrawing = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  
  const [isRunning, setIsRunning] = useState(false);
  const [currentColor, setCurrentColor] = useState('#FF0000');
  const [brushSize, setBrushSize] = useState(5);
  const [showSettings, setShowSettings] = useState(false);
  const [gestureThreshold, setGestureThreshold] = useState(40);
  const [detectionConfidence, setDetectionConfidence] = useState(0.7);
  
  const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
  const prevPos = useRef({ x: null, y: null });
  const colorIndex = useRef(0);
  const animationFrame = useRef(null);

  useEffect(() => {
    let handTracker = null;
    
    const initializeHandTracking = async () => {
      if (!isRunning) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const hands = new window.Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: detectionConfidence,
          minTrackingConfidence: detectionConfidence
        });

        hands.onResults(onResults);
        handTracker = hands;

        const processFrame = async () => {
          if (videoRef.current && canvasRef.current && isRunning) {
            await hands.send({ image: videoRef.current });
            animationFrame.current = requestAnimationFrame(processFrame);
          }
        };

        processFrame();
      } catch (err) {
        console.error('Error accessing camera:', err);
        alert('Could not access camera. Please grant camera permissions.');
      }
    };

    const onResults = (results) => {
      const canvas = canvasRef.current;
      const drawingCanvas = drawingCanvasRef.current;
      const video = videoRef.current;
      
      if (!canvas || !drawingCanvas || !video) return;

      const ctx = canvas.getContext('2d');
      const drawCtx = drawingCanvas.getContext('2d');
      
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        
        const indexTip = landmarks[8];
        const middleTip = landmarks[12];
        const indexKnuckle = landmarks[6];
        
        const x = (1 - indexTip.x) * canvas.width;
        const y = indexTip.y * canvas.height;
        const x2 = (1 - middleTip.x) * canvas.width;
        const y2 = middleTip.y * canvas.height;

        drawConnectors(ctx, landmarks, canvas.width, canvas.height);
        drawLandmarks(ctx, landmarks, canvas.width, canvas.height);

        const distance = Math.sqrt((x - x2) ** 2 + (y - y2) ** 2);
        
        if (distance < gestureThreshold) {
          colorIndex.current = (colorIndex.current + 1) % colors.length;
          setCurrentColor(colors[colorIndex.current]);
          prevPos.current = { x: null, y: null };
          
          ctx.beginPath();
          ctx.arc(x, y, 30, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
          ctx.fill();
        } else {
          const isFingerUp = indexTip.y < indexKnuckle.y;
          
          if (isFingerUp) {
            if (prevPos.current.x !== null) {
              drawCtx.strokeStyle = colors[colorIndex.current];
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
            ctx.strokeStyle = colors[colorIndex.current];
            ctx.lineWidth = 3;
            ctx.stroke();
          } else {
            prevPos.current = { x: null, y: null };
          }
        }
      }
    };

    const drawConnectors = (ctx, landmarks, width, height) => {
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
        ctx.beginPath();
        ctx.moveTo((1 - startPoint.x) * width, startPoint.y * height);
        ctx.lineTo((1 - endPoint.x) * width, endPoint.y * height);
        ctx.stroke();
      });
    };

    const drawLandmarks = (ctx, landmarks, width, height) => {
      landmarks.forEach((landmark) => {
        ctx.beginPath();
        ctx.arc((1 - landmark.x) * width, landmark.y * height, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#FF0000';
        ctx.fill();
      });
    };

    if (isRunning) {
      initializeHandTracking();
    }

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [isRunning, brushSize, gestureThreshold, detectionConfidence]);

  const clearCanvas = () => {
    const canvas = drawingCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const startCamera = () => {
    setIsRunning(true);
  };

  const stopCamera = () => {
    setIsRunning(false);
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '32px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    main: {
      maxWidth: '1400px',
      margin: '0 auto'
    },
    header: {
      textAlign: 'center',
      marginBottom: '32px'
    },
    title: {
      fontSize: '36px',
      fontWeight: 'bold',
      color: 'white',
      marginBottom: '8px'
    },
    subtitle: {
      color: '#e0e7ff',
      fontSize: '16px'
    },
    panel: {
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
    },
    buttonGroup: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '16px',
      marginBottom: '24px'
    },
    button: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 24px',
      border: 'none',
      borderRadius: '8px',
      fontWeight: '600',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.3s',
      color: 'white'
    },
    startButton: {
      backgroundColor: isRunning ? '#ef4444' : '#10b981'
    },
    clearButton: {
      backgroundColor: '#f97316'
    },
    settingsButton: {
      backgroundColor: '#3b82f6'
    },
    settingsPanel: {
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '8px',
      padding: '24px',
      marginBottom: '24px'
    },
    settingItem: {
      marginBottom: '20px'
    },
    label: {
      color: 'white',
      fontWeight: '600',
      display: 'block',
      marginBottom: '8px',
      fontSize: '14px'
    },
    slider: {
      width: '100%',
      height: '8px',
      borderRadius: '4px',
      outline: 'none',
      cursor: 'pointer'
    },
    colorPicker: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      marginBottom: '24px'
    },
    colorSwatches: {
      display: 'flex',
      gap: '12px'
    },
    colorSwatch: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      cursor: 'pointer',
      transition: 'all 0.3s',
      border: '4px solid transparent'
    },
    colorSwatchActive: {
      border: '4px solid white',
      transform: 'scale(1.1)'
    },
    canvasGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '16px',
      '@media (min-width: 1024px)': {
        gridTemplateColumns: '1fr 1fr'
      }
    },
    canvasSection: {
      position: 'relative'
    },
    canvasTitle: {
      color: 'white',
      fontWeight: '600',
      marginBottom: '8px',
      fontSize: '16px'
    },
    canvasWrapper: {
      position: 'relative',
      background: 'black',
      borderRadius: '8px',
      overflow: 'hidden'
    },
    canvasWrapperWhite: {
      background: 'white'
    },
    canvas: {
      width: '100%',
      display: 'block'
    },
    videoHidden: {
      display: 'none'
    },
    placeholder: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#1f2937',
      color: 'white',
      fontSize: '18px'
    },
    instructions: {
      marginTop: '24px',
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '8px',
      padding: '16px'
    },
    instructionsTitle: {
      color: 'white',
      fontWeight: '600',
      marginBottom: '8px',
      fontSize: '16px'
    },
    instructionsList: {
      color: '#e0e7ff',
      listStyle: 'none',
      padding: 0,
      margin: 0
    },
    instructionItem: {
      marginBottom: '4px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.title}>Gesture Drawing Studio</h1>
          <p style={styles.subtitle}>Draw with your hand gestures! Point with index finger to draw, bring fingers together to change colors.</p>
        </div>

        <div style={styles.panel}>
          <div style={styles.buttonGroup}>
            <button
              onClick={isRunning ? stopCamera : startCamera}
              style={{...styles.button, ...styles.startButton}}
            >
              <Camera size={20} />
              {isRunning ? 'Stop Camera' : 'Start Camera'}
            </button>

            <button
              onClick={clearCanvas}
              style={{...styles.button, ...styles.clearButton}}
            >
              <Trash2 size={20} />
              Clear Canvas
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              style={{...styles.button, ...styles.settingsButton}}
            >
              <Settings size={20} />
              Settings
            </button>
          </div>

          {showSettings && (
            <div style={styles.settingsPanel}>
              <div style={styles.settingItem}>
                <label style={styles.label}>
                  Brush Size: {brushSize}px
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  style={styles.slider}
                />
              </div>
              
              <div style={styles.settingItem}>
                <label style={styles.label}>
                  Gesture Sensitivity: {gestureThreshold}px
                </label>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={gestureThreshold}
                  onChange={(e) => setGestureThreshold(Number(e.target.value))}
                  style={styles.slider}
                />
              </div>

              <div style={styles.settingItem}>
                <label style={styles.label}>
                  Detection Confidence: {detectionConfidence.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="0.95"
                  step="0.05"
                  value={detectionConfidence}
                  onChange={(e) => setDetectionConfidence(Number(e.target.value))}
                  style={styles.slider}
                />
              </div>
            </div>
          )}

          <div style={styles.colorPicker}>
            <Palette color="white" size={24} />
            <div style={styles.colorSwatches}>
              {colors.map((color, idx) => (
                <div
                  key={idx}
                  style={{
                    ...styles.colorSwatch,
                    backgroundColor: color,
                    ...(currentColor === color ? styles.colorSwatchActive : {})
                  }}
                  onClick={() => {
                    colorIndex.current = idx;
                    setCurrentColor(color);
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: window.innerWidth >= 1024 ? '1fr 1fr' : '1fr', gap: '16px'}}>
            <div style={styles.canvasSection}>
              <h3 style={styles.canvasTitle}>Camera Feed</h3>
              <div style={styles.canvasWrapper}>
                <video
                  ref={videoRef}
                  style={styles.videoHidden}
                  width="640"
                  height="480"
                />
                <canvas
                  ref={canvasRef}
                  width="640"
                  height="480"
                  style={styles.canvas}
                />
                {!isRunning && (
                  <div style={styles.placeholder}>
                    <p>Click "Start Camera" to begin</p>
                  </div>
                )}
              </div>
            </div>

            <div style={styles.canvasSection}>
              <h3 style={styles.canvasTitle}>Drawing Canvas</h3>
              <div style={{...styles.canvasWrapper, ...styles.canvasWrapperWhite}}>
                <canvas
                  ref={drawingCanvasRef}
                  width="640"
                  height="480"
                  style={styles.canvas}
                />
              </div>
            </div>
          </div>

          <div style={styles.instructions}>
            <h3 style={styles.instructionsTitle}>Instructions:</h3>
            <ul style={styles.instructionsList}>
              <li style={styles.instructionItem}>✋ Point your index finger up to start drawing</li>
              <li style={styles.instructionItem}>🤏 Bring index and middle fingers close together to change colors</li>
              <li style={styles.instructionItem}>✊ Lower your index finger to stop drawing</li>
              <li style={styles.instructionItem}>🎨 Click color swatches above to manually select colors</li>
            </ul>
          </div>
        </div>
      </div>

      <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js"></script>
    </div>
  );
};

export default GestureDrawing;