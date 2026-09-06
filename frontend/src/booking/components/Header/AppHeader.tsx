import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../auth/AuthContext';
import './AppHeader.css';

interface AppHeaderProps {
  activeTab: 'recommendation' | 'booking';
  setActiveTab: (tab: 'recommendation' | 'booking') => void;
  lang: 'en' | 'hi';
  setLang: (lang: 'en' | 'hi') => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ activeTab, setActiveTab, lang, setLang }) => {
  const { user, logout, updateProfile } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Edit profile state
  const [editName, setEditName] = useState(user?.fullName || '');
  const [editMobile, setEditMobile] = useState(user?.mobile || '');

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEditProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({ fullName: editName, mobile: editMobile });
      setShowEditProfile(false);
      setShowDropdown(false);
      alert('Profile updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  return (
    <>
      <div className="app-header">
        <div className="app-header-left">
          <div className="logo-container" onClick={() => setActiveTab('recommendation')}>
            <img src="/logo.png" alt="SujhavSewa Logo" className="app-logo-img" />
          </div>
        </div>

        <div className="app-header-center">
          <button
            className={`tab-btn ${activeTab === 'recommendation' ? 'active' : ''}`}
            onClick={() => setActiveTab('recommendation')}
          >
            Recommendation
          </button>
          <button
            className={`tab-btn ${activeTab === 'booking' ? 'active' : ''}`}
            onClick={() => setActiveTab('booking')}
          >
            Booking (v2.0)
          </button>
        </div>

        <div className="app-header-right">
          <div className="lang-toggle">
            <button
              className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
              onClick={() => setLang('en')}
            >
              English
            </button>
            <button
              className={`lang-btn ${lang === 'hi' ? 'active' : ''}`}
              onClick={() => setLang('hi')}
            >
              हिंदी
            </button>
          </div>
          
          {user && (
            <div className="profile-menu-container" ref={dropdownRef}>
              <button 
                className="profile-avatar-btn" 
                onClick={() => setShowDropdown(!showDropdown)}
              >
                {getInitials(user.fullName)}
              </button>
              
              {showDropdown && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-header">
                    <strong>{user.fullName}</strong>
                    <span>{user.email}</span>
                  </div>
                  <div className="profile-dropdown-actions">
                    <button onClick={() => setShowEditProfile(true)}>✏️ Edit Profile</button>
                    <button onClick={() => { setShowDropdown(false); logout(); }} className="logout-btn">
                      🚪 Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Edit Profile</h2>
            <form onSubmit={handleEditProfileSubmit} className="triage-form" style={{marginTop: '20px'}}>
              <div className="auth-field" style={{marginBottom: '16px'}}>
                <label>Full Name</label>
                <input 
                  type="text" 
                  required 
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-default)'}}
                />
              </div>
              <div className="auth-field" style={{marginBottom: '24px'}}>
                <label>Mobile Number</label>
                <input 
                  type="text" 
                  pattern="[0-9]{10}"
                  value={editMobile}
                  onChange={e => setEditMobile(e.target.value)}
                  style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-default)'}}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="header-btn cancel-btn" style={{flex: 1}} onClick={() => setShowEditProfile(false)}>
                  Cancel
                </button>
                <button type="submit" className="header-btn" style={{flex: 1}}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
