import { useState, useContext } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";

import { AuthContext } from "../contexts/AuthContext";
import CountdownPopup from '../modules/countdownPopupModule/CountdownPopup';
import getBackendUrl from '../utils/getBackendUrl';
import '../css/LoginPage.css';

export default function LoginPage() {
  const { login, isAuthenticated } = useContext(AuthContext);

  if (isAuthenticated) {
    return <Navigate to='/dashboard' />;
  }

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const [emailError, setEmailError] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [generalError, setGeneralError] = useState<string>('');

  const [showNotVerifiedPopup, setShowNotVerifiedPopup] = useState(false);

  const navigate = useNavigate();

  // Validation functions
  const validateEmail = (value: string): string => {
    if (!value.trim()) {
      return 'Email is required.';
    } else if (value.length > 50) {
      return 'Email can\'t be over 50 characters.';
    }
    return '';
  };
  const validatePassword = (value: string): string => {
    if (!value) {
      return 'Password is required.';
    } else if (value.length > 50) {
      return 'Password can\'t be over 50 characters.';
    }
    return '';
  };

  // Handle input changes with validation
  const handleEmailChange = (value: string) => {
    setEmail(value);
    setEmailError(validateEmail(value));
  };
  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordError(validatePassword(value));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Final validation before submission
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);

    setEmailError(emailErr);
    setPasswordError(passwordErr);

    if (emailErr || passwordErr) {
      return;
    }

    try {
      const response = await fetch(`${getBackendUrl()}/api/v1/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        // Use AuthContext to mark user as logged in and store the JWT token in localStorage.
        login(data.accessToken);
        navigate('/dashboard');
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

  return (
    <div className="login-page">
      <h1 className="login-page__title">Login</h1>
      
      <form className="login-page__form" onSubmit={handleLogin} noValidate>
        <div className="login-page__form-group">
          <label htmlFor="email" className="login-page__label">Email:</label>
          <input
            type="email"
            id="email"
            className={`login-page__input ${emailError ? 'login-page__input--error' : ''}`}
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            maxLength={50}
          />
          {emailError && <div id="emailError" className="login-page__field-error">{emailError}</div>}
        </div>

        <div className="login-page__form-group">
          <label htmlFor="password" className="login-page__label">Password:</label>
          <input
            type="password"
            id="password"
            className={`login-page__input ${passwordError ? 'login-page__input--error' : ''}`}
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            maxLength={50}
          />
          {passwordError && <div id="passwordError" className="login-page__field-error">{passwordError}</div>}
        </div>

        {generalError && <div className="login-page__error">{generalError}</div>}

        <button type="submit" className="login-page__button">Login</button>
      </form>
      <p className="login-page__info">Don't have an account? <Link to='/register' className="login-page__link">Register here.</Link></p>
      <p className="login-page__info">Forgot your password? <Link to='/send-password-reset' className="login-page__link">Reset it here.</Link></p>

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
