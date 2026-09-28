import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from './AuthProvider';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    
    setErrorMsg('');
    setLoading(true);
    
    try {
      const response = await api.post('/auth/login', {
        username,
        password
      });
      
      const { token } = response.data;
      login(token);
      navigate('/');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        setErrorMsg('Invalid credentials. Check your username & password.');
      } else {
        setErrorMsg('Server connection error. Please verify backend state.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fillQuickDemo = (user, pass) => {
    setUsername(user);
    setPassword(pass);
    setErrorMsg('');
  };

  return (
    <div className="neon-login-wrapper">
      {/* Background Animated Orbs */}
      <div className="neon-orb neon-orb-1"></div>
      <div className="neon-orb neon-orb-2"></div>
      <div className="neon-orb neon-orb-3"></div>

      {/* Main Glass Card */}
      <div className="neon-card">
        <div className="neon-accent-line"></div>

        {/* Header Section */}
        <div className="neon-header">
          <div className="neon-logo-badge">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h2 className="neon-title">FINANCIAL LEDGER</h2>
          <div className="neon-subtitle">SYS.AUTH // SECURE PORTAL</div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="neon-error-banner">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin}>
          <div className="neon-form-group">
            <label className="neon-label" htmlFor="username">
              <span>USER ID // IDENTIFIER</span>
            </label>
            <div className="neon-input-wrapper">
              <span className="neon-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </span>
              <input 
                type="text" 
                id="username" 
                className="neon-input"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required 
                autoComplete="username"
              />
            </div>
          </div>

          <div className="neon-form-group">
            <label className="neon-label" htmlFor="password">
              <span>ACCESS CODE // PASSWORD</span>
            </label>
            <div className="neon-input-wrapper">
              <span className="neon-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </span>
              <input 
                type={showPassword ? 'text' : 'password'}
                id="password" 
                className="neon-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                autoComplete="current-password"
              />
              <button 
                type="button" 
                className="neon-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" className="neon-btn-primary" disabled={loading}>
            {loading ? (
              <>
                <span className="neon-spinner"></span>
                <span>AUTHENTICATING...</span>
              </>
            ) : (
              <>
                <span>SIGN IN TO SYSTEM</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Demo Preset Chips */}
        <div className="neon-demo-section">
          <div className="neon-demo-header">⚡ QUICK DEMO LOGINS</div>
          <div className="neon-demo-chips">
            <button 
              type="button" 
              className="neon-demo-chip"
              onClick={() => fillQuickDemo('admin', 'admin')}
            >
              <span className="neon-demo-role">🔑 Admin Role</span>
              <span className="neon-demo-creds">admin / admin</span>
            </button>
            <button 
              type="button" 
              className="neon-demo-chip"
              onClick={() => fillQuickDemo('viewer', 'viewer')}
            >
              <span className="neon-demo-role">👁️ Viewer Role</span>
              <span className="neon-demo-creds">viewer / viewer</span>
            </button>
          </div>
        </div>

        {/* System Security Badge */}
        <div className="neon-footer-badge">
          <span className="neon-status-dot"></span>
          <span>256-BIT JWT ENCRYPTED • DOUBLE-ENTRY CORE</span>
        </div>
      </div>
    </div>
  );
};

export default Login;

