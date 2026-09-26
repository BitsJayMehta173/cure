import React, { useState } from 'react';
import './AppointmentDetail.css';
import type { AppointmentSummary } from '../../../booking/types/booking.types';
import { ReportsPanel } from './ReportsPanel';
import { MedicinePanel } from './MedicinePanel';
import { StatusPanel } from './StatusPanel';
import { DownloadReportButton } from '../../report/DownloadReportButton';

type DetailSection = 'reports' | 'medicine' | 'status';

interface AppointmentDetailProps {
  appointment: AppointmentSummary;
  onBack: () => void;
}

export const AppointmentDetail: React.FC<AppointmentDetailProps> = ({ appointment, onBack }) => {
  // Default to Status — it's always populated, even for a future appointment
  // whose Reports/Medicine tabs are correctly empty until the visit happens.
  const [section, setSection] = useState<DetailSection>('status');

  const NAV_ITEMS: { key: DetailSection; label: string; icon: string }[] = [
    { key: 'reports', label: 'Reports', icon: '📄' },
    { key: 'medicine', label: 'Medicine', icon: '💊' },
    { key: 'status', label: 'Status', icon: '🩺' },
  ];

  return (
    <div className="appointment-detail">
      <button className="back-link" onClick={onBack}>← Back to Visits</button>

      <div className="detail-layout">
        <div className="detail-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              className={`detail-nav-btn ${section === item.key ? 'active' : ''}`}
              onClick={() => setSection(item.key)}
            >
              <span className="detail-nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
          {appointment.status !== 'cancelled' && (
            <DownloadReportButton appointmentId={appointment.id} style={{ marginTop: 12 }} />
          )}
        </div>

        <div className="detail-content">
          {section === 'reports' && <ReportsPanel appointmentId={appointment.id} />}
          {section === 'medicine' && <MedicinePanel appointmentId={appointment.id} />}
          {section === 'status' && <StatusPanel appointment={appointment} />}
        </div>
      </div>
    </div>
  );
};
