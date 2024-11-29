import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import CountdownPopup from '../modules/countdownPopupModule/CountdownPopup'

export default function SendPasswordResetPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
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
        // Save email for access in ValidatePasswordResetPage.
        localStorage.setItem('userEmail', email);
        navigate('/validate-password-reset')
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for errors in any of the inputs.
    let inputError: string = '';
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      inputError += 'Please enter a valid email<br>';
    }
    if (inputError) {
      setError(inputError);
      return;
    }

    sendEmailCode();
  };

  return (
    <div>
      <h1>Reset your Password</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Enter the email of your account:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={60}
            pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
            placeholder="example@mail.com"
            required
          />
        </div>
        {error && <p>{error}</p>}
        <button type="submit">
          Submit
        </button>
      </form>

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
