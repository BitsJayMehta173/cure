import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import './AuthPage.css';

export const AuthPage: React.FC = () => {
  // ─── Signup State ─────────────────────────────────────────────
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupMobile, setSignupMobile] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [signupError, setSignupError] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);

  // ─── Login State ──────────────────────────────────────────────
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const { signup, login } = useAuth();

  // ─── Signup Handler ───────────────────────────────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');

    if (signupPassword !== signupConfirm) {
      setSignupError('Passwords do not match');
      return;
    }
    if (signupPassword.length < 4) {
      setSignupError('Password must be at least 4 characters');
      return;
    }

    setSignupLoading(true);
    try {
      await signup({
        fullName: signupName,
        email: signupEmail,
        mobile: signupMobile,
        password: signupPassword
      });
    } catch (err: any) {
      setSignupError(err.message || 'Signup failed. Please try again.');
    } finally {
      setSignupLoading(false);
    }
  };

  // ─── Login Handler ────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      await login(loginEmail, loginPassword);
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* ═══ LEFT HALF — SIGNUP ═══ */}
        <div className="auth-half auth-half-signup">
          <div className="auth-divider-line" />

          <div className="auth-logo">
            <img src="/logo.png" alt="SujhavSewa Logo" className="auth-logo-img" />
          </div>

          <h2 className="auth-title">Create Account</h2>
          <p className="auth-subtitle">
            Join SujhavSewa to access AI-powered hospital recommendations and seamless appointment booking.
          </p>

          {signupError && <div className="auth-error">{signupError}</div>}

          <form className="auth-form" onSubmit={handleSignup}>
            <div className="auth-field">
              <label htmlFor="signup-name">Full Name</label>
              <input
                id="signup-name"
                type="text"
                required
                placeholder="Enter your full name"
                value={signupName}
                onChange={e => setSignupName(e.target.value)}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="signup-email">Email Address</label>
              <input
                id="signup-email"
                type="email"
                required
                placeholder="you@example.com"
                value={signupEmail}
                onChange={e => setSignupEmail(e.target.value)}
              />
            </div>

            <div className="auth-row">
              <div className="auth-field">
                <label htmlFor="signup-mobile">Mobile Number</label>
                <input
                  id="signup-mobile"
                  type="text"
                  required
                  pattern="[0-9]{10}"
                  placeholder="10 digits"
                  value={signupMobile}
                  onChange={e => setSignupMobile(e.target.value)}
                />
              </div>
              <div className="auth-field">
                <label htmlFor="signup-password">Password</label>
                <input
                  id="signup-password"
                  type="password"
                  required
                  placeholder="Min 4 chars"
                  value={signupPassword}
                  onChange={e => setSignupPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="signup-confirm">Confirm Password</label>
              <input
                id="signup-confirm"
                type="password"
                required
                placeholder="Re-enter password"
                value={signupConfirm}
                onChange={e => setSignupConfirm(e.target.value)}
              />
            </div>

            <button type="submit" className="auth-submit auth-submit-signup" disabled={signupLoading}>
              {signupLoading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>
        </div>

        {/* ═══ RIGHT HALF — LOGIN ═══ */}
        <div className="auth-half auth-half-login">
          <h2 className="auth-title">Welcome Back</h2>
          <p className="auth-subtitle">
            Sign in to your account to continue booking appointments and tracking your health journey.
          </p>

          {loginError && <div className="auth-error">{loginError}</div>}

          <form className="auth-form" onSubmit={handleLogin}>
            <div className="auth-field">
              <label htmlFor="login-email">Email Address</label>
              <input
                id="login-email"
                type="email"
                required
                placeholder="you@example.com"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                required
                placeholder="Enter your password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="auth-submit" disabled={loginLoading}>
              {loginLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
