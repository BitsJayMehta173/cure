import React, { useState } from 'react';
import './DoctorProfilePage.css';
import type { DoctorProfile } from '../booking/types/booking.types';

interface DoctorProfilePageProps {
  doctor: DoctorProfile;
  onBack: () => void;
  onBookAppointment: (doctor: DoctorProfile) => void;
}

const getInitials = (name: string) => {
  if (!name) return 'DR';
  return name.replace('Dr.', '').trim().split(' ').slice(0, 2).map(p => p.charAt(0)).join('').toUpperCase();
};

export const DoctorProfilePage: React.FC<DoctorProfilePageProps> = ({ doctor, onBack, onBookAppointment }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="doctor-profile-page">
      <button className="back-link" onClick={onBack}>
        ← Back to Search
      </button>

      {/* ── Hero / Header Card ─────────────────────────────────────── */}
      <div className="profile-hero">
        <div className="profile-hero-photo">
          {doctor.photoUrl && !imgError ? (
            <img
              src={doctor.photoUrl}
              alt={doctor.name}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="profile-hero-initials">{getInitials(doctor.name)}</div>
          )}
        </div>

        <div className="profile-hero-info">
          <h1>{doctor.name}</h1>
          <p className="profile-qualification">{doctor.qualification || 'Specialist'}</p>
          <div className="profile-badges">
            <span className="profile-badge hospital">🏥 {doctor.hospitalName}</span>
            <span className="profile-badge dept">{doctor.departmentName}</span>
            <span className="profile-badge state">📍 {doctor.hospitalState}</span>
          </div>
          {doctor.hasUpcomingSlots ? (
            <div className="profile-availability available">🟢 Available — accepting new bookings</div>
          ) : (
            <div className="profile-availability unavailable">🟡 Currently fully booked</div>
          )}
        </div>

        <div className="profile-hero-actions">
          <button
            className="profile-book-btn"
            onClick={() => onBookAppointment(doctor)}
            disabled={!doctor.hasUpcomingSlots}
          >
            {doctor.hasUpcomingSlots ? '📅 Book Appointment' : 'No Slots Available'}
          </button>
        </div>
      </div>

      {/* ── Stats Row ──────────────────────────────────────────────── */}
      <div className="profile-stats-row">
        <div className="profile-stat">
          <span className="stat-num">{doctor.yearsOfExperience ?? 0}+</span>
          <span className="stat-label">Years Experience</span>
        </div>
        <div className="profile-stat">
          <span className="stat-num">{((doctor.totalPatientsTreated ?? 0) / 1000).toFixed(1)}k</span>
          <span className="stat-label">Patients Treated</span>
        </div>
        <div className="profile-stat">
          <span className="stat-num">{doctor.avgMinutesPerPatient ?? 15}</span>
          <span className="stat-label">Minutes / Patient</span>
        </div>
        <div className="profile-stat">
          <span className="stat-num">{doctor.dailyLimit ?? 0}</span>
          <span className="stat-label">Daily Capacity</span>
        </div>
      </div>

      {/* ── Bio Section ───────────────────────────────────────────── */}
      <section className="profile-section">
        <h2>About</h2>
        {doctor.bio ? (
          <p className="profile-bio">{doctor.bio}</p>
        ) : (
          <p className="profile-bio muted">
            Dr. {doctor.name.replace('Dr. ', '')} is a {doctor.departmentName} specialist practicing at {doctor.hospitalName}.
          </p>
        )}
      </section>

      {/* ── Practice Details ──────────────────────────────────────── */}
      <section className="profile-section">
        <h2>Practice Details</h2>
        <div className="profile-details-grid">
          <div className="profile-detail">
            <span className="detail-label">Hospital</span>
            <span className="detail-value">{doctor.hospitalName}</span>
          </div>
          <div className="profile-detail">
            <span className="detail-label">Department</span>
            <span className="detail-value">{doctor.departmentName}</span>
          </div>
          <div className="profile-detail">
            <span className="detail-label">Address</span>
            <span className="detail-value">{doctor.hospitalAddress || '—'}</span>
          </div>
          <div className="profile-detail">
            <span className="detail-label">State</span>
            <span className="detail-value">{doctor.hospitalState || '—'}</span>
          </div>
        </div>
      </section>
    </div>
  );
};
