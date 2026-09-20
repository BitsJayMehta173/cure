import React, { useState, useEffect } from 'react';
import './DateGallery.css';
import { recordsApi } from '../../api/recordsApi';
import { bookingApi } from '../../../booking/api/bookingApi';
import type { AppointmentSummary } from '../../../booking/types/booking.types';
import type { PatientRecord } from '../../types/records.types';

interface DateGalleryProps {
  patient: PatientRecord;
  onBack: () => void;
  onSelectAppointment: (appointment: AppointmentSummary) => void;
}

interface DateGroup {
  date: string;
  appointments: AppointmentSummary[];
}

const formatDateHeading = (dateStr: string): string => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

export const DateGallery: React.FC<DateGalleryProps> = ({ patient, onBack, onSelectAppointment }) => {
  const [groups, setGroups] = useState<DateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Clear this patient's notification badge as soon as their gallery opens.
    recordsApi.markPatientRead(patient.id).catch(() => { /* non-fatal */ });

    bookingApi.getAppointments(patient.id)
      .then(data => {
        const byDate = new Map<string, AppointmentSummary[]>();
        for (const apt of data) {
          const list = byDate.get(apt.date) ?? [];
          list.push(apt);
          byDate.set(apt.date, list);
        }
        // Newest date first; within a date, earliest token first.
        const sortedGroups: DateGroup[] = Array.from(byDate.entries())
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([date, appointments]) => ({
            date,
            appointments: appointments.sort((a, b) => (a.tokenNumber ?? 0) - (b.tokenNumber ?? 0))
          }));
        setGroups(sortedGroups);
      })
      .catch((e) => {
        console.error(e);
        setError('Could not load appointments.');
      })
      .finally(() => setLoading(false));
  }, [patient.id]);

  return (
    <div className="date-gallery">
      <button className="back-link" onClick={onBack}>← Back to Patients</button>

      <div className="gallery-header">
        <h2>{patient.fullName}'s Visits</h2>
        <p>{patient.age} yrs • {patient.gender} • {patient.relation}</p>
      </div>

      {error && <div className="directory-error">⚠️ {error}</div>}

      {loading ? (
        <p className="loading-text">Loading visit history...</p>
      ) : groups.length === 0 ? (
        <div className="empty-state">No appointments found for this patient yet.</div>
      ) : (
        groups.map(group => (
          <section key={group.date} className="gallery-date-section">
            <div className="gallery-date-heading">
              <span className="gallery-date-big">{formatDateHeading(group.date)}</span>
              <span className="gallery-date-count">{group.appointments.length} appointment{group.appointments.length === 1 ? '' : 's'}</span>
            </div>
            <div className="gallery-grid">
              {group.appointments.map(apt => (
                <div
                  key={apt.id}
                  className={`gallery-tile status-${apt.status}`}
                  onClick={() => onSelectAppointment(apt)}
                >
                  <span className={`status-dot status-dot-${apt.status}`} />
                  <h4>{apt.doctorName || 'Assigned Specialist'}</h4>
                  <p className="gallery-tile-dept">{apt.departmentName}</p>
                  <p className="gallery-tile-hospital">{apt.hospitalName}</p>
                  <div className="gallery-tile-footer">
                    <span>{apt.expectedTimeStr || 'Pending'}</span>
                    <span className={`status-badge status-${apt.status}`}>{apt.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
};
