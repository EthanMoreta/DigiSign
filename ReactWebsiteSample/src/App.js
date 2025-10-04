import React, { useEffect, useRef, useState } from 'react';
import './style.css';

// Backend API configuration
const API_BASE_URL = 'http://localhost:5001';

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cartTotal] = useState(49.99); // example total
  const [showModal, setShowModal] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error('Error accessing webcam:', err);
      });
  }, []);

  // API Functions
  const captureSignature = async () => {
    if (!videoRef.current) return null;
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    context.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL('image/jpeg');
  };

  const verifySignature = async (signatureImage) => {
    try {
      const response = await fetch(`${API_BASE_URL}/verify-signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: 'demo_user',
          signature_image: signatureImage,
          session_id: `session_${Date.now()}`
        })
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Signature verification error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const generateOtp = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/generate-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: 'demo_user',
          session_id: `session_${Date.now()}`
        })
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('OTP generation error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const verifyOtp = async (otpCode) => {
    try {
      const response = await fetch(`${API_BASE_URL}/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: 'demo_user',
          otp_code: otpCode,
          session_id: `session_${Date.now()}`
        })
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('OTP verification error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  // Show modal when Pay clicked
  const handlePay = () => {
    setShowModal(true);
  };

  const handleDigiSign = async () => {
    setLoading(true);
    setMessage('Capturing signature...');
    
    try {
      // Capture signature from webcam
      const signatureImage = await captureSignature();
      if (!signatureImage) {
        setMessage('Failed to capture signature. Please try again.');
        setLoading(false);
        return;
      }
      
      setMessage('Verifying signature...');
      
      // Verify signature with backend
      const result = await verifySignature(signatureImage);
      
      if (result.success && result.verified) {
        setMessage('✅ Signature verified! Transaction approved.');
        setTimeout(() => {
          setShowModal(false);
          setMessage('');
          setLoading(false);
        }, 2000);
      } else {
        setMessage('❌ Signature verification failed. Please try again.');
        setLoading(false);
      }
    } catch (error) {
      setMessage('❌ Error during signature verification.');
      setLoading(false);
    }
  };

  const handleOtp = async () => {
    setLoading(true);
    setMessage('Generating OTP...');
    
    try {
      const result = await generateOtp();
      if (result.success) {
        setMessage(`OTP generated: ${result.otp_code}`);
        setShowOtpInput(true);
        setLoading(false);
      } else {
        setMessage('❌ Failed to generate OTP. Please try again.');
        setLoading(false);
      }
    } catch (error) {
      setMessage('❌ Error generating OTP.');
      setLoading(false);
    }
  };

  const handleOtpSubmit = async () => {
    if (!otpCode) {
      setMessage('Please enter OTP code.');
      return;
    }
    
    setLoading(true);
    setMessage('Verifying OTP...');
    
    try {
      const result = await verifyOtp(otpCode);
      if (result.success && result.verified) {
        setMessage('✅ OTP verified! Transaction approved.');
        setTimeout(() => {
          setShowModal(false);
          setShowOtpInput(false);
          setOtpCode('');
          setMessage('');
          setLoading(false);
        }, 2000);
      } else {
        setMessage('❌ Invalid OTP. Please try again.');
        setLoading(false);
      }
    } catch (error) {
      setMessage('❌ Error verifying OTP.');
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setShowOtpInput(false);
    setOtpCode('');
    setMessage('');
    setLoading(false);
    alert('Transaction cancelled ❌');
  };

  return (
    <div
      style={{
        fontFamily: 'sans-serif',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f9f9f9',
      }}
    >
      {/* Cart + checkout */}
      <div
        style={{
          background: '#fff',
          padding: '2rem',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          width: '350px',
        }}
      >
        <h2 style={{ marginBottom: '1rem' }}>Your Cart</h2>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <span>Example Product</span>
          <span>$49.99</span>
        </div>
        <hr />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '0.5rem',
            fontWeight: 'bold',
          }}
        >
          <span>Total</span>
          <span>${cartTotal.toFixed(2)}</span>
        </div>

        <h3 style={{ marginTop: '1.5rem' }}>Payment Details</h3>
        <label>Cardholder Name</label>
        <input type="text" placeholder="John Doe" style={inputStyle} />
        <label>Card Number</label>
        <input
          type="text"
          placeholder="1234 5678 9012 3456"
          style={inputStyle}
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label>Expiry</label>
            <input type="text" placeholder="MM/YY" style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label>CVV</label>
            <input type="text" placeholder="123" style={inputStyle} />
          </div>
        </div>
        <button
          onClick={handlePay}
          style={{
            marginTop: '1rem',
            width: '100%',
            padding: '0.75rem',
            background: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          Pay ${cartTotal.toFixed(2)}
        </button>
      </div>

      {/* Webcam feed pinned to top-right */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#fff',
          padding: '8px',
          borderRadius: '8px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{ width: '160px', borderRadius: '6px' }}
        />
        <p
          style={{
            margin: '4px 0 0 0',
            fontSize: '0.8rem',
            textAlign: 'center',
          }}
        >
          Signature Camera
        </p>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            {/* Close X button */}
            <button onClick={handleCancel} style={closeBtn} aria-label="Close">
              ✖
            </button>

            <h3>MFA Verification</h3>
            <p>Please approve this transaction using DigiSign MFA.</p>
            
            {/* Status Message */}
            {message && (
              <div style={{
                padding: '0.5rem',
                margin: '1rem 0',
                borderRadius: '4px',
                backgroundColor: message.includes('✅') ? '#d4edda' : message.includes('❌') ? '#f8d7da' : '#d1ecf1',
                color: message.includes('✅') ? '#155724' : message.includes('❌') ? '#721c24' : '#0c5460',
                fontSize: '0.9rem'
              }}>
                {message}
              </div>
            )}
            
            {/* OTP Input */}
            {showOtpInput && (
              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Enter OTP Code:
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '1rem',
                    textAlign: 'center'
                  }}
                />
                <button
                  onClick={handleOtpSubmit}
                  disabled={loading}
                  style={{
                    width: '100%',
                    marginTop: '0.5rem',
                    padding: '0.5rem',
                    background: loading ? '#ccc' : '#007bff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
              </div>
            )}
            
            {/* Action Buttons */}
            {!showOtpInput && (
              <div style={{ marginTop: '1rem', display: 'flex', gap: '10px' }}>
                <button 
                  onClick={handleDigiSign} 
                  disabled={loading}
                  style={{
                    ...approveBtn,
                    background: loading ? '#ccc' : 'green',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'Processing...' : 'DigiSign'}
                </button>
                <button 
                  onClick={handleOtp} 
                  disabled={loading}
                  style={{
                    ...cancelBtn,
                    background: loading ? '#ccc' : '#007bff',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'Processing...' : 'OTP'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '0.5rem',
  margin: '0.3rem 0 1rem 0',
  border: '1px solid #ccc',
  borderRadius: '6px',
  fontSize: '0.9rem',
};

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 9999,
};

const modalStyle = {
  position: 'relative', // allows X button to position absolutely
  background: '#fff',
  padding: '2rem',
  borderRadius: '10px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  width: '300px',
  textAlign: 'center',
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
  background: '#007bff',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
};
