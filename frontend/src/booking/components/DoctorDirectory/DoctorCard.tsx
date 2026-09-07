import React from 'react';
import './DoctorCard.css';
import type { DoctorSearchResult } from '../../types/booking.types';

interface DoctorCardProps {
  doctor: DoctorSearchResult;
  onClick: (doctor: DoctorSearchResult) => void;
}

const getInitials = (name: string) => {
  if (!name) return 'DR';
  return name.replace('Dr.', '').trim().split(' ').slice(0, 2).map(p => p.charAt(0)).join('').toUpperCase();
};

export const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onClick }) => {
  const [imgError, setImgError] = React.useState(false);

  return (
    <div className="doctor-card" onClick={() => onClick(doctor)}>
      <div className="doctor-card-photo">
        {doctor.photoUrl && !imgError ? (
          <img
            src={doctor.photoUrl}
            alt={doctor.name}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="doctor-card-initials">{getInitials(doctor.name)}</div>
        )}
      </div>
      <div className="doctor-card-body">
        <h3 className="doctor-card-name">{doctor.name}</h3>
        <p className="doctor-card-qualification">{doctor.qualification || 'Specialist'}</p>
        <div className="doctor-card-meta">
          <span className="meta-badge hospital">🏥 {doctor.hospitalName}</span>
          <span className="meta-badge dept">{doctor.departmentName}</span>
        </div>
        <div className="doctor-card-stats">
          <span>⭐ {doctor.yearsOfExperience ?? 0}+ yrs exp</span>
          <span>👥 {((doctor.totalPatientsTreated ?? 0) / 1000).toFixed(1)}k patients</span>
        </div>
        <button className="doctor-card-cta">View Profile →</button>
      </div>
    </div>
  );
};
