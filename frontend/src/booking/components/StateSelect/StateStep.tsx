import React, { useState, useEffect } from 'react';
import './StateStep.css';
import { bookingApi } from '../../api/bookingApi';
import { stateUiMeta, fallbackStateMeta } from '../../data/stateUiMeta';

interface StateStepProps {
  onSelect: (state: string) => void;
  onBack: () => void;
}

export const StateStep: React.FC<StateStepProps> = ({ onSelect, onBack }) => {
  const [states, setStates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStates();
  }, []);

  const loadStates = async () => {
    try {
      const data = await bookingApi.getStates();
      setStates(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="state-step">
      <button className="back-link" onClick={onBack}>
        ← Back to Profiles
      </button>

      <div className="state-header">
        <h2>Where do you need the appointment?</h2>
        <p>Select a state to find available MedRoute networked hospitals.</p>
      </div>

      {loading ? (
        <p className="loading-text">Loading regions...</p>
      ) : states.length === 0 ? (
        <div className="empty-state">No states available. Ensure database is seeded.</div>
      ) : (
        <div className="state-grid">
          {states.map(stateName => {
            const meta = stateUiMeta[stateName] || fallbackStateMeta;
            return (
              <div 
                key={stateName} 
                className="state-card"
                onClick={() => onSelect(stateName)}
                style={{ background: meta.gradient }}
              >
                <div className="state-emoji">{meta.emoji}</div>
                <h3>{stateName}</h3>
                <div className="state-arrow">→</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
