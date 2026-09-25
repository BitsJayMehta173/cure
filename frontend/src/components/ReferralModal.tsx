import React, { useState, useEffect } from 'react';
import './ReferralModal.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface ReferralModalProps {
  patientId: number;
  patientName: string;
  currentDoctorId: number;
  appointmentId: number | null;
  onClose: () => void;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({ 
  patientId, patientName, currentDoctorId, appointmentId, onClose 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Debounced Search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`${API_BASE}/api/doctor-portal/doctors/search?q=${encodeURIComponent(searchQuery)}`)
        .then(res => res.json())
        .then(data => {
          // Filter out the current doctor
          setSearchResults(data.filter((d: any) => d.id !== currentDoctorId));
        })
        .catch(err => console.error("Error searching doctors:", err));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, currentDoctorId]);

  const handleRefer = async () => {
    if (!selectedDoctorId) {
      setError("Please select a doctor first.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/doctor-portal/referrals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          referredByDoctorId: currentDoctorId,
          referredToDoctorId: selectedDoctorId,
          appointmentId,
          notes
        })
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => onClose(), 1500);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to send referral.");
      }
    } catch (e) {
      setError("Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="referral-modal-overlay">
      <div className="referral-modal">
        <div className="referral-header">
          <h3>Refer {patientName}</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {success ? (
          <div className="referral-success">
            <div className="success-icon">✓</div>
            <p>Referral sent successfully!</p>
          </div>
        ) : (
          <div className="referral-body">
            <p className="referral-context">
              {appointmentId 
                ? "You are referring this specific case and all historical records." 
                : "You are referring the patient's entire medical history."}
            </p>

            <div className="form-group">
              <label>Search Doctor by Name:</label>
              <input 
                type="text" 
                placeholder="Type name (e.g., Sharma)..." 
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setSelectedDoctorId(null);
                }}
              />
            </div>

            {searchResults.length > 0 && !selectedDoctorId && (
              <ul className="search-results">
                {searchResults.map(doc => (
                  <li key={doc.id} onClick={() => setSelectedDoctorId(doc.id)}>
                    <div className="doc-name">{doc.name}</div>
                    <div className="doc-detail">{doc.qualification} • {doc.departmentName}, {doc.hospitalName}</div>
                  </li>
                ))}
              </ul>
            )}

            {selectedDoctorId && (
              <div className="selected-doctor">
                <strong>Selected: </strong> 
                {searchResults.find(d => d.id === selectedDoctorId)?.name}
                <button className="change-btn" onClick={() => setSelectedDoctorId(null)}>Change</button>
              </div>
            )}

            <div className="form-group">
              <label>Referral Notes (Optional):</label>
              <textarea 
                rows={3} 
                placeholder="Add context for the referred doctor..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            {error && <div className="error-msg">{error}</div>}

            <div className="referral-actions">
              <button className="cancel-btn" onClick={onClose}>Cancel</button>
              <button 
                className="submit-btn" 
                disabled={!selectedDoctorId || loading}
                onClick={handleRefer}
              >
                {loading ? 'Sending...' : 'Send Referral'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
