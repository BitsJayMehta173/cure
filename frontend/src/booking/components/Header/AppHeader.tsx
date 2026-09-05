import React from 'react';
import './AppHeader.css';

interface AppHeaderProps {
  activeTab: 'recommendation' | 'booking';
  setActiveTab: (tab: 'recommendation' | 'booking') => void;
  lang: 'en' | 'hi';
  setLang: (lang: 'en' | 'hi') => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ activeTab, setActiveTab, lang, setLang }) => {
  return (
    <div className="app-header">
      <div className="app-header-left">
        <div className="logo-container">
          <span className="logo-icon">🏥</span>
          <span className="logo-text">MedRoute</span>
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
      </div>
    </div>
  );
};
