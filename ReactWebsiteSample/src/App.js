import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import DigiSignPlugin from './DigiSignPlugin';

const stripePromise = loadStripe('pk_test_51SETfKIRVYdDpHLckHnhJFxFwAIRKDIILO2kGagQVpcOl9Qqek8vOzzrxP5T7lQHQKtzCBR2CEODgbmuojn2iWfd00WTThrzhQ');

function PaymentForm({ onPaymentSuccess, onPaymentError, isAuthenticated, authType, authData, amount, username, onAuthenticate }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [cardError, setCardError] = useState('');

  const handleSubmit = async () => {
    if (!stripe || !elements) return;

    setProcessing(true);
    setCardError('');

    const cardElement = elements.getElement(CardElement);
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
      billing_details: { name: username },
    });

    if (error) {
      setCardError(error.message);
      setProcessing(false);
      return;
    }

    if (!isAuthenticated) {
      setProcessing(false);
      onAuthenticate(paymentMethod);
      return;
    }

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
          { payment_method: paymentMethod.id }
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
    return (
      <div style={{ marginTop: '1.5rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: '600', color: '#e5e5e5', marginBottom: '0.75rem' }}>
            Card Information
          </label>
          <div style={{ padding: '12px', textAlign: 'center', color: '#e5e5e5' }}>
            Loading Stripe Elements...
          </div>
        </div>
        <button disabled style={{
          marginTop: '1.5rem',
          width: '100%',
          padding: '1rem 1.5rem',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '12px',
          fontSize: '1rem',
          fontWeight: '600',
          opacity: 0.5
        }}>
          Loading...
        </button>
      </div>
    );
  }
  
  return (
    <div style={{ marginTop: '1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: '600', color: '#e5e5e5', marginBottom: '0.75rem' }}>
          Card Information
        </label>
        <div style={{
          padding: '1rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          background: 'rgba(30, 30, 30, 0.8)',
          marginBottom: '1rem',
          minHeight: '50px'
        }}>
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#e5e5e5',
                  '::placeholder': { color: 'rgba(255, 255, 255, 0.4)' },
                },
                invalid: { color: '#ef4444' },
              },
            }}
          />
        </div>
        {cardError && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem', textAlign: 'center' }}>{cardError}</div>}
      </div>
      
      <button 
        onClick={handleSubmit}
        disabled={!stripe || processing}
        style={{
          marginTop: '1.5rem',
          width: '100%',
          padding: '1rem 1.5rem',
          background: isAuthenticated ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '12px',
          cursor: (!stripe || processing) ? 'not-allowed' : 'pointer',
          fontSize: '1rem',
          fontWeight: '600',
          opacity: (!stripe || processing) ? 0.5 : 1
        }}
      >
        {processing ? 'Processing...' : isAuthenticated ? `Pay $${amount.toFixed(2)}` : 'Authenticate'}
      </button>
    </div>
  );
}

export default function App() {
  const [cartTotal] = useState(49.99);
  const [showModal, setShowModal] = useState(false);
  const [showDigiSign, setShowDigiSign] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authType, setAuthType] = useState(null);
  const [authData, setAuthData] = useState(null);
  const [cardholderName, setCardholderName] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const handlePaymentSuccess = (paymentIntent) => {
    alert(`Payment successful! ✓\n\nAmount: $${(paymentIntent.amount / 100).toFixed(2)}\nPayment ID: ${paymentIntent.id}\nAuthentication: ${authType.toUpperCase()}`);
    
    setIsAuthenticated(false);
    setAuthType(null);
    setAuthData(null);
    setShowPaymentForm(false);
    setShowModal(false);
  };

  const handlePaymentError = (error) => {
    alert(`Payment failed: ${error}`);
  };

  const handleAuthenticateAfterCard = () => {
    setShowModal(true);
  };

  const processPayment = () => {
    setShowPaymentForm(true);
  };

  const handleDigiSign = () => {
    setShowModal(false);
    setShowDigiSign(true);
  };

  const handleDigiSignVerified = ({ verified, score, image }) => {
    setShowDigiSign(false);
    
    if (verified) {
      setIsAuthenticated(true);
      setAuthType('signature');
      setAuthData({ image: image, score: score });
      alert(`Signature verified! ✓\nSimilarity score: ${(score * 100).toFixed(1)}%\n\nYou can now proceed with payment.`);
    } else {
      const useOTP = confirm(`Signature verification failed ✗\nSimilarity score: ${(score * 100).toFixed(1)}%\n\nWould you like to use OTP verification instead?`);
      if (useOTP) {
        setShowOTP(true);
        setOtpSent(false);
        setOtpError('');
      }
    }
  };

  const handleDigiSignEnrolled = () => {
    setShowDigiSign(false);
    alert('Pattern enrolled successfully! ✓\n\nYou can now use DigiSign for authentication.');
  };

  const handleDigiSignCancel = () => {
    setShowDigiSign(false);
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

    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(phoneNumber.replace(/[\s\-\(\)]/g, ''))) {
      setOtpError('Please enter a valid phone number');
      return;
    }

    setOtpSent(true);
    setOtpError('');
    alert(`OTP sent to ${phoneNumber}\n\nOTP Code: 123456\n\n(For demo purposes)`);
  };

  const verifyOTP = async () => {
    if (!otpCode.trim()) {
      setOtpError('Please enter OTP code');
      return;
    }

    if (otpCode === '123456') {
      setIsAuthenticated(true);
      setAuthType('otp');
      setAuthData({ otpCode });
      
      setShowOTP(false);
      setOtpCode('');
      setOtpSent(false);
      setOtpError('');
      alert('OTP verified successfully! ✓\n\nYou can now proceed with payment.');
    } else {
      setOtpError('Invalid OTP code. Please try again.');
    }
  };

  const cancelOTP = () => {
    setShowOTP(false);
    setOtpCode('');
    setOtpSent(false);
    setOtpError('');
    setPhoneNumber('');
  };

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
      padding: '2rem',
      position: 'relative'
    }}>
      <div style={{
        background: 'rgba(20, 20, 20, 0.8)',
        padding: '2.5rem',
        borderRadius: '20px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
        maxWidth: '600px',
        width: '100%',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#e5e5e5'
      }}>
        <h2 style={{ color: '#ffffff', textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.8rem', fontWeight: '600' }}>Your Cart</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <span>Example Product</span>
          <span>${cartTotal.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', fontSize: '1.1rem', borderTop: '2px solid rgba(255, 255, 255, 0.1)', marginTop: '1rem', paddingTop: '1rem' }}>
          <span>Total</span>
          <span>${cartTotal.toFixed(2)}</span>
        </div>
        
        <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem', fontSize: '1.2rem' }}>Payment Details</h3>
        <input 
          type="text" 
          placeholder="Cardholder Name" 
          style={{
            width: '100%',
            padding: '0.875rem 1rem',
            margin: '0.5rem 0',
            background: 'rgba(30, 30, 30, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            fontSize: '0.95rem',
            color: '#e5e5e5'
          }}
          value={cardholderName} 
          onChange={(e) => setCardholderName(e.target.value)} 
        />
        <input 
          type="tel" 
          placeholder="Phone Number (for OTP)" 
          style={{
            width: '100%',
            padding: '0.875rem 1rem',
            margin: '0.5rem 0',
            background: 'rgba(30, 30, 30, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            fontSize: '0.95rem',
            color: '#e5e5e5'
          }}
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
            disabled={!cardholderName.trim()}
            style={{
              marginTop: '1.5rem',
              width: '100%',
              padding: '1rem 1.5rem',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              cursor: cardholderName.trim() ? 'pointer' : 'not-allowed',
              fontSize: '1rem',
              fontWeight: '600',
              opacity: cardholderName.trim() ? 1 : 0.6
            }}
          >
            Pay ${cartTotal.toFixed(2)}
          </button>
        )}
      </div>

      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'rgba(20, 20, 20, 0.95)',
            padding: '3rem',
            borderRadius: '20px',
            maxWidth: '600px',
            width: '98%',
            textAlign: 'center',
            position: 'relative',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <button onClick={() => setShowModal(false)} style={{
              position: 'absolute',
              top: '15px',
              right: '15px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#e5e5e5',
              cursor: 'pointer'
            }}>✕</button>
            <h3 style={{ color: '#ffffff' }}>MFA Verification</h3>
            <p style={{ color: '#e5e5e5' }}>Please approve this transaction using PayShield MFA.</p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button onClick={handleDigiSign} style={{
                flex: 1,
                padding: '0.75rem 1rem',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600'
              }}>
                DigiSign
              </button>
              <button onClick={handleOTP} style={{
                flex: 1,
                padding: '0.75rem 1rem',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600'
              }}>
                OTP
              </button>
            </div>
          </div>
        </div>
      )}

      <DigiSignPlugin
        backendUrl="http://localhost:3001"
        onVerified={handleDigiSignVerified}
        onEnrolled={handleDigiSignEnrolled}
        onCancel={handleDigiSignCancel}
        username={cardholderName.trim()}
        show={showDigiSign}
        mode="auto"
      />

      {showOTP && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'rgba(20, 20, 20, 0.95)',
            padding: '3rem',
            borderRadius: '20px',
            maxWidth: '600px',
            width: '98%',
            position: 'relative',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#e5e5e5'
          }}>
            <button onClick={cancelOTP} style={{
              position: 'absolute',
              top: '15px',
              right: '15px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#e5e5e5',
              cursor: 'pointer'
            }}>✕</button>
            <h3 style={{ color: '#ffffff', textAlign: 'center' }}>OTP Verification</h3>
            <p style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>Enter the OTP code sent to your phone number</p>
            
            <div style={{ marginTop: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Phone Number</label>
              <input 
                type="tel" 
                placeholder="+1 (555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  background: 'rgba(30, 30, 30, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: '#e5e5e5'
                }}
              />
            </div>
            
            {!otpSent ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <p style={{ marginBottom: '1.5rem' }}>Click "Send OTP" to receive a verification code via SMS</p>
                <button onClick={sendOTP} style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}>
                  Send OTP
                </button>
              </div>
            ) : (
              <div style={{ marginTop: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Enter OTP Code</label>
                <input 
                  type="text" 
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  maxLength="6"
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    background: 'rgba(30, 30, 30, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    fontSize: '1.1rem',
                    color: '#e5e5e5',
                    textAlign: 'center',
                    letterSpacing: '0.2em'
                  }}
                />
                
                {otpError && (
                  <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem', textAlign: 'center' }}>
                    {otpError}
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button onClick={sendOTP} style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}>
                    Resend OTP
                  </button>
                  <button onClick={verifyOTP} style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}>
                    Verify OTP
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
