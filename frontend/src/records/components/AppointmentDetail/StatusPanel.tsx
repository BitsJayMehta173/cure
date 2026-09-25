import React, { useEffect, useState } from 'react';
import type { AppointmentSummary } from '../../../booking/types/booking.types';

interface StatusPanelProps {
  appointment: AppointmentSummary;
}

const STEPS = ['Scheduled', 'Confirmed', 'Completed'] as const;
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

function getCurrentUserId(): number | null {
  try {
    const stored = localStorage.getItem('medroute_user');
    if (stored) return JSON.parse(stored).id ?? null;
  } catch { /* */ }
  return null;
}

export const StatusPanel: React.FC<StatusPanelProps> = ({ appointment }) => {
  const status = appointment.status;
  const isCancelled = status === 'cancelled';

  const [referral, setReferral] = useState<any>(null);

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) return;
    fetch(`${API_BASE}/api/booking/referrals?userId=${userId}`)
      .then(r => r.ok ? r.json() : [])
      .then((refs: any[]) => {
        const found = refs.find(r => r.sourceAppointmentId === appointment.id);
        setReferral(found ?? null);
      })
      .catch(() => setReferral(null));
  }, [appointment.id]);

  const isReferred = !!referral;

  const isPastVisit = !isCancelled && new Date(appointment.date) < new Date(new Date().toDateString());
  const isCompleted = status === 'completed' || isPastVisit || isReferred;
  const activeStepIndex = isCompleted ? 2 : 1;

  const badgeClass = isCancelled
    ? 'status error'
    : isReferred
    ? 'status referred'
    : isCompleted
    ? 'status stable'
    : 'status success';

  const badgeLabel = isCancelled
    ? 'CANCELLED'
    : isReferred
    ? 'REFERRED'
    : isCompleted
    ? 'COMPLETED'
    : 'CONFIRMED';

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

      {/* Show referral info block if referred */}
      {isReferred && (
        <div className="status-referral-info">
          <div className="status-referral-header">
            <span className="referral-badge-inline">🔄 Referred to Specialist</span>
          </div>
          <div className="status-referral-route">
            <div className="status-ref-doctor from">
              <span className="ref-doc-icon">👨‍⚕️</span>
              <div>
                <div className="ref-doc-name">{referral.referredByDoctorName}</div>
                <div className="ref-doc-detail">{referral.referredByHospital}</div>
              </div>
            </div>
            <div className="status-ref-connector">
              <span className="ref-dot" /><span className="ref-dot" /><span className="ref-dot" />
              <span className="ref-arrow">▶</span>
            </div>
            <div className="status-ref-doctor to">
              <span className="ref-doc-icon">🩺</span>
              <div>
                <div className="ref-doc-name">{referral.referredToDoctorName}</div>
                <div className="ref-doc-detail">{referral.referredToHospital}</div>
              </div>
            </div>
          </div>
          <div className="status-ref-status-row">
            <span className="status-ref-label">Referral Status</span>
            <span className={`status-ref-value ${referral.referralStatus}`}>
              <span className={`status-ref-dot ${referral.referralStatus}`} />
              {referral.referralStatus === 'pending' ? '⏳ Pending Review' : '✅ Available'}
            </span>
          </div>
          {referral.notes && <div className="status-ref-notes">📝 {referral.notes}</div>}
        </div>
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
