import React, { useState, useEffect } from 'react';
import './ReferralModal.css';
import { referralApi } from '../referrals/api/referralApi';
import type { ReferralKind } from '../referrals/types/referral.types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface ReferralModalProps {
  patientId: number;
  patientName: string;
  currentDoctorId: number;
  appointmentId: number | null;
  onClose: () => void;
  /** Called after the referral is created (so the caller can refresh its referral list). */
  onCreated?: () => void;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({ 
  patientId, patientName, currentDoctorId, appointmentId, onClose, onCreated
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [kind, setKind] = useState<ReferralKind>('CONSULT');
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
      await referralApi.create({
        patientId,
        fromDoctorId: currentDoctorId,
        toDoctorId: selectedDoctorId,
        appointmentId,
        kind,
        notes
      });
      setSuccess(true);
      onCreated?.();
      setTimeout(() => onClose(), 1500);
    } catch (e: any) {
      setError(e?.message || "Failed to send referral.");
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
            {/* Mode Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '10px', fontSize: '14px' }}>
                Referral Type:
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setKind('CONSULT')}
                  style={{
                    flex: 1, padding: '14px 12px', borderRadius: '8px', cursor: 'pointer',
                    border: kind === 'CONSULT' ? '2px solid var(--color-primary, #00766c)' : '2px solid #e0e0e0',
                    background: kind === 'CONSULT' ? 'rgba(0,118,108,0.08)' : '#fafafa',
                    textAlign: 'left', transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>📋 Second opinion</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Doctor reviews the case and sends findings back — the patient stays with you
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setKind('TRANSFER')}
                  style={{
                    flex: 1, padding: '14px 12px', borderRadius: '8px', cursor: 'pointer',
                    border: kind === 'TRANSFER' ? '2px solid #ff9800' : '2px solid #e0e0e0',
                    background: kind === 'TRANSFER' ? 'rgba(255,152,0,0.08)' : '#fafafa',
                    textAlign: 'left', transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>🔄 Handover</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Doctor takes over the case; once they accept, the patient books with them
                  </div>
                </button>
              </div>
            </div>

            <p className="referral-context">
              {appointmentId 
                ? "The referred doctor will see this visit and the earlier visits in its care chain."
                : "The referred doctor will see the patient's entire medical history."}
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
                style={kind === 'TRANSFER' ? { background: '#ff9800' } : {}}
              >
                {loading ? 'Sending...' : (kind === 'TRANSFER' ? 'Hand over case' : 'Request second opinion')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
