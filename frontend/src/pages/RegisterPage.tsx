import { useState, useContext } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";

import { AuthContext } from "../contexts/AuthContext";
import getBackendUrl from '../utils/getBackendUrl';
import '../css/RegisterPage.css';

export default function RegisterPage() {
  const { isAuthenticated } = useContext(AuthContext);

  if (isAuthenticated) {
    return <Navigate to='/dashboard' />;
  }

  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const [firstNameError, setFirstNameError] = useState<string>('');
  const [lastNameError, setLastNameError] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [generalError, setGeneralError] = useState<string>('');

  const navigate = useNavigate();

  // Validation functions
  const validateFirstName = (value: string): string => {
    if (!value.trim()) {
      return 'First name is required.';
    } else if (value.length > 50) {
      return 'First name can\'t be over 50 characters.';
    }
    return '';
  };
  const validateLastName = (value: string): string => {
    if (!value.trim()) {
      return 'Last name is required.';
    } else if (value.length > 50) {
      return 'Last name can\'t be over 50 characters.';
    }
    return '';
  };
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
  const validatePassword = (value: string): string[] => {
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
  const handleFirstNameChange = (value: string) => {
    setFirstName(value);
    setFirstNameError(validateFirstName(value));
  };
  const handleLastNameChange = (value: string) => {
    setLastName(value);
    setLastNameError(validateLastName(value));
  };
  const handleEmailChange = (value: string) => {
    setEmail(value);
    setEmailError(validateEmail(value));
  };
  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordErrors(validatePassword(value));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Final validation before submission
    const fNameError = validateFirstName(firstName);
    const lNameError = validateLastName(lastName);
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);

    setFirstNameError(fNameError);
    setLastNameError(lNameError);
    setEmailError(emailErr);
    setPasswordErrors(passwordErr);

    if (fNameError || lNameError || emailErr || passwordErr.length < 0) {
      return;
    }

    try {
      const response = await fetch(`${getBackendUrl()}/api/v1/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firstName, lastName, email, password }),
      });

      if (response.ok) {
        // Save email for access in VerifyEmailPage.
        localStorage.setItem('userEmail', email);
        navigate('/verify-email');
      } else {
        const data = await response.json();
        // Handle server response if it's not 200 range OK.
        setGeneralError(data.message || 'Server connection error, try again later...');
      }
    } catch (error) {
      // Handle fetch errors.
      setGeneralError('Server connection error, try again later...');
    }
  };

  return (
    <div className="register-page">
      <h1 className="register-page__title">Register</h1>
      
      <form className="register-page__form" onSubmit={handleRegister}>
        <div className="register-page__form-group">
          <label htmlFor="firstName" className="register-page__label">First Name:</label>
          <input
            type="text"
            id="firstName"
            className={`register-page__input ${firstNameError ? 'register-page__input--error' : ''}`}
            value={firstName}
            onChange={(e) => handleFirstNameChange(e.target.value)}
            maxLength={50}
          />
          {firstNameError && <div className="register-page__field-error">{firstNameError}</div>}
        </div>

        <div className="register-page__form-group">
          <label htmlFor="lastName" className="register-page__label">Last Name:</label>
          <input
            type="text"
            id="lastName"
            className={`register-page__input ${lastNameError ? 'register-page__input--error' : ''}`}
            value={lastName}
            onChange={(e) => handleLastNameChange(e.target.value)}
            maxLength={50}
          />
          {lastNameError && <div className="register-page__field-error">{lastNameError}</div>}
        </div>

        <div className="register-page__form-group">
          <label htmlFor="email" className="register-page__label">Email:</label>
          <input
            type="text"
            id="email"
            className={`register-page__input ${emailError ? 'register-page__input--error' : ''}`}
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            maxLength={50}
          />
          {emailError && <div className="register-page__field-error">{emailError}</div>}
        </div>

        <div className="register-page__form-group">
          <label htmlFor="password" className="register-page__label">Password:</label>
          <input
            type="password"
            id="password"
            className={`register-page__input ${passwordErrors.length > 0 ? 'register-page__input--error' : ''}`}
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            maxLength={50}
          />
          {passwordErrors.length > 0 && (
            <div className="register-page__field-error">
              <ul>
                {passwordErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {generalError && <div className="register-page__field-error">{generalError}</div>}
        <button type="submit" className="register-page__button">Register</button>
      </form>
      <p>Already have an account? <Link to='/login'>Login here.</Link></p>
    </div>
  );
};
