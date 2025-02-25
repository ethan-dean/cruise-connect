import React, { createContext, useState, useEffect, ReactNode } from 'react';

// Define the AuthContext type
interface AuthContextType {
  isAuthenticated: boolean | null;
  login: (token: string) => void;
  logout: () => void;
}

// Create AuthContext with default values
export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: null,
  login: () => {},
  logout: () => {},
});

// Provider component for AuthContext
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check if there's a valid JWT in local storage
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  // Function to log in (store token and set authentication state)
  const login = (token: string) => {
    localStorage.setItem('accessToken', token);
    setIsAuthenticated(true);
  };

  // Function to log out (remove token and reset authentication state)
  const logout = () => {
    localStorage.removeItem('accessToken');
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
