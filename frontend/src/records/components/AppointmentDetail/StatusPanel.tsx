import React from 'react';
import type { AppointmentSummary } from '../../../booking/types/booking.types';

interface StatusPanelProps {
  appointment: AppointmentSummary;
}

const STEPS = ['Scheduled', 'Confirmed', 'Completed'] as const;

export const StatusPanel: React.FC<StatusPanelProps> = ({ appointment }) => {
  const status = appointment.status;
  const isCancelled = status === 'cancelled';

  // The backend only ever sets "confirmed" or "cancelled" today — no code path
  // marks a visit "completed" yet (that's future doctor-side work). Until then,
  // treat a non-cancelled visit whose date has already passed as completed for
  // display purposes, so the stepper/badge reflect reality for past visits
  // (which already have reports/medicines attached) without a backend change.
  const isPastVisit = !isCancelled && new Date(appointment.date) < new Date(new Date().toDateString());
  const isCompleted = status === 'completed' || isPastVisit;

  // Step index reached: Scheduled(0) -> Confirmed(1) -> Completed(2).
  // Cancelled is shown as its own end-state rather than a step on this line.
  const activeStepIndex = isCompleted ? 2 : 1;

  const badgeClass = isCancelled ? 'status error' : isCompleted ? 'status stable' : 'status success';
  const badgeLabel = isCancelled ? 'CANCELLED' : isCompleted ? 'COMPLETED' : 'CONFIRMED';

  return (
    <div className="status-panel">
      <div className="status-panel-top">
        <div>
          <h3>{appointment.hospitalName}</h3>
          <p className="status-panel-dept">{appointment.departmentName}</p>
        </div>
        <span className={badgeClass}>{badgeLabel}</span>
      </div>

      {!isCancelled ? (
        <div className="status-stepper">
          {STEPS.map((step, i) => (
            <React.Fragment key={step}>
              <div className={`status-step ${i <= activeStepIndex ? 'done' : ''}`}>
                <span className="status-step-dot" />
                <span className="status-step-label">{step}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`status-step-line ${i < activeStepIndex ? 'done' : ''}`} />}
            </React.Fragment>
          ))}
        </div>
      ) : (
        <div className="status-cancelled-note">This appointment was cancelled.</div>
      )}

      <div className="status-detail-grid">
        <div className="status-detail-box">
          <span className="label">Doctor</span>
          <span className="value">{appointment.doctorName || 'Assigned Specialist'}</span>
        </div>
        <div className="status-detail-box">
          <span className="label">Date</span>
          <span className="value">{appointment.date}</span>
        </div>
        <div className="status-detail-box">
          <span className="label">Token Number</span>
          <span className="value">{appointment.tokenNumber}</span>
        </div>
        <div className="status-detail-box highlight">
          <span className="label">Expected Time</span>
          <span className="value">{appointment.expectedTimeStr || 'Pending'}</span>
        </div>
      </div>
    </div>
  );
};
