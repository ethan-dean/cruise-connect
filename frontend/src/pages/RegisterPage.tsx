import { useState, useContext } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { AuthContext } from "../contexts/AuthContext";

export default function RegisterPage() {
  const { isAuthenticated } = useContext(AuthContext);

  if (isAuthenticated) {
    return <Navigate to='/dashboard' />;
  }

  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for errors in any of the inputs.
    let inputError: string = '';
    if (/^[a-zA-Z]+([ '-][a-zA-Z]+)*$/.test(firstName)) {
      inputError += 'Please enter a valid first name (alphabetic characters, spaces, and dashes<br>';
    }
    if (/^[a-zA-Z]+([ '-][a-zA-Z]+)*$/.test(lastName)) {
      inputError += 'Please enter a valid last name (alphabetic characters, spaces, and dashes<br>';
    }
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      inputError += 'Please enter a valid email<br>';
    }
    if (/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&amp;*])[A-Za-z\d!@#$%^&amp;*]{8,50}/.test(password)) {
      inputError += 'Please enter a valid password<br>';
    }
    if (inputError) {
      setError(inputError);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/v1/user/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firstName, lastName, email, password }),
      });

      if (response.ok) {
        setError('');
        // Save email for access in VerifyEmailPage.
        localStorage.setItem('userEmail', email);
        navigate('/verify-email');
      } else {
        const data = await response.json();
        // Handle server response if it's not 200 range OK.
        setError(data.message || 'Server connection error, try again later...');
      }
    } catch (error) {
      // Handle fetch errors.
      setError('Server connection error, try again later...');
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
            className="register-page__input"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>

        <div className="register-page__form-group">
          <label htmlFor="lastName" className="register-page__label">Last Name:</label>
          <input
            type="text"
            id="lastName"
            className="register-page__input"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>

        <div className="register-page__form-group">
          <label htmlFor="email" className="register-page__label">Email:</label>
          <input
            type="email"
            id="email"
            className="register-page__input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="register-page__form-group">
          <label htmlFor="password" className="register-page__label">Password:</label>
          <input
            type="password"
            id="password"
            className="register-page__input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <div className="register-page__error">{error}</div>}

        <button type="submit" className="register-page__button">Register</button>
      </form>
      <p>Already have an account? <span onClick={() => navigate('/register')}>Login here.</span></p>
    </div>
  );
};
