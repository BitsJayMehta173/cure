import React, { useState, useEffect } from 'react';
import './HospitalStep.css';
import { bookingApi } from '../../api/bookingApi';
import type { HospitalSummary } from '../../types/booking.types';

interface HospitalStepProps {
  stateName: string;
  onSelect: (hospitalId: number) => void;
  onBack: () => void;
}

export const HospitalStep: React.FC<HospitalStepProps> = ({ stateName, onSelect, onBack }) => {
  const [hospitals, setHospitals] = useState<HospitalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadHospitals();
  }, [stateName]);

  const loadHospitals = async () => {
    setLoading(true);
    try {
      const data = await bookingApi.getHospitals(stateName);
      setHospitals(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredHospitals = hospitals.filter(h => 
    h.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    h.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getBadgeClass = (type: string) => {
    switch (type.toLowerCase()) {
      case 'government': return 'badge-gov';
      case 'trust': return 'badge-trust';
      default: return 'badge-private';
    }
  };

  return (
    <div className="hospital-step">
      <button className="back-link" onClick={onBack}>
        ← Back to States
      </button>

      <div className="hospital-header">
        <h2>Hospitals in {stateName}</h2>
        <div className="search-bar">
          <input 
            type="text" 
            placeholder="Search by hospital name or area..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p className="loading-text">Loading hospitals...</p>
      ) : filteredHospitals.length === 0 ? (
        <div className="empty-state">No hospitals found for your search.</div>
      ) : (
        <div className="hospital-grid">
          {filteredHospitals.map(h => (
            <div key={h.id} className="hospital-card" onClick={() => onSelect(h.id)}>
              <div className="hospital-card-top">
                <h3>{h.name}</h3>
                <span className={`type-badge ${getBadgeClass(h.type)}`}>{h.type.toUpperCase()}</span>
              </div>
              
              <div className="hospital-rating">
                ⭐ {h.rating.toFixed(1)} / 5.0
              </div>
              
              <p className="hospital-address">📍 {h.address}</p>
              
              <div className="hospital-meta-grid">
                <div className="meta-item">
                  <span className="meta-label">OPD Hours</span>
                  <span className="meta-value">🕒 {h.opdHours}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Specialties</span>
                  <span className="meta-value">⚕️ {h.departmentCount} Depts</span>
                </div>
              </div>

              {h.accreditation && h.accreditation.length > 0 && (
                <div className="accreditation-tags">
                  {h.accreditation.map(tag => (
                    <span key={tag} className="tag">{tag.trim()}</span>
                  ))}
                </div>
              )}

              <button className="select-hospital-btn">Select Hospital</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
