import { useState, useContext } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { AuthContext } from "../contexts/AuthContext";

export default function RegisterPage() {
  const { login, isAuthenticated } = useContext(AuthContext);

  if (isAuthenticated) {
    return <Navigate to='/dashboard' />;
  }

  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // TODO: register function (replace with real registration logic)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (firstName && lastName && email && password) {
      login('temp-jwt-token');
      navigate('/dashboard');
    } else {
      setError('Please fill out all fields');
    }
  };

  return (
    <div className="register-page">
      <h1 className="register-page__title">Register</h1>
      {error && <div className="register-page__error">{error}</div>}
      
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

        <button type="submit" className="register-page__button">Register</button>
      </form>
    </div>
  );
};
