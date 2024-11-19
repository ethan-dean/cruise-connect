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

  // TODO: login function (replace with real authentication logic)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (email === 'user@example.com' && password === 'password123') {
      login('temp-jwt-token');
      navigate('/dashboard');
    } else {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="login-page">
      <h1 className="login-page__title">Login</h1>
      {error && <div className="login-page__error">{error}</div>}
      
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

        <button type="submit" className="login-page__button">Login</button>
      </form>
    </div>
  );
};
