import { useState, useContext } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { AuthContext } from '../contexts/AuthContext';
import CountdownPopup from '../modules/countdownPopupModule/CountdownPopup';
import getBackendUrl from '../utils/getBackendUrl';
import '../css/SendPasswordResetPage.css';

export default function SendPasswordResetPage() {
  const { isAuthenticated } = useContext(AuthContext);

  if (isAuthenticated) {
    return <Navigate to='/dashboard' />;
  }

  const [email, setEmail] = useState('');

  const [emailError, setEmailError] = useState<string>('');
  const [generalError, setGeneralError] = useState<string>('');

  const [showNotVerifiedPopup, setShowNotVerifiedPopup] = useState(false);

  const navigate = useNavigate();

  // Send code to user's email.
  const sendEmailCode = async () => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/v1/users/send-password-reset-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setGeneralError('');
        // Save email for access in ValidatePasswordResetPage.
        localStorage.setItem('userEmail', email);
        navigate('/validate-password-reset')
      } else {
        // Handle server response if it's not 200 range OK.
        const data = await response.json();
        if (data.error === 'ACCOUNT_NOT_VERIFIED') {
          // Save email for access in VerifyEmailPage.
          localStorage.setItem('userEmail', email);
          setShowNotVerifiedPopup(true);
        }
        setGeneralError(data.message || 'Server connection error, try again later...');
      }
    } catch (error) {
      // Handle fetch errors.
      setGeneralError('Server connection error, try again later...');
    }
  };

  // Validation functions
  const validateEmail = (value: string): string => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value.trim()) {
      return 'Email is required.';
    } else if (!emailRegex.test(value)) {
      return 'Please enter a valid email address.';
    } else if (value.length > 50) {
      return 'Email can\'t be over 50 characters.';
    }
    return '';
  };

  // Handle input changes with validation
  const handleEmailChange = (value: string) => {
    setEmail(value);
    setEmailError(validateEmail(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Final validation before submission
    const emailErr = validateEmail(email);

    setEmailError(emailErr);

    if (emailErr) {
      return;
    }

    sendEmailCode();
  };
  return (
    <div className="send-password-reset-page">
      <h1 className="send-password-reset-page__title">Reset your Password</h1>
      <form className="send-password-reset-page__form" onSubmit={handleSubmit} noValidate>
        <div className="send-password-reset-page__form-group">
          <label htmlFor="email" className="send-password-reset-page__label">Enter the email of your account:</label>
          <input
            type="email"
            id="email"
            className={`send-password-reset-page__input ${emailError ? 'send-password-reset-page__input--error' : ''}`}
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            maxLength={60}
          />
          {emailError && <div id="emailError" className="send-password-reset-page__field-error">{emailError}</div>}
        </div>

        {generalError && <p className="send-password-reset-page__error">{generalError}</p>}

        <button type="submit" className="send-password-reset-page__button">Submit</button>
      </form>

      {/* Conditionally render the "Countdown Popup" in case a user is already verified */}
      {showNotVerifiedPopup && (
        <CountdownPopup
          displayText="Your account is not yet verified, being redirected to verification page..."
          countdownTimeSeconds={5} // countdown from 5 seconds
          navigateDestination="/verify-email"
        />
      )}
    </div>
  );
};
