import React, { useState, useEffect } from 'react';
import './PatientChooser.css';
import { recordsApi } from '../../api/recordsApi';
import type { PatientRecord } from '../../types/records.types';

interface PatientChooserProps {
  onSelect: (patient: PatientRecord) => void;
}

export const PatientChooser: React.FC<PatientChooserProps> = ({ onSelect }) => {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    recordsApi.getPatients()
      .then(setPatients)
      .catch((e) => {
        console.error(e);
        setError('Could not load patients. Make sure the backend is running.');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="records-chooser">
      <div className="records-chooser-header">
        <h2>Patient Records</h2>
        <p>Select a patient to view their visit history, reports, and prescriptions.</p>
      </div>

      {error && <div className="directory-error">⚠️ {error}</div>}

      {loading ? (
        <p className="loading-text">Loading patients...</p>
      ) : patients.length === 0 ? (
        <div className="empty-state">
          No patient profiles found. Create one from the Booking tab first.
        </div>
      ) : (
        <div className="records-patients-list">
          {patients.map(p => (
            <div key={p.id} className="records-patient-card" onClick={() => onSelect(p)}>
              <div className="profile-avatar">
                {p.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="profile-details">
                <h3>{p.fullName}</h3>
                <span className="profile-meta">{p.age} yrs • {p.gender} • {p.relation}</span>
              </div>
              {p.unreadNotifications > 0 && (
                <span className="notif-badge" aria-label={`${p.unreadNotifications} unread notifications`}>
                  {p.unreadNotifications > 99 ? '99+' : p.unreadNotifications}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
