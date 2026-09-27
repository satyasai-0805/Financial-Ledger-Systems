import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { setToken, clearToken } from '../api';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // { username, role, userId }
  const navigate = useNavigate();

  // Handle global 401 unauthorized events emitted from api.js interceptor
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('unauthorized', handleUnauthorized);
    };
  }, []);

  const login = (tokenStr) => {
    setToken(tokenStr);
    try {
      const decoded = jwtDecode(tokenStr);
      setUser({
        username: decoded.sub, // 'sub' typically holds the username in our JwtUtil
        role: decoded.role,
        userId: decoded.userId
      });
    } catch (e) {
      console.error("Failed to decode token", e);
      logout();
    }
  };

  const logout = () => {
    clearToken();
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
