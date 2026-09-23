import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import './AuthPage.css';

interface DoctorOption {
  id: number;
  name: string;
  qualification: string;
  hospitalName: string;
  departmentName: string;
}

export const AuthPage: React.FC = () => {
  // ─── Active Role Tab ──────────────────────────────────────────
  const [activeRole, setActiveRole] = useState<'DOCTOR' | 'STAFF' | 'PATIENT'>('DOCTOR');

  // ─── Signup State ─────────────────────────────────────────────
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupMobile, setSignupMobile] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [signupError, setSignupError] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);

  // Doctor-specific Signup Fields
  const [availableDoctors, setAvailableDoctors] = useState<DoctorOption[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [doctorMode, setDoctorMode] = useState<'select' | 'new'>('new');
  const [docQualification, setDocQualification] = useState('MBBS, MD (Specialist)');

  // ─── Login State ──────────────────────────────────────────────
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const { signup, login } = useAuth();
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  // Load doctors list for optional claiming
  useEffect(() => {
    fetch(`${API_BASE}/api/doctors/list`)
      .then(res => res.json())
      .then(data => setAvailableDoctors(data || []))
      .catch(() => setAvailableDoctors([]));
  }, []);

  // When switching roles, reset form errors
  const handleRoleChange = (role: 'DOCTOR' | 'STAFF' | 'PATIENT') => {
    setActiveRole(role);
    setSignupError('');
    setLoginError('');
  };

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
      let finalName = signupName.trim();
      let doctorIdPayload: number | null = null;

      if (activeRole === 'DOCTOR') {
        if (doctorMode === 'select' && selectedDoctorId) {
          doctorIdPayload = selectedDoctorId;
          const chosen = availableDoctors.find(d => d.id === selectedDoctorId);
          if (chosen) finalName = chosen.name;
        }
      }

      await signup({
        fullName: finalName,
        email: signupEmail,
        mobile: signupMobile,
        password: signupPassword,
        role: activeRole,
        doctorId: doctorIdPayload,
        qualification: activeRole === 'DOCTOR' ? docQualification : undefined
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

  // Role display metadata
  const roleConfig = {
    DOCTOR: {
      label: 'Doctor',
      tabClass: 'tab-doctor',
      icon: '🩺',
      signupTitle: 'Doctor Registration',
      signupSubtitle:
        'Create your physician login to manage your clinical profile, consultations, and practice limits.',
      signupButton: 'Create Doctor Account',
      loginTitle: 'Doctor Sign In',
      loginSubtitle:
        'Sign in to access your doctor dashboard, update your profile bio, and review practice details.',
      loginButton: 'Sign In as Doctor'
    },
    STAFF: {
      label: 'Staff',
      tabClass: 'tab-staff',
      icon: '🏥',
      signupTitle: 'Staff Registration',
      signupSubtitle:
        'Create a hospital desk account to manage patient records, registrations, and appointments.',
      signupButton: 'Create Staff Account',
      loginTitle: 'Staff Sign In',
      loginSubtitle:
        'Sign in to access the patient administration console and update patient demographic files.',
      loginButton: 'Sign In as Staff'
    },
    PATIENT: {
      label: 'Patient',
      tabClass: 'tab-patient',
      icon: '👤',
      signupTitle: 'Create Account',
      signupSubtitle:
        'Join SujhavSewa to access AI-powered hospital recommendations and seamless appointment booking.',
      signupButton: 'Sign Up',
      loginTitle: 'Welcome Back',
      loginSubtitle:
        'Sign in to your account to continue booking appointments and tracking your health journey.',
      loginButton: 'Sign In'
    }
  };

  const currentCfg = roleConfig[activeRole];

  return (
    <div className="auth-page">
      {/* ═══ 3-TAB ROLE SWITCHER ═══ */}
      <div className="auth-role-tabs-wrapper">
        <nav className="auth-role-tabs" aria-label="Portal Selection">
          <button
            type="button"
            className={`auth-role-tab ${activeRole === 'DOCTOR' ? `active ${roleConfig.DOCTOR.tabClass}` : ''}`}
            onClick={() => handleRoleChange('DOCTOR')}
          >
            <span className="tab-icon">🩺</span>
            <span>Doctor Portal</span>
          </button>
          <button
            type="button"
            className={`auth-role-tab ${activeRole === 'STAFF' ? `active ${roleConfig.STAFF.tabClass}` : ''}`}
            onClick={() => handleRoleChange('STAFF')}
          >
            <span className="tab-icon">🏥</span>
            <span>Staff Portal</span>
          </button>
          <button
            type="button"
            className={`auth-role-tab ${activeRole === 'PATIENT' ? `active ${roleConfig.PATIENT.tabClass}` : ''}`}
            onClick={() => handleRoleChange('PATIENT')}
          >
            <span className="tab-icon">👤</span>
            <span>Patient Portal</span>
          </button>
        </nav>
      </div>

      {/* ═══ SPLIT AUTH CARD ═══ */}
      <div className="auth-card">
        {/* ═══ LEFT HALF — SIGNUP ═══ */}
        <div className="auth-half auth-half-signup">
          <div className="auth-divider-line" />

          <div className="auth-logo">
            <img src="/logo.png" alt="SujhavSewa Logo" className="auth-logo-img" />
          </div>

          <h2 className="auth-title">{currentCfg.signupTitle}</h2>
          <p className="auth-subtitle">{currentCfg.signupSubtitle}</p>

          {signupError && <div className="auth-error">{signupError}</div>}

          <form className="auth-form" onSubmit={handleSignup}>
            {/* Doctor onboarding mode toggle */}
            {activeRole === 'DOCTOR' && availableDoctors.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                <button
                  type="button"
                  onClick={() => setDoctorMode('new')}
                  style={{
                    flex: 1,
                    padding: '7px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-default)',
                    background: doctorMode === 'new' ? 'var(--color-primary)' : 'rgba(255,255,255,0.7)',
                    color: doctorMode === 'new' ? '#fff' : 'var(--color-text-main)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Create New Doctor Profile
                </button>
                <button
                  type="button"
                  onClick={() => setDoctorMode('select')}
                  style={{
                    flex: 1,
                    padding: '7px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-default)',
                    background: doctorMode === 'select' ? 'var(--color-primary)' : 'rgba(255,255,255,0.7)',
                    color: doctorMode === 'select' ? '#fff' : 'var(--color-text-main)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Claim Existing Profile
                </button>
              </div>
            )}

            {activeRole === 'DOCTOR' && doctorMode === 'select' ? (
              <div className="auth-field">
                <label htmlFor="select-doctor">Select Your Doctor Profile *</label>
                <select
                  id="select-doctor"
                  required
                  value={selectedDoctorId || ''}
                  onChange={e => {
                    const id = Number(e.target.value);
                    setSelectedDoctorId(id);
                    const chosen = availableDoctors.find(d => d.id === id);
                    if (chosen) setSignupName(chosen.name);
                  }}
                  style={{
                    padding: '12px 14px',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '14px',
                    color: 'var(--color-text-main)'
                  }}
                >
                  <option value="">-- Choose your existing doctor profile --</option>
                  {availableDoctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.departmentName} - {d.hospitalName})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="auth-field">
                <label htmlFor="signup-name">
                  {activeRole === 'DOCTOR' ? 'Doctor Full Name' : activeRole === 'STAFF' ? 'Staff Full Name' : 'Full Name'}
                </label>
                <input
                  id="signup-name"
                  type="text"
                  required
                  placeholder={
                    activeRole === 'DOCTOR'
                      ? 'e.g. Dr. Chitra Rajan'
                      : activeRole === 'STAFF'
                      ? 'e.g. Amit Verma (Desk Manager)'
                      : 'Enter your full name'
                  }
                  value={signupName}
                  onChange={e => setSignupName(e.target.value)}
                />
              </div>
            )}

            {activeRole === 'DOCTOR' && doctorMode === 'new' && (
              <div className="auth-field">
                <label htmlFor="doc-qual">Medical Qualification</label>
                <input
                  id="doc-qual"
                  type="text"
                  placeholder="e.g. MBBS, MD (Specialist)"
                  value={docQualification}
                  onChange={e => setDocQualification(e.target.value)}
                />
              </div>
            )}

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

            <button
              type="submit"
              className="auth-submit auth-submit-signup"
              style={
                activeRole === 'DOCTOR'
                  ? { background: 'linear-gradient(135deg, #006078 0%, #008779 100%)' }
                  : activeRole === 'STAFF'
                  ? { background: 'linear-gradient(135deg, #0b5394 0%, #3d85c6 100%)' }
                  : undefined
              }
              disabled={signupLoading}
            >
              {signupLoading ? 'Creating Account...' : currentCfg.signupButton}
            </button>
          </form>
        </div>

        {/* ═══ RIGHT HALF — LOGIN ═══ */}
        <div className="auth-half auth-half-login">
          <h2 className="auth-title">{currentCfg.loginTitle}</h2>
          <p className="auth-subtitle">{currentCfg.loginSubtitle}</p>

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

            <button
              type="submit"
              className="auth-submit"
              style={
                activeRole === 'DOCTOR'
                  ? { background: 'linear-gradient(135deg, #006078 0%, #008779 100%)' }
                  : activeRole === 'STAFF'
                  ? { background: 'linear-gradient(135deg, #0b5394 0%, #3d85c6 100%)' }
                  : undefined
              }
              disabled={loginLoading}
            >
              {loginLoading ? 'Signing In...' : currentCfg.loginButton}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
