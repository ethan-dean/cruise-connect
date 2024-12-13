import { useState, useEffect, useContext } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { AuthContext } from "../contexts/AuthContext";
import CountdownPopup from '../modules/countdownPopupModule/CountdownPopup';
import getBackendUrl from '../utils/getBackendUrl';
import '../css/VerifyEmailPage.css';

export default function VerifyEmailPage() {
  const { isAuthenticated, login } = useContext(AuthContext);

  if (isAuthenticated) {
    return <Navigate to='/dashboard' />;
  }

  const [emailCode, setEmailCode] = useState('');
  const [email, setEmail] = useState('');

  const [emailCodeError, setEmailCodeError] = useState<string>('');
  const [generalError, setGeneralError] = useState<string>('');

  const [showResendButton, setShowResendButton] = useState(false);
  const [showAlreadyVerifiedPopup, setShowAlreadyVerifiedPopup] = useState(false);

  const navigate = useNavigate();

  // Send code to user's email.
  const sendEmailCode = async ({ destinationEmail = email, forceResend = false }: { destinationEmail?: string, forceResend?: boolean}) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/v1/users/send-verification-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: destinationEmail, forceResend: forceResend }),
      });

      if (response.ok) {
        setGeneralError('');
        setShowResendButton(false); // Hide the "Resend" button after successful send if visible.
      } else {
        // Handle server response if it's not 200 range OK.
        const data = await response.json();
        if (data.error === 'ACCOUNT_ALREADY_VERIFIED') {
          setShowAlreadyVerifiedPopup(true);
        }
        setGeneralError(data.message || 'Server connection error, try again later...');
      }
    } catch (error) {
      // Handle fetch errors.
      setGeneralError('Server connection error, try again later...');
    }
  };

  // Retrieve user's email from localStorage and send code to user's email.
  useEffect(() => {
    const storedString: string = localStorage.getItem('userEmail') || '';
    console.log(storedString);
    // If no userEmail from loginPage or registerPage, or invalid email 
    // redirect to login to input email again.
    if (!storedString || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(storedString)) {
      navigate('/login')
      return;
    }
    setEmail(storedString);
    sendEmailCode({ destinationEmail: storedString });
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

  // Handle input changes with validation
  const handleEmailCodeChange = (value: string) => {
    setEmailCode(value);
    setEmailCodeError(validateEmailCode(value));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    
    // Reset general error
    setGeneralError('');

    // Validate inputs
    const currentEmailCodeError = validateEmailCode(emailCode);

    setEmailCodeError(currentEmailCodeError);

    // Check if there are any errors
    if (currentEmailCodeError) {
      return;
    }

    try {
      const response = await fetch(`${getBackendUrl()}/api/v1/users/check-verification-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, emailCode }),
      });

      if (response.ok) {
        const data = await response.json();
        // Use AuthContext to mark user as logged in and store the JWT token in localStorage.
        login(data.token);
        navigate('/dashboard');
      } else {
        // Handle server response if it's not 200 range OK.
        const data = await response.json();
        if (data.error === 'EMAIL_CODE_TIMEOUT') {
          setShowResendButton(true);
        } else if (data.error === 'ACCOUNT_ALREADY_VERIFIED') {
          setShowAlreadyVerifiedPopup(true);
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
    <div className="verify-email-page">
      <h1 className="verify-email-page__title">Verify Your Email</h1>
      <p className="verify-email-page__info">We have sent a 6-digit code to your email!</p>
      
      <form className="verify-email-page__form" onSubmit={handleSubmit} noValidate>
        <div className="verify-email-page__form-group">
          <label htmlFor="emailCode" className="verify-email-page__label">Enter the code:</label>
          <input
            type="text"
            id="emailCode"
            className={`verify-email-page__input ${emailCodeError ? 'verify-email-page__input--error' : ''}`}
            value={emailCode}
            onChange={(e) => handleEmailCodeChange(e.target.value)}
            maxLength={6}
          />
          {emailCodeError && (
            <div id="emailCodeError" className="verify-email-page__field-error">
              {emailCodeError}
            </div>
          )}
        </div>

        {generalError && <div className="verify-email-page__error">{generalError}</div>}

        {/* Conditionally render the "Resend Code" button or submit button */}
        {showResendButton ? (
          <div className="verify-email-page__resend-section">
            <button
              type="button"
              className="verify-email-page__button"
              onClick={() => sendEmailCode({ forceResend: true })}
            >
              Resend Code
            </button>
          </div>
        ) : (
          <div className="verify-email-page__submit-section">
            <button type="submit" className="verify-email-page__button">
              Submit
            </button>
            <p className="verify-email-page__resend">
              Not seeing the email?{' '}
              <span
                className="verify-email-page__resend-link"
                onClick={() => sendEmailCode({ forceResend: true })}
              >
                Resend code.
              </span>
            </p>
          </div>
        )}
      </form>

      {/* Conditionally render the "Countdown Popup" in case a user is already verified */}
      {showAlreadyVerifiedPopup && (
        <CountdownPopup
          displayText="Your account is already verified, being redirected to login page..."
          countdownTimeSeconds={5} // countdown from 5 seconds
          navigateDestination="/login"
        />
      )}
    </div>
  );
};
