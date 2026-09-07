import React, { useState, useEffect, useRef } from 'react';
import './DoctorDirectory.css';
import { bookingApi } from '../../api/bookingApi';
import type { DoctorSearchResult, DoctorProfile } from '../../types/booking.types';
import { DoctorCard } from './DoctorCard';
import { DoctorProfilePage } from '../../../pages/DoctorProfilePage';

interface DoctorDirectoryProps {
  onBookAppointment: (doctor: DoctorProfile) => void;
}

type View = 'search' | 'profile';

export const DoctorDirectory: React.FC<DoctorDirectoryProps> = ({ onBookAppointment }) => {
  const [view, setView] = useState<View>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DoctorSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);

  const slideToTop = () => {
    if (searchBarRef.current) {
      searchBarRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const rect = searchBarRef.current.getBoundingClientRect();
      const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
      const targetY = currentScroll + rect.top - 28;
      window.scrollTo({
        top: Math.max(0, targetY),
        behavior: 'smooth'
      });
    }
  };

  // Real-time search with 300ms debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setResults([]);
      setHasSearched(false);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await bookingApi.searchDoctors(trimmed, 12);
        setResults(data);
        setHasSearched(true);
      } catch (e) {
        console.error(e);
        setError('Could not reach the server. Make sure the backend is running on port 8080.');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleCardClick = async (doctor: DoctorSearchResult) => {
    setProfileLoading(true);
    setError(null);
    try {
      const profile = await bookingApi.getDoctorProfile(doctor.id);
      setSelectedDoctor(profile);
      setView('profile');
    } catch (e) {
      console.error(e);
      setError('Failed to load doctor profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleBackToSearch = () => {
    setSelectedDoctor(null);
    setView('search');
  };

  // ── Profile view ───────────────────────────────────────────────────
  if (view === 'profile' && selectedDoctor) {
    return (
      <DoctorProfilePage
        doctor={selectedDoctor}
        onBack={handleBackToSearch}
        onBookAppointment={onBookAppointment}
      />
    );
  }

  if (profileLoading) {
    return <div className="doctor-directory-loading">Loading doctor profile...</div>;
  }

  // ── Search view ────────────────────────────────────────────────────
  return (
    <div className="doctor-directory">
      {/* Glass Sphere Structure UI (Search Section Centered) */}
      <div className="glass-sphere-wrapper">
        {/* Ambient glow orbs behind the glass sphere for refraction */}
        <div className="sphere-ambient-glow glow-teal"></div>
        <div className="sphere-ambient-glow glow-mint"></div>

        <div className="glass-sphere">
          {/* Top specular reflection and rim lighting */}
          <div className="glass-sphere-specular"></div>
          <div className="glass-sphere-rim-light"></div>

          {/* Sphere Center Content */}
          <div className="glass-sphere-content">
            <div className="sphere-badge">
              <span className="sphere-badge-icon">🩺</span>
              <span>Doctor Directory</span>
            </div>

            <h2 className="glass-sphere-title">Find a Doctor</h2>
            <p className="glass-sphere-subtitle">
              Search by name — we handle typos and partial matches.
            </p>

            <div
              className="glass-sphere-search"
              ref={searchBarRef}
              onClick={slideToTop}
            >
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search by doctor name..."
                value={query}
                onFocus={slideToTop}
                onClick={slideToTop}
                onChange={(e) => {
                  setQuery(e.target.value);
                  slideToTop();
                }}
              />
              {query && (
                <button
                  className="search-clear"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuery('');
                  }}
                  aria-label="Clear"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && <div className="directory-error">⚠️ {error}</div>}

      {/* Directory Results Area */}
      <div className="directory-results">
        {loading ? (
          <div className="directory-status">
            <div className="spinner" /> Searching for "{query}"...
          </div>
        ) : !hasSearched ? null : results.length === 0 ? (
          <div className="directory-status empty">
            <div className="empty-icon">😔</div>
            <h3>No results for "{query}"</h3>
            <p>Try a different spelling or doctor name</p>
          </div>
        ) : (
          <>
            <div className="results-count">
              {results.length} result{results.length === 1 ? '' : 's'} found
            </div>
            <div className="doctor-grid">
              {results.map((d) => (
                <DoctorCard key={d.id} doctor={d} onClick={handleCardClick} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
