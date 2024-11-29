import { useState, useContext } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { AuthContext } from "../contexts/AuthContext";

export default function LoginPage() {
  const { login, isAuthenticated } = useContext(AuthContext);

  if (isAuthenticated) {
    return <Navigate to='/dashboard' />;
  }

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for errors in any of the inputs.
    let inputError: string = '';
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
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        setError('');
        const data = await response.json();
        // Use AuthContext to mark user as logged in and store the JWT token in localStorage.
        login(data.token);
        navigate('/dashboard');
      } else {
        // Handle server response if it's not 200 range OK.
        const data = await response.json();
        if (data.err === 'ACCOUNT_NOT_VERIFIED') {
          // Save email for access in VerifyEmailPage.
          localStorage.setItem('userEmail', email);
          navigate('/verify-email');
        }
        setError(data.message || 'Server connection error, try again later...');
      }
    } catch (error) {
      // Handle fetch errors.
      setError('Server connection error, try again later...');
    }
  };

  return (
    <div className="login-page">
      <h1 className="login-page__title">Login</h1>
      
      <form className="login-page__form" onSubmit={handleLogin}>
        <div className="login-page__form-group">
          <label htmlFor="email" className="login-page__label">Email:</label>
          <input
            type="email"
            id="email"
            className="login-page__input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="login-page__form-group">
          <label htmlFor="password" className="login-page__label">Password:</label>
          <input
            type="password"
            id="password"
            className="login-page__input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <div className="login-page__error">{error}</div>}

        <button type="submit" className="login-page__button">Login</button>
      </form>
      <p>Don't have an account? <span onClick={() => navigate('/register')}>Register here.</span></p>
      <p>Forgot your password? <span onClick={() => navigate('/send-password-reset')}>Reset it here.</span></p>
    </div>
  );
};
