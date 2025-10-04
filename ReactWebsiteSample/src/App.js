import React, { useEffect, useRef, useState } from 'react';
import './style.css';

export default function App() {
  const videoRef = useRef(null);
  const [cartTotal] = useState(49.99); // example total
  const [showModal, setShowModal] = useState(false);

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

  // Show modal when Pay clicked
  const handlePay = () => {
    setShowModal(true);
  };

  const handleApprove = () => {
    setShowModal(false);
    alert('Transaction approved ✅'); // Replace with your PayShield success logic
  };

  const handleCancel = () => {
    setShowModal(false);
    alert('Transaction cancelled ❌'); // Replace with your PayShield cancel logic
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
            <p>Please approve this transaction using PayShield MFA.</p>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '10px' }}>
              <button onClick={handleApprove} style={approveBtn}>
                DigiSign
              </button>
              <button onClick={handleCancel} style={cancelBtn}>
                OTP
              </button>
            </div>
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
  background: 'red',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
};
