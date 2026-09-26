import React from 'react';
import './referrals.css';
import type { Referral } from '../types/referral.types';
import { StatusBadge, StatusTimeline } from './StatusTimeline';

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

export const kindLabel = (r: Referral) => (r.kind === 'TRANSFER' ? '🔄 Handover' : '📋 Second opinion');

interface ReferralCardProps {
  referral: Referral;
  /**
   * Whose perspective: 'from' (referring doctor) shows the destination, 'to' (referred doctor)
   * shows the patient + referring doctor, 'patient' shows both doctors.
   */
  perspective: 'from' | 'to' | 'patient';
  onClick?: () => void;
  children?: React.ReactNode; // action buttons
}

/** Summary card for one referral — kind, counterpart, status, notes, findings. */
export const ReferralCard: React.FC<ReferralCardProps> = ({ referral: r, perspective, onClick, children }) => {
  const other = perspective === 'from' ? r.toDoctor : r.fromDoctor;
  if (perspective === 'patient') {
    return (
      <div className={`rf-card ${onClick ? 'clickable' : ''}`} onClick={onClick}>
        <div className="rf-card-top">
          <span className={`rf-kind ${r.kind}`}>{r.kind === 'TRANSFER' ? '🔄 Referred to a specialist' : '📋 Second opinion requested'}</span>
          <StatusBadge status={r.status} label={r.displayStatus} />
        </div>
        <div className="rf-route">Patient: <strong>{r.patient.fullName}</strong></div>
        <div className="rf-route">
          <strong>{r.fromDoctor.name}</strong> → <strong>{r.toDoctor.name}</strong>
          <small>{[r.toDoctor.departmentName, r.toDoctor.hospitalName].filter(Boolean).join(' · ')}</small>
        </div>
        <StatusTimeline steps={r.timeline} compact />
        {r.notes && <div className="rf-quote">📝 {r.notes}</div>}
        {r.status === 'DECLINED' && (
          <div className="rf-quote findings" style={{ borderLeftColor: '#dc3545', background: '#fef2f2' }}>
            ✋ {r.toDoctor.name} declined this referral{r.responseNotes ? `: ${r.responseNotes}` : '.'}
            {' '}Your visit continues with {r.fromDoctor.name}.
          </div>
        )}
        {r.followUpAppointment && (
          <div className="rf-success">
            📅 Booked: {r.followUpAppointment.date} · Token {r.followUpAppointment.tokenNumber}
            {r.followUpAppointment.expectedTime && ` · Expected ${r.followUpAppointment.expectedTime}`}
          </div>
        )}
        <div className="rf-meta">Referred {fmt(r.createdAt)}</div>
        {children && <div className="rf-actions" onClick={e => e.stopPropagation()}>{children}</div>}
      </div>
    );
  }
  return (
    <div className={`rf-card ${onClick ? 'clickable' : ''}`} onClick={onClick}>
      <div className="rf-card-top">
        <span className={`rf-kind ${r.kind}`}>{kindLabel(r)}</span>
        <StatusBadge status={r.status} label={r.displayStatus} />
      </div>
      {perspective === 'to' && (
        <div className="rf-route">
          <strong>{r.patient.fullName}</strong>
          {r.patient.age != null && ` · ${r.patient.age}y`}
          {r.patient.gender && ` · ${r.patient.gender}`}
          {r.patient.bloodGroup && ` · 🩸 ${r.patient.bloodGroup}`}
        </div>
      )}
      <div className="rf-route">
        {perspective === 'from' ? 'To ' : 'From '}<strong>{other.name}</strong>
        <small>{[other.departmentName, other.hospitalName].filter(Boolean).join(' · ')}</small>
      </div>
      <StatusTimeline steps={r.timeline} compact />
      {r.notes && <div className="rf-quote">📝 {r.notes}</div>}
      {r.responseNotes && (
        <div className="rf-quote findings">
          {r.status === 'DECLINED' ? '✋ Declined: ' : r.status === 'CANCELLED' ? '🚫 Cancelled: ' : '🩺 Findings: '}{r.responseNotes}
        </div>
      )}
      {r.followUpAppointment && (
        <div className="rf-meta">
          📅 Follow-up {r.followUpAppointment.date} · Token {r.followUpAppointment.tokenNumber}
          {r.followUpAppointment.expectedTime && ` · ${r.followUpAppointment.expectedTime}`}
        </div>
      )}
      <div className="rf-meta">
        {r.scope === 'FULL_HISTORY' ? 'Full history shared' : `Case of ${r.sourceAppointment?.date ?? ''}`} · Sent {fmt(r.createdAt)}
      </div>
      {children && <div className="rf-actions" onClick={e => e.stopPropagation()}>{children}</div>}
    </div>
  );
};
