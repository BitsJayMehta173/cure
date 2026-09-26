import React from 'react';
import './referrals.css';
import type { Referral } from '../types/referral.types';

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

/**
 * "Referred by" block for a visit booked from a handover. Render only when the
 * appointment status has `referredFrom` — normal bookings show nothing.
 */
export const ReferredFromInfo: React.FC<{ referral: Referral }> = ({ referral: r }) => (
  <div className="rf-referred-from">
    <div className="rf-referred-from-title">🔄 Referred by</div>
    <div className="rf-route">
      <strong>{r.fromDoctor.name}</strong>
      <small>{[r.fromDoctor.departmentName, r.fromDoctor.hospitalName].filter(Boolean).join(' · ')}</small>
    </div>
    <div className="rf-meta">
      Referred on {fmt(r.createdAt)}
      {r.sourceAppointment && ` · from visit on ${r.sourceAppointment.date}`}
      {r.acceptedAt && ` · accepted ${fmt(r.acceptedAt)}`}
    </div>
    {r.notes && <div className="rf-quote">📝 {r.notes}</div>}
  </div>
);
