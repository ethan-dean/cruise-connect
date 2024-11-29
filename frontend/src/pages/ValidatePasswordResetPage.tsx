import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import CountdownPopup from '../modules/countdownPopupModule/CountdownPopup'

export default function ValidatePasswordResetPage() {
  const [emailCode, setEmailCode] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [showResendButton, setShowResendButton] = useState(false);
  const [showNotVerifiedPopup, setShowNotVerifiedPopup] = useState(false);
  const navigate = useNavigate();

  // Send code to user's email.
  const sendEmailCode = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/v1/user/send-password-reset-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setError('');
      } else {
        // Handle server response if it's not 200 range OK.
        const data = await response.json();
        if (data.err === 'ACCOUNT_NOT_VERIFIED') {
          // Save email for access in VerifyEmailPage.
          localStorage.setItem('userEmail', email);
          setShowNotVerifiedPopup(true);
        }
        setError(data.message || 'Server connection error, try again later...');
      }
    } catch (error) {
      // Handle fetch errors.
      setError('Server connection error, try again later...');
    }
  }

  // Retrieve user's email from localStorage.
  useEffect(() => {
    const storedString = localStorage.getItem('userEmail');
    // If no userEmail from loginPage or registerPage, or invalid email 
    // redirect to login to input email again.
    if (!storedString || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      navigate('/send-password-reset')
      return;
    }
    setEmail(storedString);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for errors in any of the inputs.
    let inputError: string = '';
    if (/\d{6}/.test(emailCode)) {
      inputError += 'Please enter a valid code<br>';
    }
    if (/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&amp;*])[A-Za-z\d!@#$%^&amp;*]{8,50}/.test(newPassword)) {
      inputError += 'Please enter a valid password<br>';
    }
    if (inputError) {
      setError(inputError);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/v1/user/check-password-reset-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, emailCode, newPassword }),
      });

      if (response.ok) {
        setError('');
      } else {
        const data = await response.json();
        // Handle server response if it's not 200 range OK.
        if (data.err === 'ACCOUNT_NOT_VERIFIED') {
          // Save email for access in VerifyEmailPage.
          localStorage.setItem('userEmail', email);
          setShowNotVerifiedPopup(true);
        } else if (data.err === 'EMAIL_CODE_TIMEOUT') {
          setShowResendButton(true);
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
      <h1>Reset your Password</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="emailCode">Enter the code sent to your email:</label>
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
        <div>
          <label htmlFor="newPassword">Enter new password:</label>
          <input
            type="text"
            id="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            maxLength={50}
            pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&amp;*])[A-Za-z\d!@#$%^&amp;*]{8,50}$"
            placeholder="Password"
            required
          />
        </div>
        {error && <p>{error}</p>}
        <button type="submit">
          Submit
        </button>
        <p>Not seeing email? <span onClick={() => sendEmailCode}>Resend code.</span></p>
      </form>

      {/* Conditionally render the "Resend Code" button */}
      {showResendButton && (
        <div>
          <p>Your code is no longer valid. Get new code below:</p>
          <button onClick={() => sendEmailCode()}>Resend Code</button>
        </div>
      )}

      {/* Conditionally render the "Countdown Popup" in case a user is already verified */}
      {showNotVerifiedPopup && (
        <CountdownPopup
          displayText="Your account is not yet verified, being redirected to verification page..."
          countdownTimeSeconds={5} // countdown from 10 seconds
          navigateDestination="/login"
        />
      )}
    </div>
  );
};
