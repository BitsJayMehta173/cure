import React, { useState, useEffect } from 'react';
import './AppointmentsList.css';
import { bookingApi } from '../../api/bookingApi';
import type { AppointmentSummary, PatientProfile } from '../../types/booking.types';

interface AppointmentsListProps {
  profileId?: number | null;
  onBack: () => void;
}

export const AppointmentsList: React.FC<AppointmentsListProps> = ({ profileId, onBack }) => {
  const [appointments, setAppointments] = useState<AppointmentSummary[]>([]);
  const [profiles, setProfiles] = useState<PatientProfile[]>([]);
  const [filterId, setFilterId] = useState<number | null>(profileId || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookingApi.getProfiles()
      .then(setProfiles)
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadAppointments(filterId);
  }, [filterId]);

  const loadAppointments = async (pid: number | null) => {
    setLoading(true);
    try {
      const data = await bookingApi.getAppointments(pid);
      // Always sort latest booked first (descending by id)
      data.sort((a, b) => b.id - a.id);
      setAppointments(data);
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
      loadAppointments(filterId); // reload to reflect status
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
      // Remove locally so UI is immediately clean
      setAppointments(prev => prev.filter(a => a.id !== id));
    }
  };

  return (
    <div className="appointments-list-container">
      <button className="back-link" onClick={onBack}>
        ← Back
      </button>

      <div className="apt-header">
        <h2>Your Appointments</h2>
        <p>Manage your upcoming and past bookings from both Recommendation and Direct Booking.</p>

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
              <option value="all">All Patients ({appointments.length})</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.fullName} ({p.relation})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <p className="loading-text">Loading appointments...</p>
      ) : appointments.length === 0 ? (
        <div className="empty-state">You have no booked appointments.</div>
      ) : (
        <div className="apt-grid">
          {appointments.map(apt => (
            <div key={apt.id} className={`apt-card ${apt.status}`}>
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
                <span className={`status-badge status-${apt.status}`}>
                  {apt.status.toUpperCase()}
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

              {apt.status === 'confirmed' && (
                <button className="cancel-apt-btn" onClick={() => handleCancel(apt.id)}>
                  Cancel Appointment
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
