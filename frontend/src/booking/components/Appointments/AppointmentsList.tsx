import React, { useState, useEffect } from 'react';
import './AppointmentsList.css';
import { bookingApi } from '../../api/bookingApi';
import type { AppointmentSummary, PatientProfile } from '../../types/booking.types';
import { useAuth } from '../../../auth/AuthContext';
import { followUpApi, referralApi } from '../../../referrals/api/referralApi';
import type { FollowUp, Referral } from '../../../referrals/types/referral.types';
import { PatientCareItems } from '../../../referrals/components/PatientCareItems';

interface AppointmentsListProps {
  profileId?: number | null;
  /**
   * When set, auto-select this patient in the dropdown and filter to their appointments.
   * Used after a Doctor Directory booking to show the booked patient's appointments.
   */
  initialProfileId?: number | null;
  onBack: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'CONFIRMED',
  referred: 'REFERRED',
  feedback_received: 'IN REVIEW',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
};

export const AppointmentsList: React.FC<AppointmentsListProps> = ({ profileId, initialProfileId, onBack }) => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentSummary[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [profiles, setProfiles] = useState<PatientProfile[]>([]);
  const [filterId, setFilterId] = useState<number | null>(initialProfileId ?? profileId ?? null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookingApi.getProfiles()
      .then(setProfiles)
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadData(filterId);
  }, [filterId]);

  const loadData = async (pid: number | null) => {
    if (!user) return;
    setLoading(true);
    try {
      const [aptsData, refsData, fuData] = await Promise.all([
        bookingApi.getAppointments(pid),
        referralApi.forPatient(user.id).catch(() => [] as Referral[]),
        followUpApi.forPatient(user.id).catch(() => [] as FollowUp[]),
      ]);
      aptsData.sort((a, b) => b.id - a.id);
      setAppointments(aptsData);
      setReferrals(pid ? refsData.filter(r => r.patient.id === pid) : refsData);
      setFollowUps(pid ? fuData.filter(f => f.patient.id === pid) : fuData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await bookingApi.cancelAppointment(id);
      loadData(filterId);
    } catch (e) {
      alert('Failed to cancel appointment');
    }
  };

  const handleRemove = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await bookingApi.removeAppointment(id);
      setAppointments(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error(err);
      setAppointments(prev => prev.filter(a => a.id !== id));
    }
  };

  const isEmpty = appointments.length === 0 && !referrals.some(r => r.status !== 'FOLLOW_UP_BOOKED') && !followUps.some(f => f.status === 'OPEN');

  return (
    <div className="appointments-list-container">
      <button className="back-link" onClick={onBack}>
        ← Back
      </button>

      <div className="apt-header">
        <h2>Your Appointments</h2>
        <p>Manage your upcoming and past bookings, and track referrals and follow-ups from your doctors.</p>

        {profiles.length > 0 && (
          <div className="apt-filter-container">
            <label htmlFor="apt-profile-filter" className="apt-filter-label">Patient:</label>
            <select
              id="apt-profile-filter"
              className="apt-filter-select"
              value={filterId === null ? 'all' : String(filterId)}
              onChange={(e) => {
                const val = e.target.value === 'all' ? null : Number(e.target.value);
                setFilterId(val);
              }}
            >
              <option value="all">All Patients</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.fullName} ({p.relation})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <p className="loading-text">Loading appointments...</p>
      ) : isEmpty ? (
        <div className="empty-state">You have no booked appointments or referrals.</div>
      ) : (
        <div className="apt-grid">
          {/* Referrals and open follow-ups (book buttons when the server allows) */}
          {user && (
            <PatientCareItems
              userId={user.id}
              referrals={referrals}
              followUps={followUps}
              onChanged={() => loadData(filterId)}
              hideBookedReferrals
            />
          )}

          {/* Appointments — status is computed server-side (ReferralService.displayStatus) */}
          {appointments.map(apt => {
            const displayStatus = apt.displayStatus ?? apt.status;
            return (
              <div key={`apt-${apt.id}`} className={`apt-card ${displayStatus}`}>
                {displayStatus === 'cancelled' && (
                  <button
                    className="remove-apt-btn"
                    title="Remove cancelled appointment"
                    onClick={(e) => handleRemove(e, apt.id)}
                    aria-label="Remove appointment"
                  >
                    ✕
                  </button>
                )}
                <div className="apt-card-top">
                  <span className={`status-badge status-${displayStatus}`}>
                    {STATUS_LABEL[displayStatus] ?? displayStatus.toUpperCase()}
                  </span>
                  <span className="apt-date">{apt.date}</span>
                </div>

                <h3>{apt.hospitalName || 'Hospital Visit'}</h3>
                {apt.departmentName && <p className="apt-dept">{apt.departmentName}</p>}

                <div className="doc-info-sm">
                  <span className="icon">👨‍⚕️</span>
                  <span>{apt.doctorName || 'Assigned Specialist'}</span>
                </div>

                {apt.patientName && (
                  <div className="doc-info-sm patient-info-sm">
                    <span className="icon">🧑</span>
                    <span>Patient: <strong>{apt.patientName}</strong></span>
                  </div>
                )}

                <div className="apt-meta-grid">
                  <div className="meta-box">
                    <span className="label">Token</span>
                    <span className="value">{apt.tokenNumber}</span>
                  </div>
                  <div className="meta-box highlight">
                    <span className="label">Expected Time</span>
                    <span className="value">{apt.expectedTimeStr || 'Pending'}</span>
                  </div>
                </div>

                {displayStatus === 'confirmed' && (
                  <button className="cancel-apt-btn" onClick={() => handleCancel(apt.id)}>
                    Cancel Appointment
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
