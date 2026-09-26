import React, { useState } from 'react';
import './referrals.css';
import type { Referral } from '../types/referral.types';
import { referralApi, caseRecordsApi } from '../api/referralApi';
import { CaseRecordsPanel } from './CaseRecordsPanel';
import { StatusBadge, StatusTimeline } from './StatusTimeline';
import { SlotPicker } from './SlotPicker';
import { kindLabel } from './ReferralCard';
import { PatientProfileView } from '../../components/PatientProfileView';

interface ReferralWorkspaceProps {
  referral: Referral;
  doctorId: number;
  onBack: () => void;
  /** Called with the updated referral after any action. */
  onChanged: (updated: Referral) => void;
}

/**
 * The referred doctor's view of one incoming referral: context, the patient's shared
 * records (access enforced server-side), and only the actions the server allows.
 */
export const ReferralWorkspace: React.FC<ReferralWorkspaceProps> = ({ referral: r, doctorId, onBack, onChanged }) => {
  const [findings, setFindings] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [showDecline, setShowDecline] = useState(false);
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const can = (a: string) => r.actions.includes(a as any);
  // The same workspace serves the referred doctor and (read-mostly) the referring doctor.
  const isReferrer = doctorId === r.fromDoctor.id;
  const counterpart = isReferrer ? r.toDoctor : r.fromDoctor;

  const run = async (fn: () => Promise<Referral>, success: string) => {
    setBusy(true); setError(''); setMessage('');
    try {
      onChanged(await fn());
      setMessage(success);
    } catch (e: any) {
      setError(e?.message || 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rf-workspace">
      <button className="dd-back-btn" onClick={onBack}>← Back to Referrals</button>

      <div className="rf-panel">
        <div className="rf-card-top">
          <h3 style={{ margin: 0 }}>{kindLabel(r)} · {r.patient.fullName}</h3>
          <StatusBadge status={r.status} label={r.displayStatus} />
        </div>
        <StatusTimeline steps={r.timeline} />
        <div className="rf-route">
          {isReferrer ? 'Sent to ' : 'From '}<strong>{counterpart.name}</strong>
          <small>{[counterpart.departmentName, counterpart.hospitalName].filter(Boolean).join(' · ')}</small>
        </div>
        <div className="rf-meta" style={{ marginTop: 6 }}>
          {r.scope === 'FULL_HISTORY' ? 'Full medical history shared' : `Case of ${r.sourceAppointment?.date} shared, with its earlier visits`}
        </div>
        {r.notes && <div className="rf-quote" style={{ marginTop: 10 }}>📝 {r.notes}</div>}
        {r.responseNotes && (
          <div className="rf-quote findings" style={{ marginTop: 10 }}>
            {r.status === 'DECLINED' ? '✋ Declined: ' : r.status === 'CANCELLED' ? '🚫 Cancelled: ' : (isReferrer ? '🩺 Findings: ' : '🩺 Your findings: ')}{r.responseNotes}
          </div>
        )}
        {r.followUpAppointment && (
          <div className="rf-success" style={{ marginTop: 10 }}>
            📅 Follow-up booked: {r.followUpAppointment.date} · Token {r.followUpAppointment.tokenNumber}
            {r.followUpAppointment.expectedTime && ` · ${r.followUpAppointment.expectedTime}`}
          </div>
        )}
      </div>

      {/* ── Case file: the referring doctor's records + this referral's additions, each with its owner ── */}
      <div className="rf-panel">
        <h3>{r.kind === 'TRANSFER' ? '📦 Handover packet' : '🗂️ Case file'}</h3>
        <p className="rf-meta" style={{ marginBottom: 12 }}>
          {r.kind === 'TRANSFER'
            ? 'A copy of the case taken when it was referred. It is imported into the new appointment when booked, where the new doctor continues it — later changes by the referring doctor do not carry over.'
            : can('add_records')
              ? 'Add your reports and prescriptions to this case — they appear in the referring doctor’s visit, marked as yours.'
              : 'Records shared with this referral. Every item shows who recorded it.'}
        </p>
        <CaseRecordsPanel
          load={() => caseRecordsApi.forReferral(r.id, doctorId)}
          target={{ referralId: r.id }}
          doctorId={doctorId}
          reloadKey={r.status}
        />
      </div>

      {/* ── Second opinion: send findings back ── */}
      {can('respond') && (
        <div className="rf-panel">
          <h3>🩺 Send your opinion back to {r.fromDoctor.name}</h3>
          <textarea
            className="rf-textarea" rows={5} value={findings}
            onChange={e => setFindings(e.target.value)}
            placeholder="Summary of your opinion — detailed reports and prescriptions go in the case file above."
          />
          <div className="rf-actions">
            <button className="doc-btn-primary" disabled={busy || !findings.trim()}
              onClick={() => run(() => referralApi.respond(r.id, doctorId, findings), '✅ Findings sent. The referring doctor will review them.')}>
              {busy ? 'Sending…' : 'Send findings'}
            </button>
          </div>
        </div>
      )}

      {/* ── Handover: accept ── */}
      {can('accept') && (
        <div className="rf-panel">
          <h3>🔄 Take over this case?</h3>
          <p className="rf-meta">Accepting hands the case to you. The patient is notified to book an appointment with you — or you can book it now below.</p>
          <div className="rf-actions">
            <button className="doc-btn-primary" disabled={busy}
              onClick={() => run(() => referralApi.accept(r.id, doctorId), '✅ Accepted. The patient has been asked to book an appointment.')}>
              Accept case
            </button>
          </div>
        </div>
      )}

      {/* ── Handover: book the follow-up at my hospital ── */}
      {can('book_follow_up') && r.toDoctor.hospitalId && r.toDoctor.departmentId && (
        <div className="rf-panel">
          <h3>📅 Book the patient's appointment with you</h3>
          <p className="rf-meta">Optional — if you leave it, the patient books from their portal.{can('accept') && ' Booking also accepts the case.'}</p>
          <SlotPicker hospitalId={r.toDoctor.hospitalId} deptId={r.toDoctor.departmentId} value={date} onChange={setDate} />
          <div className="rf-actions">
            <button className="doc-btn-primary" disabled={busy || !date}
              onClick={() => run(() => referralApi.bookFollowUp(r.id, { doctorId }, date), `✅ Appointment booked for ${date}.`)}>
              {date ? `Book ${date}` : 'Pick a date'}
            </button>
          </div>
        </div>
      )}

      {/* ── Decline (either kind) ── */}
      {can('decline') && (
        <div className="rf-panel">
          {!showDecline ? (
            <button className="doc-btn-secondary" onClick={() => setShowDecline(true)}>✋ Decline this referral</button>
          ) : (
            <>
              <h3>✋ Decline referral</h3>
              <textarea className="rf-textarea" rows={2} value={declineReason}
                onChange={e => setDeclineReason(e.target.value)} placeholder="Reason (shared with the referring doctor)" />
              <div className="rf-actions">
                <button className="doc-btn-secondary" onClick={() => setShowDecline(false)}>Cancel</button>
                <button className="doc-btn-primary" style={{ background: '#dc3545' }} disabled={busy}
                  onClick={() => run(() => referralApi.decline(r.id, doctorId, declineReason), 'Referral declined. The case stays with the referring doctor.')}>
                  Decline
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Referring doctor viewing a sent referral ── */}
      {can('cancel') && (
        <div className="rf-panel">
          <button className="doc-btn-secondary" disabled={busy}
            onClick={() => run(() => referralApi.cancel(r.id, doctorId), 'Referral cancelled.')}>
            Cancel this referral
          </button>
        </div>
      )}

      {error && <div className="rf-error">❌ {error}</div>}
      {message && <div className="rf-success">{message}</div>}

      {/* ── Patient's wider history (visits this doctor may see) ── */}
      {/* keyed on status: accepting/booking changes visit statuses and adds visits to the chain */}
      <PatientProfileView key={r.status} patientId={r.patient.id} doctorId={doctorId} onClose={onBack} embedded />
    </div>
  );
};
