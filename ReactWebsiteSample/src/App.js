import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Check, RotateCcw } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe
const stripePromise = loadStripe('pk_test_51SETfKIRVYdDpHLckHnhJFxFwAIRKDIILO2kGagQVpcOl9Qqek8vOzzrxP5T7lQHQKtzCBR2CEODgbmuojn2iWfd00WTThrzhQ'); // Test key for development

// Payment Form Component with Stripe Elements
function PaymentForm({ onPaymentSuccess, onPaymentError, isAuthenticated, authType, authData, amount, username, onAuthenticate }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [cardError, setCardError] = useState('');
  const [cardDetails, setCardDetails] = useState(null);

  useEffect(() => {
    console.log('PaymentForm useEffect - Stripe Elements status:', {
      stripe: !!stripe,
      elements: !!elements,
      stripePromise: !!stripePromise
    });
  }, [stripe, elements]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setCardError('');

    const cardElement = elements.getElement(CardElement);
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
      billing_details: {
        name: username,
      },
    });

    if (error) {
      setCardError(error.message);
      setProcessing(false);
      return;
    }

    // Store card details for later use
    setCardDetails(paymentMethod);

    // If not authenticated, show authentication options
    if (!isAuthenticated) {
      setProcessing(false);
      onAuthenticate(paymentMethod);
      return;
    }

    // If authenticated, proceed with payment
    try {
      const response = await fetch('http://localhost:3001/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount,
          username: username,
          authType: authType,
          authData: authData,
          paymentMethodId: paymentMethod.id
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
          data.clientSecret,
          {
            payment_method: paymentMethod.id,
          }
        );

        if (confirmError) {
          setCardError(confirmError.message);
        } else if (paymentIntent.status === 'succeeded') {
          onPaymentSuccess(paymentIntent);
        }
      } else {
        onPaymentError(data.error || 'Payment failed');
      }
    } catch (err) {
      onPaymentError('Payment processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (!stripe || !elements) {
    console.log('Stripe Elements not loaded:', { stripe: !!stripe, elements: !!elements });
    return (
      <div className="payment-form">
        <div className="input-group">
          <label>Card Information</label>
          <div className="card-element-container">
            <div style={{ padding: '12px', textAlign: 'center', color: '#e5e5e5' }}>
              Loading Stripe Elements...
            </div>
          </div>
        </div>
        <button disabled className="pay-btn">
          Loading...
        </button>
      </div>
    );
  }

  console.log('Rendering PaymentForm:', { stripe: !!stripe, elements: !!elements, isAuthenticated, username });
  
  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <div className="input-group">
        <label>Card Information</label>
        <div className="card-element-container">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#e5e5e5', // Dark theme text color
                  '::placeholder': {
                    color: 'rgba(255, 255, 255, 0.4)', // Dark theme placeholder
                  },
                },
                invalid: {
                  color: '#ef4444', // Dark theme error color
                },
              },
            }}
          />
        </div>
        {cardError && <div className="error">{cardError}</div>}
      </div>
      
      <button 
        type="submit" 
        disabled={!stripe || processing}
        className="pay-btn"
      >
        {processing ? 'Processing...' : isAuthenticated ? `Pay $${amount.toFixed(2)}` : `Authenticate`}
      </button>
    </form>
  );
}

export default function App() {
  const [cartTotal] = useState(49.99);
  const [showModal, setShowModal] = useState(false);
  const [showGestureAuth, setShowGestureAuth] = useState(false);
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [nodeBackendUrl] = useState('http://localhost:3001');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authType, setAuthType] = useState(null);
  const [authData, setAuthData] = useState(null);
  const [currentColor] = useState('#0000FF');
  const [brushSize] = useState(5);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [checkingEnrollment, setCheckingEnrollment] = useState(false);
  const [cardholderName, setCardholderName] = useState('');
  const [mediapipeLoaded, setMediapipeLoaded] = useState(false);
  const [mediapipeError, setMediapipeError] = useState(null);
  const [showOTP, setShowOTP] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);

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
      * {
        box-sizing: border-box;
      }
      
      body {
        margin: 0;
        padding: 0;
        background: #0a0a0a;
        color: #e5e5e5;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      }
      
      .container {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
        padding: 2rem;
        position: relative;
      }
      
      .container::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
                    radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.1) 0%, transparent 50%);
        pointer-events: none;
      }
      
      .card {
        background: rgba(20, 20, 20, 0.8);
        padding: 2.5rem;
        border-radius: 20px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 
                    0 0 0 1px rgba(255, 255, 255, 0.05);
        max-width: 600px;
        width: 100%;
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        position: relative;
        z-index: 1;
      }
      
      .card h2 {
        color: #ffffff;
        font-size: 1.8rem;
        font-weight: 600;
        margin: 0 0 1.5rem 0;
        text-align: center;
        letter-spacing: -0.02em;
      }
      
      .card h3 {
        color: #e5e5e5;
        font-size: 1.2rem;
        font-weight: 500;
        margin: 1.5rem 0 1rem 0;
        letter-spacing: -0.01em;
      }
      
      .item, .total {
        display: flex;
        justify-content: space-between;
        margin-bottom: 1rem;
        padding: 0.75rem 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }
      
      .item:last-of-type {
        border-bottom: none;
      }
      
      .total {
        font-weight: 600;
        font-size: 1.1rem;
        color: #ffffff;
        border-top: 2px solid rgba(255, 255, 255, 0.1);
        margin-top: 1rem;
        padding-top: 1rem;
      }
      
      .input {
        width: 100%;
        padding: 0.875rem 1rem;
        margin: 0.5rem 0;
        background: rgba(30, 30, 30, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        font-size: 0.95rem;
        color: #e5e5e5;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
      }
      
      .input:focus {
        outline: none;
        border-color: rgba(99, 102, 241, 0.5);
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        background: rgba(40, 40, 40, 0.9);
      }
      
      .input::placeholder {
        color: rgba(255, 255, 255, 0.4);
      }
      
      .row {
        display: flex;
        gap: 12px;
      }
      
      .half {
        flex: 1;
      }
      
      .pay-btn {
        margin-top: 1.5rem;
        width: 100%;
        padding: 1rem 1.5rem;
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: #ffffff;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 600;
        transition: all 0.3s ease;
        box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
        letter-spacing: -0.01em;
      }
      
      .pay-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
      }
      
      .pay-btn:active {
        transform: translateY(0);
      }
      
      .pay-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }
      
      .pay-btn.authenticated {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
      }
      
      .pay-btn.authenticated:hover {
        box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
      }
      
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        backdrop-filter: blur(10px);
      }
      
      .modal {
        background: rgba(20, 20, 20, 0.95);
        padding: 3rem;
        border-radius: 20px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
        max-width: 600px;
        width: 98%;
        text-align: center;
        position: relative;
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(20px);
      }
      
      .close {
        position: absolute;
        top: 15px;
        right: 15px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        font-size: 1.2rem;
        color: #e5e5e5;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      
      .close:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .checking {
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.6);
        font-style: italic;
        margin: 0.5rem 0;
        text-align: center;
      }
      
      .approve {
        flex: 1;
        padding: 0.75rem 1rem;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: #ffffff;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.3s ease;
        box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
      }

      .approve:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
      }

      .approve:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }
      
      .cancel {
        flex: 1;
        padding: 0.75rem 1rem;
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: #ffffff;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.3s ease;
        box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);
      }
      
      .cancel:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);
      }
      
      .gesture-modal {
        background: rgba(20, 20, 20, 0.95);
        border-radius: 20px;
        max-width: 1000px;
        width: 98%;
        padding: 3rem;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
        position: relative;
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(20px);
      }
      
      .gesture-close {
        position: absolute;
        top: 15px;
        right: 15px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        font-size: 1.2rem;
        color: #e5e5e5;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      
      .gesture-close:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      
      .warning {
        background: rgba(251, 191, 36, 0.1);
        color: #fbbf24;
        padding: 1rem;
        border-radius: 12px;
        margin-bottom: 1rem;
        font-size: 0.9rem;
        border: 1px solid rgba(251, 191, 36, 0.2);
        backdrop-filter: blur(10px);
      }

      .enrollment-info {
        background: rgba(59, 130, 246, 0.1);
        color: #60a5fa;
        padding: 1rem;
        border-radius: 12px;
        margin-bottom: 1rem;
        font-size: 0.9rem;
        border: 1px solid rgba(59, 130, 246, 0.2);
        line-height: 1.6;
        backdrop-filter: blur(10px);
      }
      
      .gesture-content {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
        margin-bottom: 2rem;
      }
      
      .label {
        font-size: 0.95rem;
        font-weight: 600;
        margin-bottom: 0.75rem;
        color: #e5e5e5;
        letter-spacing: -0.01em;
      }
      
      .canvas-wrapper {
        position: relative;
        background: #000;
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.1);
        aspect-ratio: 4/3;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      }
      
      .canvas {
        width: 100%;
        height: 100%;
        display: block;
      }
      
      .white-bg {
        background-color: #1a1a1a;
      }
      
      .instructions {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 1rem;
        margin-bottom: 1.5rem;
        color: rgba(255, 255, 255, 0.7);
        display: flex;
        gap: 1.5rem;
        justify-content: center;
        font-size: 0.9rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
      }
      
      .gesture-buttons {
        display: flex;
        gap: 1rem;
        justify-content: center;
      }
      
      .gesture-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 12px;
        color: #ffffff;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      }
      
      .gesture-btn.gray {
        background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
      }
      
      .gesture-btn.gray:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(107, 114, 128, 0.3);
      }
      
      .gesture-btn.blue {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      }

      .gesture-btn.green {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      }

      .gesture-btn.blue:hover,
      .gesture-btn.green:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
      }
      
      .gesture-btn.green:hover {
        box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
      }
      
      .subtext {
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.6);
        margin-bottom: 1rem;
        text-align: center;
      }

      /* Stripe Elements Styles */
      .payment-form {
        margin-top: 1.5rem;
      }

      .input-group {
        margin-bottom: 1.5rem;
      }

      .input-group label {
        display: block;
        font-size: 0.95rem;
        font-weight: 600;
        color: #e5e5e5;
        margin-bottom: 0.75rem;
        letter-spacing: -0.01em;
      }

      .card-element-container {
        padding: 1rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        background: rgba(30, 30, 30, 0.8);
        margin-bottom: 1rem;
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
        min-height: 50px;
        cursor: text;
      }

      .card-element-container:focus-within {
        border-color: rgba(99, 102, 241, 0.5);
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        background: rgba(40, 40, 40, 0.9);
      }

      .error {
        color: #ef4444;
        font-size: 0.85rem;
        margin-top: 0.5rem;
        text-align: center;
      }

      /* OTP Modal Styles */
      .otp-input {
        width: 100%;
        padding: 0.875rem 1rem;
        margin: 0.5rem 0;
        background: rgba(30, 30, 30, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        font-size: 1.1rem;
        color: #e5e5e5;
        text-align: center;
        letter-spacing: 0.2em;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
      }

      .otp-input:focus {
        outline: none;
        border-color: rgba(99, 102, 241, 0.5);
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        background: rgba(40, 40, 40, 0.9);
      }

      .otp-input::placeholder {
        color: rgba(255, 255, 255, 0.4);
        letter-spacing: normal;
      }

      .otp-buttons {
        display: flex;
        gap: 1rem;
        margin-top: 1.5rem;
      }

      .otp-btn {
        flex: 1;
        padding: 0.75rem 1rem;
        border: none;
        border-radius: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 0.95rem;
      }

      .otp-btn.primary {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: #ffffff;
        box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
      }

      .otp-btn.primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
      }

      .otp-btn.secondary {
        background: rgba(255, 255, 255, 0.1);
        color: #e5e5e5;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .otp-btn.secondary:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-2px);
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
    
    // If user is already enrolled, go directly to verification
    if (isEnrolled) {
      setShowGestureAuth(true);
      setTimeout(() => setIsRunning(true), 100);
    } else {
      // Check if user has enrolled signature on backend
    const enrolled = await checkEnrollmentStatus();
    
    if (enrolled) {
        setIsEnrolled(true);
      setShowGestureAuth(true);
        setTimeout(() => setIsRunning(true), 100);
    } else {
      setShowEnrollment(true);
        setTimeout(() => setIsRunning(true), 100);
      }
    }
  };

  const handleOTP = () => { 
    setShowModal(false);
    setShowOTP(true);
    setOtpSent(false);
    setOtpError('');
  };

  const sendOTP = async () => {
    if (!cardholderName.trim()) {
      setOtpError('Please enter cardholder name');
      return;
    }

    if (!phoneNumber.trim()) {
      setOtpError('Please enter phone number');
      return;
    }

    // Basic phone number validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(phoneNumber.replace(/[\s\-\(\)]/g, ''))) {
      setOtpError('Please enter a valid phone number');
      return;
    }

    try {
      // Simulate OTP sending (in real app, this would call backend)
      setOtpSent(true);
      setOtpError('');
      alert(`OTP sent to ${phoneNumber}\n\nOTP Code: 123456\n\n(For demo purposes)`);
    } catch (err) {
      setOtpError('Failed to send OTP. Please try again.');
    }
  };

  const verifyOTP = async () => {
    if (!otpCode.trim()) {
      setOtpError('Please enter OTP code');
      return;
    }

    try {
      // Simulate OTP verification (in real app, this would call backend)
      if (otpCode === '123456') {
        // Store authentication data for payment
        setIsAuthenticated(true);
        setAuthType('otp');
        setAuthData({ otpCode: otpCode });
        
        setShowOTP(false);
        setOtpCode('');
        setOtpSent(false);
        setOtpError('');
        alert('OTP verified successfully! ✅\n\nYou can now proceed with payment.');
      } else {
        setOtpError('Invalid OTP code. Please try again.');
      }
    } catch (err) {
      setOtpError('OTP verification failed. Please try again.');
    }
  };

  const cancelOTP = () => {
    setShowOTP(false);
    setOtpCode('');
    setOtpSent(false);
    setOtpError('');
    setPhoneNumber('');
  };

  const handlePaymentSuccess = (paymentIntent) => {
    alert(`Payment successful! ✅\n\nAmount: $${(paymentIntent.amount / 100).toFixed(2)}\nPayment ID: ${paymentIntent.id}\nAuthentication: ${authType.toUpperCase()}`);
    
    // Reset authentication state
    setIsAuthenticated(false);
    setAuthType(null);
    setAuthData(null);
    setShowPaymentForm(false);
    setShowModal(false);
  };

  const handlePaymentError = (error) => {
    alert(`Payment failed: ${error}`);
  };

  const handleAuthenticateAfterCard = (paymentMethod) => {
    // Store the payment method and show authentication modal
    setShowModal(true);
    // You can store the payment method in state if needed
  };

  const processPayment = async () => {
    // Show payment form first, then authenticate
    setShowPaymentForm(true);
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

      if (data.success) {
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
        // Store authentication data for payment
        setIsAuthenticated(true);
        setAuthType('signature');
        setAuthData({ image: imageData });
        
        alert(`Signature verified! ✅\nSimilarity score: ${(data.similarity * 100).toFixed(1)}%\n\nYou can now proceed with payment.`);
      } else {
        const useOTP = confirm(`Signature verification failed ❌\nSimilarity score: ${(data.similarity * 100).toFixed(1)}%\n\nWould you like to use OTP verification instead?`);
        if (useOTP) {
          setShowGestureAuth(false);
          setShowOTP(true);
          setOtpSent(false);
          setOtpError('');
        }
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
          onChange={(e) => {
            setCardholderName(e.target.value);
            // Reset enrollment status when username changes
            setIsEnrolled(false);
          }} 
        />
        <input 
          type="tel" 
          placeholder="Phone Number (for OTP)" 
          className="input" 
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
        {showPaymentForm ? (
          <Elements stripe={stripePromise}>
            <PaymentForm
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
              isAuthenticated={isAuthenticated}
              authType={authType}
              authData={authData}
              amount={cartTotal}
              username={cardholderName.trim()}
              onAuthenticate={handleAuthenticateAfterCard}
            />
          </Elements>
        ) : (
          <button 
            onClick={processPayment} 
            className="pay-btn"
            disabled={!cardholderName.trim()}
            style={{ 
              opacity: cardholderName.trim() ? 1 : 0.6, 
              cursor: cardholderName.trim() ? 'pointer' : 'not-allowed' 
            }}
          >
            Pay ${cartTotal.toFixed(2)}
          </button>
        )}
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

      {showOTP && (
        <div className="modal-overlay">
          <div className="gesture-modal">
            <button onClick={cancelOTP} className="gesture-close">✖</button>
            <h3>OTP Verification</h3>
            <p className="subtext">Enter the OTP code sent to your phone number</p>
            
            <div className="otp-content">
              <div className="input-group">
                <label>Cardholder Name</label>
                <input 
                  type="text" 
                  value={cardholderName} 
                  disabled
                  className="input disabled"
                />
              </div>
              
              <div className="input-group">
                <label>Phone Number</label>
                <input 
                  type="tel" 
                  placeholder="+1 (555) 123-4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="input"
                />
              </div>
              
              {!otpSent ? (
                <div className="otp-send">
                  <p>Click "Send OTP" to receive a verification code via SMS</p>
                  <button onClick={sendOTP} className="gesture-btn blue">
                    Send OTP
                  </button>
                </div>
              ) : (
                <div className="otp-verify">
                  <div className="input-group">
                    <label>Enter OTP Code</label>
                    <input 
                      type="text" 
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="input"
                      maxLength="6"
                    />
                  </div>
                  
                  {otpError && (
                    <div className="error">{otpError}</div>
                  )}
                  
                  <div className="otp-actions">
                    <button onClick={sendOTP} className="gesture-btn gray">
                      Resend OTP
                    </button>
                    <button onClick={verifyOTP} className="gesture-btn blue">
                      Verify OTP
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}