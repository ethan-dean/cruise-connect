import { useState, useEffect, useContext } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { AuthContext } from '../contexts/AuthContext';
import CountdownPopup from '../modules/countdownPopupModule/CountdownPopup';
import getBackendUrl from '../utils/getBackendUrl';
import '../css/ValidatePasswordResetPage.css';

export default function ValidatePasswordResetPage() {
  const { isAuthenticated } = useContext(AuthContext);

  if (isAuthenticated) {
    return <Navigate to='/dashboard' />;
  }

  const [emailCode, setEmailCode] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [emailCodeError, setEmailCodeError] = useState<string>('');
  const [newPasswordErrors, setNewPasswordErrors] = useState<string[]>([]);
  const [generalError, setGeneralError] = useState<string>('');

  const [showResendButton, setShowResendButton] = useState(false);
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
        setShowResendButton(false);
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
  }

  // Retrieve user's email from localStorage.
  useEffect(() => {
    const storedString = localStorage.getItem('userEmail');
    // If no userEmail from loginPage or registerPage, or invalid email 
    // redirect to login to input email again.
    if (!storedString || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(storedString)) {
      navigate('/send-password-reset')
      return;
    }
    setEmail(storedString);
  }, []);

  // Validation functions
  const validateEmailCode = (value: string): string => {
    if (!value.trim()) {
      return 'Code is required.';
    }
    if (!/^\d{6}$/.test(value)) {
      return 'Please enter a valid 6-digit code.';
    }
    return '';
  };
  const validateNewPassword = (value: string): string[] => {
    const errors: string[] = [];

    if (!value) {
      errors.push('Password is required.');
      return errors; // Return early if password is empty
    }

    if (value.length < 8 || value.length > 50) {
      errors.push('Password must be between 8 and 50 characters.');
    }
    if (!/[a-z]/.test(value)) {
      errors.push('Password must include at least one lowercase letter.');
    }
    if (!/[A-Z]/.test(value)) {
      errors.push('Password must include at least one uppercase letter.');
    }
    if (!/[0-9]/.test(value)) {
      errors.push('Password must include at least one number.');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
      errors.push('Password must include at least one special character.');
    }

    return errors;
  };

  // Handle input changes with validation
  const handleEmailCodeChange = (value: string) => {
    setEmailCode(value);
    setEmailCodeError(validateEmailCode(value));
  };
  const handleNewPasswordChange = (value: string) => {
    setNewPassword(value);
    setNewPasswordErrors(validateNewPassword(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset general error
    setGeneralError('');

    // Validate inputs
    const currentEmailCodeError = validateEmailCode(emailCode);
    const currentNewPasswordErrors = validateNewPassword(newPassword);

    setEmailCodeError(currentEmailCodeError);
    setNewPasswordErrors(currentNewPasswordErrors);

    // Check if there are any errors
    if (currentEmailCodeError || currentNewPasswordErrors.length > 0) {
      return;
    }

    try {
      const response = await fetch(`${getBackendUrl()}/api/v1/users/check-password-reset-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, emailCode, newPassword }),
      });

      if (response.ok) {
        setGeneralError('');
        navigate('/login');
      } else {
        const data = await response.json();
        // Handle server response if it's not 200 range OK.
        if (data.error === 'ACCOUNT_NOT_VERIFIED') {
          // Save email for access in VerifyEmailPage.
          localStorage.setItem('userEmail', email);
          setShowNotVerifiedPopup(true);
        } else if (data.error === 'EMAIL_CODE_TIMEOUT') {
          setShowResendButton(true);
        } else if (data.error === 'EMAIL_CODE_MAX_ATTEMPTS') {
          setShowResendButton(true);
        }
        setGeneralError(data.message || 'Server connection error, try again later...');
      }
    } catch (error) {
      // Handle fetch errors.
      setGeneralError('Server connection error, try again later...');
    }
  };

  return (
    <div className="password-reset-page">
      <h1 className="password-reset-page__title">Reset Your Password</h1>
      <p className="password-reset-page__info">We have sent a 6-digit code to your email!</p>
      
      <form className="password-reset-page__form" onSubmit={handleSubmit} noValidate>
        <div className="password-reset-page__form-group">
          <label htmlFor="emailCode" className="password-reset-page__label">Enter the code:</label>
          <input
            type="text"
            id="emailCode"
            className={`password-reset-page__input ${emailCodeError ? 'password-reset-page__input--error' : ''}`}
            value={emailCode}
            onChange={(e) => handleEmailCodeChange(e.target.value)}
            maxLength={6}
          />
          {emailCodeError && <div id="emailCodeError" className="password-reset-page__field-error">{emailCodeError}</div>}
        </div>

        <div className="password-reset-page__form-group">
          <label htmlFor="newPassword" className="password-reset-page__label">New Password:</label>
          <input
            type="password"
            id="newPassword"
            className={`password-reset-page__input ${newPasswordErrors.length > 0 ? 'password-reset-page__input--error' : ''}`}
            value={newPassword}
            onChange={(e) => handleNewPasswordChange(e.target.value)}
            maxLength={50}
          />
          {newPasswordErrors.length > 0 && (
            <div id="newPasswordError" className="password-reset-page__field-error">
              <ul>
                {newPasswordErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {generalError && <div className="password-reset-page__error">{generalError}</div>}

        {/* Conditionally render the "Resend Code" button or submit button*/}
        {showResendButton ? (
          <div className="password-reset-page__resend-section">
            <button className="password-reset-page__resend-button" onClick={sendEmailCode}>
              Resend Code
            </button>
          </div>
        ) : (
          <div>
            <button type="submit" className="password-reset-page__button">Submit</button>

            <p className="password-reset-page__resend">
              Not seeing the email?{' '}
              <span className="password-reset-page__resend-link" onClick={sendEmailCode}>
                Resend code.
              </span>
            </p>
          </div>
        )}
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
