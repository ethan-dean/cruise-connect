import { useState, useEffect, useContext } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { AuthContext } from "../contexts/AuthContext";

import CountdownPopup from '../modules/countdownPopupModule/CountdownPopup'

export default function VerifyEmailPage() {
  const { isAuthenticated } = useContext(AuthContext);

  if (isAuthenticated) {
    return <Navigate to='/dashboard' />;
  }

  const [emailCode, setEmailCode] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [showResendButton, setShowResendButton] = useState(false);
  const [showAlreadyVerifiedPopup, setShowAlreadyVerifiedPopup] = useState(false);
  const navigate = useNavigate();

  // Send code to user's email.
  const sendEmailCode = async (forceResend: boolean = false) => {
    try {
      const response = await fetch('http://localhost:5000/api/v1/user/send-verification-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, forceResend }),
      });

      if (response.ok) {
        setError('');
        setShowResendButton(false); // Hide the "Resend" button after successful send if visible.
      } else {
        // Handle server response if it's not 200 range OK.
        const data = await response.json();
        if (data.err === 'ACCOUNT_ALREADY_VERIFIED') {
          setShowAlreadyVerifiedPopup(true);
        }
        setError(data.message || 'Server connection error, try again later...');
      }
    } catch (error) {
      // Handle fetch errors.
      setError('Server connection error, try again later...');
    }
  };

  // Retrieve user's email from localStorage and send code to user's email.
  useEffect(() => {
    const storedString = localStorage.getItem('userEmail');
    // If no userEmail from loginPage or registerPage, or invalid email 
    // redirect to login to input email again.
    if (!storedString || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      navigate('/login')
      return;
    }
    setEmail(storedString);
    sendEmailCode();
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    
    // If the code is not exactly 6 digits, show an error.
    if (!/^\d{6}$/.test(emailCode)) {
      setError('Please enter a valid 6-digit code.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/v1/user/check-verification-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, emailCode }),
      });

      if (response.ok) {
        navigate('/login');
      } else {
        // Handle server response if it's not 200 range OK.
        const data = await response.json();
        if (data.err === 'EMAIL_CODE_TIMEOUT') {
          setShowResendButton(true);
        } else if (data.err === 'ACCOUNT_ALREADY_VERIFIED') {
          setShowAlreadyVerifiedPopup(true);
        } else if (data.err === 'EMAIL_CODE_MAX_ATTEMPTS') {
          setShowResendButton(true);
        }
        setError(data.message || 'Server connection error, try again later...');
      }
    } catch (error) {
      // Handle fetch errors.
      setError('Server connection error, try again later...');
    }
  };

  return (
    <div>
      <h1>Verify Your Email</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="emailCode">Enter the 6-digit code sent to your email:</label>
          <input
            type="text"
            id="emailCode"
            value={emailCode}
            onChange={(e) => setEmailCode(e.target.value)}
            maxLength={6}
            pattern="\d{6}"
            placeholder="123456"
            required
          />
        </div>
        {error && <p>{error}</p>}
        <button type="submit">
          Submit
        </button>
        <p>Not seeing email? <span onClick={() => sendEmailCode(true)}>Resend code.</span></p>
      </form>

      {/* Conditionally render the "Resend Code" button */}
      {showResendButton && (
        <div>
          <p>Your code is no longer valid. Get new code below:</p>
          <button onClick={() => sendEmailCode(true)}>Resend Code</button>
        </div>
      )}

      {/* Conditionally render the "Countdown Popup" in case a user is already verified */}
      {showAlreadyVerifiedPopup && (
        <CountdownPopup
          displayText="Your account is already verified, being redirected to login page..."
          countdownTimeSeconds={5} // countdown from 10 seconds
          navigateDestination="/login"
        />
      )}

    </div>
  );
};
