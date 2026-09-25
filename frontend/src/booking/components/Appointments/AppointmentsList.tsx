import React, { useState, useEffect } from 'react';
import './AppointmentsList.css';
import { bookingApi } from '../../api/bookingApi';
import type { AppointmentSummary, PatientProfile, ReferralSummary } from '../../types/booking.types';

interface AppointmentsListProps {
  profileId?: number | null;
  /**
   * When set, auto-select this patient in the dropdown and filter to their appointments.
   * Used after a Doctor Directory booking to show the booked patient's appointments.
   */
  initialProfileId?: number | null;
  onBack: () => void;
  onScheduleFollowUp?: (referral: ReferralSummary) => void;
}

// ─── Referral Card ─────────────────────────────────────────────────────────
const ReferralCard: React.FC<{ ref_: ReferralSummary; onScheduleFollowUp?: (ref: ReferralSummary) => void }> = ({ ref_, onScheduleFollowUp }) => {
  const status = ref_.referralStatus ?? 'pending';

  return (
    <div className="apt-card referral">
      <div className="apt-card-top">
        <span className="referral-badge">🔄 Referred</span>
        <span className="apt-date">{ref_.createdAt}</span>
      </div>

      {/* Hospital of the referred-to doctor */}
      <h3>{ref_.referredToHospital || 'Specialist Referral'}</h3>
      {ref_.referredToDept && <p className="apt-dept">{ref_.referredToDept}</p>}

      {/* Patient chip */}
      {ref_.patientName && (
        <div className="doc-info-sm patient-info-sm">
          <span className="icon">🧑</span>
          <span>Patient: <strong>{ref_.patientName}</strong></span>
          <span className="referral-type-chip">
            {ref_.referralType === 'SINGLE_CASE' ? 'Single Case' : 'Full History'}
          </span>
        </div>
      )}

      {/* Route connector */}
      <div className="referral-route">
        <div className="referral-route-doctor from">
          <div className="doc-avatar">👨‍⚕️</div>
          <div className="doc-text">
            <span className="doc-name">{ref_.referredByDoctorName}</span>
            <span className="doc-detail">{ref_.referredByDoctorQual}{ref_.referredByHospital ? ` · ${ref_.referredByHospital}` : ''}</span>
          </div>
        </div>

        <div className="referral-route-connector">
          <div className="referral-route-line" />
          <div className="referral-route-dots">
            <span className="referral-route-dot" />
            <span className="referral-route-dot" />
            <span className="referral-route-dot" />
          </div>
          <span className="referral-route-arrow">▶</span>
          <div className="referral-route-line" />
        </div>

        <div className="referral-route-doctor to">
          <div className="doc-avatar">🩺</div>
          <div className="doc-text">
            <span className="doc-name">{ref_.referredToDoctorName}</span>
            <span className="doc-detail">{ref_.referredToDoctorQual}{ref_.referredToHospital ? ` · ${ref_.referredToHospital}` : ''}</span>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="referral-status-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="referral-status-label">Referral Status</span>
          <span className={`referral-status-value ${status}`}>
            <span className={`referral-status-dot ${status}`} />
            {status === 'pending' ? '⏳ Pending Review' : '✅ Analysed'}
          </span>
        </div>
        {status === 'analysed' && onScheduleFollowUp && (
          <button 
            className="refer-primary-btn" 
            style={{ padding: '6px 12px', fontSize: '13px' }}
            onClick={() => onScheduleFollowUp(ref_)}
          >
            Schedule Appointment
          </button>
        )}
      </div>

      {/* Notes */}
      {ref_.notes && <div className="referral-notes">📝 {ref_.notes}</div>}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────
export const AppointmentsList: React.FC<AppointmentsListProps> = ({ profileId, initialProfileId, onBack, onScheduleFollowUp }) => {
  const [appointments, setAppointments] = useState<AppointmentSummary[]>([]);
  const [referrals, setReferrals] = useState<ReferralSummary[]>([]);
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
    setLoading(true);
    try {
      const [aptsData, refsData] = await Promise.all([
        bookingApi.getAppointments(pid),
        bookingApi.getReferrals(),
      ]);
      aptsData.sort((a, b) => b.id - a.id);
      setAppointments(aptsData);
      // Filter referrals by patient if a patient is selected
      const filteredRefs = pid
        ? refsData.filter(r => r.patientId === pid)
        : refsData;
      setReferrals(filteredRefs);
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
    } catch (e) {
      console.error(e);
      setAppointments(prev => prev.filter(a => a.id !== id));
    }
  };

  const isEmpty = appointments.length === 0 && referrals.length === 0;

  return (
    <div className="appointments-list-container">
      <button className="back-link" onClick={onBack}>
        ← Back
      </button>

      <div className="apt-header">
        <h2>Your Appointments</h2>
        <p>Manage your upcoming and past bookings, and track referrals from your doctors.</p>

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
          {/* Regular appointment cards */}
          {appointments.map(apt => {
            const isReferred = referrals.some(r => r.sourceAppointmentId === apt.id);
            const isPastVisit = new Date(apt.date) < new Date(new Date().toDateString());
            const isCompleted = apt.status === 'completed' || isPastVisit || isReferred;
            const displayStatus = (isCompleted && apt.status !== 'cancelled') ? 'completed' : apt.status;

            return (
              <div key={`apt-${apt.id}`} className={`apt-card ${displayStatus}`}>
                {apt.status === 'cancelled' && (
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
                    {displayStatus.toUpperCase()}
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

                {displayStatus === 'confirmed' && !isReferred && (
                  <button className="cancel-apt-btn" onClick={() => handleCancel(apt.id)}>
                    Cancel Appointment
                  </button>
                )}
              </div>
            );
          })}

          {/* Referral cards */}
          {referrals.map(ref => (
            <ReferralCard key={`ref-${ref.referralId}`} ref_={ref} onScheduleFollowUp={onScheduleFollowUp} />
          ))}
        </div>
      )}
    </div>
  );
};
