import React, { useEffect, useRef, useState } from 'react';
import { Camera, Palette, Trash2, Settings, Wifi, WifiOff } from 'lucide-react';

const GestureDrawing = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const drawingCanvasRef = useRef(null);

  const [isRunning, setIsRunning] = useState(false);
  const [currentColor, setCurrentColor] = useState('#0000FF');
  const [brushSize, setBrushSize] = useState(5);
  const [showSettings, setShowSettings] = useState(false);
  const [detectionConfidence, setDetectionConfidence] = useState(0.7);
  const [trackingConfidence, setTrackingConfidence] = useState(0.7);
  const [backendConnected, setBackendConnected] = useState(false);
  const [backendUrl, setBackendUrl] = useState('http://localhost:5000');
  const [availableColors, setAvailableColors] = useState([]);
  const [colorIndex, setColorIndex] = useState(0);

  const prevPos = useRef({ x: null, y: null });
  const animationFrame = useRef(null);
  const processingFrame = useRef(false);
  const gestureTimeout = useRef(null);

  // Check backend connection and load colors on mount
  useEffect(() => {
    checkBackendConnection();
    loadColors();
  }, [backendUrl]);

  const checkBackendConnection = async () => {
    try {
      const response = await fetch(`${backendUrl}/health`);
      const data = await response.json();
      setBackendConnected(data.status === 'healthy');
    } catch (err) {
      setBackendConnected(false);
      console.error('Backend not connected:', err);
    }
  };

  const loadColors = async () => {
    try {
      const response = await fetch(`${backendUrl}/colors`);
      const data = await response.json();
      if (data.colors && data.colors.length > 0) {
        setAvailableColors(data.colors);
        setCurrentColor(data.colors[0].hex);
      }
    } catch (err) {
      console.error('Error loading colors:', err);
      // Fallback colors if backend not available
      const fallbackColors = [
        { name: 'blue', hex: '#0000FF' },
        { name: 'green', hex: '#00FF00' },
        { name: 'red', hex: '#FF0000' },
        { name: 'yellow', hex: '#FFFF00' },
        { name: 'purple', hex: '#FF00FF' }
      ];
      setAvailableColors(fallbackColors);
      setCurrentColor(fallbackColors[0].hex);
    }
  };

  const updateBackendSettings = async () => {
    try {
      await fetch(`${backendUrl}/update-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          min_detection_confidence: detectionConfidence,
          min_tracking_confidence: trackingConfidence
        })
      });
    } catch (err) {
      console.error('Error updating backend settings:', err);
    }
  };

  useEffect(() => {
    if (backendConnected) {
      updateBackendSettings();
    }
  }, [detectionConfidence, trackingConfidence]);

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

        // Capture frame as base64 (non-mirrored for processing)
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

          // Draw hand landmarks visualization
          drawHandVisualization(ctx, landmarks, canvas.width, canvas.height);

          // Get index finger position (mirrored for drawing)
          const indexPos = data.index_finger_pos;
          const x = canvas.width - indexPos.x; // Mirror X coordinate
          const y = indexPos.y;

          // Handle drawing
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

            // Draw cursor on video canvas
            ctx.beginPath();
            ctx.arc(x, y, brushSize + 5, 0, Math.PI * 2);
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = 3;
            ctx.stroke();
          } else {
            prevPos.current = { x: null, y: null };
          }

          // Handle color change gesture (with debouncing)
          if (data.gesture === 'color_change' && !gestureTimeout.current) {
            const nextIndex = (colorIndex + 1) % availableColors.length;
            setColorIndex(nextIndex);
            setCurrentColor(availableColors[nextIndex].hex);
            
            // Debounce gesture to prevent rapid color changes
            gestureTimeout.current = setTimeout(() => {
              gestureTimeout.current = null;
            }, 1000);
          }
        } else {
          // No hand detected, reset drawing position
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
      if (gestureTimeout.current) {
        clearTimeout(gestureTimeout.current);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isRunning, brushSize, currentColor, backendConnected, backendUrl, availableColors, colorIndex]);

  const drawHandVisualization = (ctx, landmarks, width, height) => {
    // MediaPipe hand connections
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [0, 9], [9, 10], [10, 11], [11, 12], // Middle
      [0, 13], [13, 14], [14, 15], [15, 16], // Ring
      [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [5, 9], [9, 13], [13, 17] // Palm
    ];

    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;

    // Draw connections
    connections.forEach(([start, end]) => {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];
      const startX = width - (startPoint.x * width); // Mirror
      const startY = startPoint.y * height;
      const endX = width - (endPoint.x * width); // Mirror
      const endY = endPoint.y * height;
      
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    });

    // Draw landmarks
    landmarks.forEach((landmark) => {
      const x = width - (landmark.x * width); // Mirror
      const y = landmark.y * height;
      
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#FF0000';
      ctx.fill();
    });
  };

  const clearCanvas = () => {
    const canvas = drawingCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    prevPos.current = { x: null, y: null };
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

  const handleColorClick = (color, index) => {
    setCurrentColor(color.hex);
    setColorIndex(index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-3 drop-shadow-lg">
            🎨 Gesture Drawing Studio
          </h1>
          <p className="text-xl text-purple-100 mb-4">
            Python-powered hand tracking with MediaPipe & Flask
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {backendConnected ? (
              <div className="flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-full shadow-lg">
                <Wifi size={20} />
                <span className="font-semibold">Backend Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-red-500 text-white px-6 py-3 rounded-full shadow-lg">
                <WifiOff size={20} />
                <span className="font-semibold">Start Flask server: python app.py</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={isRunning ? stopCamera : startCamera}
              disabled={!backendConnected}
              className={`flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white transition-all shadow-lg transform hover:scale-105 ${
                isRunning 
                  ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' 
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
              } ${!backendConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Camera size={24} />
              {isRunning ? 'Stop Camera' : 'Start Camera'}
            </button>

            <button
              onClick={clearCanvas}
              className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-xl font-bold text-white transition-all shadow-lg transform hover:scale-105"
            >
              <Trash2 size={24} />
              Clear Canvas
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl font-bold text-white transition-all shadow-lg transform hover:scale-105"
            >
              <Settings size={24} />
              Settings
            </button>
          </div>

          {showSettings && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/20">
              <h3 className="text-white text-xl font-bold mb-4">⚙️ Configuration</h3>
              
              <div className="mb-6">
                <label className="block text-white font-semibold mb-2">
                  Brush Size: {brushSize}px
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="mb-6">
                <label className="block text-white font-semibold mb-2">
                  Detection Confidence: {detectionConfidence.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="0.95"
                  step="0.05"
                  value={detectionConfidence}
                  onChange={(e) => setDetectionConfidence(Number(e.target.value))}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="mb-6">
                <label className="block text-white font-semibold mb-2">
                  Tracking Confidence: {trackingConfidence.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="0.95"
                  step="0.05"
                  value={trackingConfidence}
                  onChange={(e) => setTrackingConfidence(Number(e.target.value))}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">
                  Backend URL
                </label>
                <input
                  type="text"
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 text-white border border-white/30 focus:outline-none focus:border-white/60"
                  placeholder="http://localhost:5000"
                />
                <button
                  onClick={checkBackendConnection}
                  className="mt-3 px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all font-semibold"
                >
                  Test Connection
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 mb-6 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
            <Palette className="text-white" size={28} />
            <span className="text-white font-semibold text-lg">Colors:</span>
            <div className="flex gap-3">
              {availableColors.map((color, idx) => (
                <div
                  key={idx}
                  onClick={() => handleColorClick(color, idx)}
                  className={`w-12 h-12 rounded-full cursor-pointer transition-all shadow-lg ${
                    currentColor === color.hex 
                      ? 'ring-4 ring-white scale-125' 
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-white font-bold text-xl mb-3">📹 Camera Feed</h3>
              <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20">
                <video ref={videoRef} className="hidden" width="640" height="480" />
                <canvas ref={canvasRef} width="640" height="480" className="w-full" />
                {!isRunning && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
                    <div className="text-center">
                      <Camera size={64} className="mx-auto mb-4 opacity-50" />
                      <p className="text-lg">Click "Start Camera" to begin</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-white font-bold text-xl mb-3">🎨 Drawing Canvas</h3>
              <div className="bg-white rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20">
                <canvas ref={drawingCanvasRef} width="640" height="480" className="w-full" />
              </div>
            </div>
          </div>

          <div className="mt-8 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <h3 className="text-white font-bold text-xl mb-4">📋 Instructions</h3>
            <ul className="text-purple-100 space-y-2 text-lg">
              <li className="flex items-center gap-3">
                <span className="text-2xl">☝️</span>
                <span>Point your index finger up to start drawing</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-2xl">✋</span>
                <span>Lower your finger to stop drawing</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-2xl">🤏</span>
                <span>Pinch index and middle fingers together to change color</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-2xl">🎨</span>
                <span>Click a color swatch to manually select color</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestureDrawing;