import React, { useEffect, useRef, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import './style.css';

const stripePromise = loadStripe('pk_test_YOUR_PUBLIC_KEY'); // <-- Replace with your Stripe publishable key

function PaymentForm({ cartTotal, onPaymentSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePay = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 1️⃣ Create PaymentIntent via backend
    const res = await fetch('/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Math.round(cartTotal * 100) }), // Stripe takes cents
    });
    const { clientSecret } = await res.json();

    // 2️⃣ Confirm card payment
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement),
      },
    });

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
    } else {
      if (result.paymentIntent.status === 'succeeded') {
        onPaymentSuccess();
      }
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handlePay}>
      <h3 style={{ marginTop: '1.5rem' }}>Payment Details</h3>
      <CardElement
        options={{
          style: {
            base: { fontSize: '16px', color: '#424770', '::placeholder': { color: '#aab7c4' } },
            invalid: { color: '#9e2146' },
          },
        }}
      />
      <button
        type="submit"
        disabled={!stripe || loading}
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
        {loading ? 'Processing...' : `Pay $${cartTotal.toFixed(2)}`}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  );
}

export default function App() {
  const videoRef = useRef(null);
  const [cartTotal] = useState(49.99);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => console.error('Error accessing webcam:', err));
  }, []);

  const handlePaymentSuccess = () => {
    setShowModal(true);
  };

  const handleApprove = () => {
    setShowModal(false);
    alert('Transaction approved ✅');
  };

  const handleCancel = () => {
    setShowModal(false);
    alert('Transaction cancelled ❌');
  };

  return (
    <Elements stripe={stripePromise}>
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
            <span>${cartTotal.toFixed(2)}</span>
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

          <PaymentForm cartTotal={cartTotal} onPaymentSuccess={handlePaymentSuccess} />
        </div>

        {/* Webcam */}
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
          <video ref={videoRef} autoPlay playsInline style={{ width: '160px', borderRadius: '6px' }} />
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', textAlign: 'center' }}>Signature Camera</p>
        </div>

        {/* Modal */}
        {showModal && (
          <div style={modalOverlayStyle}>
            <div style={modalStyle}>
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
    </Elements>
  );
}

// Styles (reuse yours)
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 };
const modalStyle = { position: 'relative', background: '#fff', padding: '2rem', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', width: '300px', textAlign: 'center' };
const closeBtn = { position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#888' };
const approveBtn = { flex: 1, padding: '0.5rem', background: 'green', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' };
const cancelBtn = { flex: 1, padding: '0.5rem', background: 'red', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' };