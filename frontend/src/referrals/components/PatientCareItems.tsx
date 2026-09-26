import React, { useState } from 'react';
import './referrals.css';
import type { FollowUp, Referral } from '../types/referral.types';
import { followUpApi, referralApi } from '../api/referralApi';
import { ReferralCard } from './ReferralCard';
import { BookVisitModal } from './BookVisitModal';

interface PatientCareItemsProps {
  userId: number;
  referrals: Referral[];
  /** Only OPEN follow-ups are shown — booked ones already appear as normal appointments. */
  followUps: FollowUp[];
  onChanged: () => void;
  /**
   * Hide handovers whose follow-up is already booked — the booked visit shows as a normal
   * appointment card, so the referral card would be a duplicate (Appointments list).
   */
  hideBookedReferrals?: boolean;
}

type Booking =
  | { type: 'referral'; item: Referral }
  | { type: 'followUp'; item: FollowUp };

/**
 * Patient view of referrals and open follow-ups. What can be booked is decided by the
 * server (`actions`); booking goes through the atomic endpoints (no separate link step).
 */
export const PatientCareItems: React.FC<PatientCareItemsProps> = ({ userId, referrals: allReferrals, followUps, onChanged, hideBookedReferrals }) => {
  const [booking, setBooking] = useState<Booking | null>(null);
  const openFollowUps = followUps.filter(f => f.status === 'OPEN');
  const referrals = hideBookedReferrals ? allReferrals.filter(r => r.status !== 'FOLLOW_UP_BOOKED') : allReferrals;

  if (referrals.length === 0 && openFollowUps.length === 0) return null;

  return (
    <>
      {openFollowUps.map(f => (
        <div key={`fu-${f.id}`} className="rf-card">
          <div className="rf-card-top">
            <span className="rf-kind">📅 Follow-up requested</span>
            <span className="rf-badge REQUESTED">To be booked</span>
          </div>
          <div className="rf-route">Patient: <strong>{f.patient.fullName}</strong></div>
          <div className="rf-route">
            With <strong>{f.doctor.name}</strong>
            <small>{[f.doctor.departmentName, f.doctor.hospitalName].filter(Boolean).join(' · ')}</small>
          </div>
          {f.notes && <div className="rf-quote">📝 {f.notes}</div>}
          <div className="rf-meta">After your visit on {f.sourceAppointment?.date}</div>
          {f.actions.includes('book') && (
            <div className="rf-actions">
              <button className="doc-btn-primary" onClick={() => setBooking({ type: 'followUp', item: f })}>
                Book follow-up
              </button>
            </div>
          )}
        </div>
      ))}

      {referrals.map(r => (
        <ReferralCard key={`ref-${r.id}`} referral={r} perspective="patient">
          {r.actions.includes('book_follow_up') && (
            <button className="doc-btn-primary" onClick={() => setBooking({ type: 'referral', item: r })}>
              Book appointment with {r.toDoctor.name}
            </button>
          )}
        </ReferralCard>
      ))}

      {booking && (
        <BookVisitModal
          doctor={booking.type === 'referral' ? booking.item.toDoctor : booking.item.doctor}
          patientName={booking.item.patient.fullName}
          title={booking.type === 'referral' ? 'Book your referred appointment' : 'Book your follow-up'}
          onBook={async date => {
            if (booking.type === 'referral') await referralApi.bookFollowUp(booking.item.id, { userId }, date);
            else await followUpApi.book(booking.item.id, userId, date);
            onChanged();
          }}
          onClose={() => setBooking(null)}
        />
      )}
    </>
  );
};
