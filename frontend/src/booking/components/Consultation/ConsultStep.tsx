import React from 'react';
import './ConsultStep.css';

interface ConsultStepProps {
  onNewAppointment: () => void;
  onBack: () => void;
}

export const ConsultStep: React.FC<ConsultStepProps> = ({ onNewAppointment, onBack }) => {
  return (
    <div className="consult-step">
      <button className="back-link" onClick={onBack}>
        ← Back to Hospital Selection
      </button>

      <div className="consult-header">
        <h2>What would you like to do?</h2>
        <p>Choose an action to proceed with the selected hospital.</p>
      </div>

      <div className="action-blocks">
        <div className="action-card new-apt" onClick={onNewAppointment}>
          <div className="action-icon">🩺</div>
          <h3>New Appointment</h3>
          <p>Book a fresh consultation with a specialist.</p>
          <button className="action-btn">Book Now →</button>
        </div>
      </div>
    </div>
  );
};
