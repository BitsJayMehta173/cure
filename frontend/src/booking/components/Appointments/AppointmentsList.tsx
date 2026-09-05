import React, { useState, useEffect } from 'react';
import './AppointmentsList.css';
import { bookingApi } from '../../api/bookingApi';
import type { AppointmentSummary } from '../../types/booking.types';

interface AppointmentsListProps {
  profileId: number;
  onBack: () => void;
}

export const AppointmentsList: React.FC<AppointmentsListProps> = ({ profileId, onBack }) => {
  const [appointments, setAppointments] = useState<AppointmentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppointments();
  }, [profileId]);

  const loadAppointments = async () => {
    try {
      const data = await bookingApi.getAppointments(profileId);
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
      loadAppointments(); // reload to reflect status
    } catch (e) {
      alert('Failed to cancel appointment');
    }
  };

  return (
    <div className="appointments-list-container">
      <button className="back-link" onClick={onBack}>
        ← Back to Action Selection
      </button>

      <div className="apt-header">
        <h2>Your Appointments</h2>
        <p>Manage your upcoming and past bookings.</p>
      </div>

      {loading ? (
        <p className="loading-text">Loading appointments...</p>
      ) : appointments.length === 0 ? (
        <div className="empty-state">You have no booked appointments.</div>
      ) : (
        <div className="apt-grid">
          {appointments.map(apt => (
            <div key={apt.id} className={`apt-card ${apt.status}`}>
              <div className="apt-card-top">
                <span className={`status-badge status-${apt.status}`}>
                  {apt.status.toUpperCase()}
                </span>
                <span className="apt-date">{apt.date}</span>
              </div>
              
              <h3>{apt.hospitalName}</h3>
              <p className="apt-dept">{apt.departmentName}</p>
              
              <div className="doc-info-sm">
                <span className="icon">👨‍⚕️</span>
                <span>{apt.doctorName}</span>
              </div>
              
              <div className="apt-meta-grid">
                <div className="meta-box">
                  <span className="label">Token</span>
                  <span className="value">{apt.tokenNumber}</span>
                </div>
                <div className="meta-box highlight">
                  <span className="label">Expected Time</span>
                  <span className="value">{apt.expectedTimeStr}</span>
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
