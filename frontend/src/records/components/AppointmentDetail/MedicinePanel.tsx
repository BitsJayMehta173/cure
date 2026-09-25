import React, { useState, useEffect } from 'react';
import { recordsApi } from '../../api/recordsApi';
import type { Prescription } from '../../types/records.types';

interface MedicinePanelProps {
  appointmentId: number;
}

export const MedicinePanel: React.FC<MedicinePanelProps> = ({ appointmentId }) => {
  const [medicines, setMedicines] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    recordsApi.getMedicines(appointmentId)
      .then(setMedicines)
      .catch((e) => {
        console.error(e);
        setError('Could not load medicines.');
      })
      .finally(() => setLoading(false));
  }, [appointmentId]);

  if (loading) return <p className="loading-text">Loading prescriptions...</p>;
  if (error) return <div className="directory-error">⚠️ {error}</div>;
  if (medicines.length === 0) {
    return (
      <div className="empty-state">
        No medicines prescribed yet for this appointment.
      </div>
    );
  }

  return (
    <div className="medicine-list">
      {medicines.map(m => (
        <div key={m.id} className="medicine-card">
          <div className="medicine-card-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h4>💊 {m.medicineName}</h4>
              {m.dosage && <span className="medicine-dosage">{m.dosage}</span>}
            </div>
            {m.authorName && (
              <div style={{ fontSize: '11px', color: 'var(--color-primary, #00766c)', fontStyle: 'italic', fontWeight: 600 }}>
                👤 {m.authorName}
              </div>
            )}
          </div>
          <div className="medicine-meta-grid">
            {m.frequency && (
              <div className="meta-box">
                <span className="label">Frequency</span>
                <span className="value">{m.frequency}</span>
              </div>
            )}
            {m.duration && (
              <div className="meta-box">
                <span className="label">Duration</span>
                <span className="value">{m.duration}</span>
              </div>
            )}
          </div>
          {m.instructions && <p className="medicine-instructions">📝 {m.instructions}</p>}
        </div>
      ))}
    </div>
  );
};
