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
      <div className="directory-header">
        <h2>🩺 Doctor Directory</h2>
        <p>Search for any doctor by name — handles typos and partial matches.</p>
      </div>

      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder="Try 'Rahul', 'Jain', or 'jainn'..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {query && (
          <button className="search-clear" onClick={() => setQuery('')} aria-label="Clear">×</button>
        )}
      </div>

      {error && <div className="directory-error">⚠️ {error}</div>}

      <div className="directory-results">
        {loading ? (
          <div className="directory-status">
            <div className="spinner" /> Searching for "{query}"...
          </div>
        ) : !hasSearched ? (
          <div className="directory-status empty">
            <div className="empty-icon">👨‍⚕️</div>
            <h3>Start typing to search</h3>
            <p>Try names like "Rahul", "Kavita", "Jain" — even partial or misspelled.</p>
          </div>
        ) : results.length === 0 ? (
          <div className="directory-status empty">
            <div className="empty-icon">🔎</div>
            <h3>No doctors found for "{query}"</h3>
            <p>Try a different name, or check the spelling.</p>
          </div>
        ) : (
          <>
            <div className="results-count">
              {results.length} doctor{results.length === 1 ? '' : 's'} matching "{query}"
            </div>
            <div className="doctor-grid">
              {results.map(d => (
                <DoctorCard key={d.id} doctor={d} onClick={handleCardClick} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
