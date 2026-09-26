import React, { useState } from 'react';
import './referrals.css';
import type { AppointmentStatus } from '../types/referral.types';
import { referralApi } from '../api/referralApi';
import { ReferralCard } from './ReferralCard';
import { ReferralModal } from '../../components/ReferralModal';

interface AppointmentReferralsPanelProps {
  appointmentId: number;
  patientId: number | null;
  patientName: string;
  doctorId: number;
  status: AppointmentStatus | null;
  /** Re-fetch the appointment status (referrals + timeline) after a change. */
  onChanged: () => void;
}

/** Referring doctor's view: every referral sent from this visit, with findings and cancel. */
export const AppointmentReferralsPanel: React.FC<AppointmentReferralsPanelProps> = ({
  appointmentId, patientId, patientName, doctorId, status, onChanged
}) => {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const referrals = status?.referrals ?? [];
  const closed = status?.displayStatus === 'completed' || status?.displayStatus === 'cancelled'
    || referrals.some(r => r.kind === 'TRANSFER' && (r.status === 'ACCEPTED' || r.status === 'FOLLOW_UP_BOOKED'));

  const cancel = async (id: number) => {
    setError('');
    try {
      await referralApi.cancel(id, doctorId);
      onChanged();
    } catch (e: any) {
      setError(e?.message || 'Could not cancel referral.');
    }
  };

  return (
    <div className="dd-advice-panel">
      <h3>🔄 Referrals</h3>
      <p className="dd-advice-subtitle">
        Ask another doctor for a second opinion (the patient stays with you) or hand the case over.
      </p>

      {!patientId ? (
        <p className="rf-meta">This visit has no linked patient profile, so it can't be referred.</p>
      ) : !closed && (
        <button className="doc-btn-primary" onClick={() => setOpen(true)}>Refer this case</button>
      )}

      {referrals.length > 0 && (
        <div className="rf-list" style={{ marginTop: 16 }}>
          {referrals.map(r => (
            <ReferralCard key={r.id} referral={r} perspective="from">
              {r.actions.includes('cancel') && (
                <button className="doc-btn-secondary" onClick={() => cancel(r.id)}>Cancel referral</button>
              )}
            </ReferralCard>
          ))}
        </div>
      )}
      {referrals.some(r => r.kind === 'CONSULT' && r.status === 'RESPONDED' && !r.closedAt) && (
        <p className="rf-success" style={{ marginTop: 12 }}>
          Findings received — review them, then finalize this appointment from the Finalize tab.
        </p>
      )}
      {error && <div className="rf-error" style={{ marginTop: 8 }}>❌ {error}</div>}

      {open && patientId && (
        <ReferralModal
          patientId={patientId}
          patientName={patientName}
          currentDoctorId={doctorId}
          appointmentId={appointmentId}
          onClose={() => setOpen(false)}
          onCreated={onChanged}
        />
      )}
    </div>
  );
};
