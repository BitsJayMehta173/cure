import React, { useState } from 'react';
import './referrals.css';
import type { DoctorRef } from '../types/referral.types';
import { SlotPicker } from './SlotPicker';

interface BookVisitModalProps {
  /** Doctor the visit is with — booking happens at their hospital/department (server-side). */
  doctor: DoctorRef;
  patientName: string;
  title: string;
  /** Performs the booking (referral book-follow-up or follow-up book); throws on failure. */
  onBook: (date: string) => Promise<void>;
  onClose: () => void;
}

/** Patient-side date picker for booking a referral or follow-up visit with a fixed doctor. */
export const BookVisitModal: React.FC<BookVisitModalProps> = ({ doctor, patientName, title, onBook, onClose }) => {
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const book = async () => {
    setBusy(true);
    setError('');
    try {
      await onBook(date);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Booking failed. Please pick another date.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rf-panel" style={{ width: 'min(560px, 94vw)', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3>📅 {title}</h3>
        <div className="rf-route" style={{ marginBottom: 12 }}>
          With <strong>{doctor.name}</strong> for <strong>{patientName}</strong>
          <small>{[doctor.departmentName, doctor.hospitalName].filter(Boolean).join(' · ')}</small>
        </div>
        {doctor.hospitalId && doctor.departmentId ? (
          <SlotPicker hospitalId={doctor.hospitalId} deptId={doctor.departmentId} value={date} onChange={setDate} />
        ) : (
          <p className="rf-error">This doctor has no hospital department on file.</p>
        )}
        {error && <div className="rf-error" style={{ marginTop: 10 }}>❌ {error}</div>}
        <div className="rf-actions" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
          <button className="doc-btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="doc-btn-primary" onClick={book} disabled={busy || !date}>
            {busy ? 'Booking…' : date ? `Book ${date}` : 'Pick a date'}
          </button>
        </div>
      </div>
    </div>
  );
};
