import React, { useState, useEffect } from 'react';
import { Slider } from '../../../components/Slider';
import { recordsApi } from '../../api/recordsApi';
import type { MedicalReport } from '../../types/records.types';

interface ReportsPanelProps {
  appointmentId: number;
}

export const ReportsPanel: React.FC<ReportsPanelProps> = ({ appointmentId }) => {
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    recordsApi.getReports(appointmentId)
      .then(setReports)
      .catch((e) => {
        console.error(e);
        setError('Could not load reports.');
      })
      .finally(() => setLoading(false));
  }, [appointmentId]);

  if (loading) return <p className="loading-text">Loading reports...</p>;
  if (error) return <div className="directory-error">⚠️ {error}</div>;
  if (reports.length === 0) {
    return (
      <div className="empty-state">
        No reports yet for this appointment — check back after your visit.
      </div>
    );
  }

  return (
    <Slider className="reports-slider" label="reports">
      {reports.map(r => (
        <div key={r.id} className="report-slide">
          <div className="report-slide-header">
            <h4>{r.title}</h4>
            <div className="report-slide-meta">
              <span className="report-slide-date">{r.reportDate}</span>
              {r.authorName && <span className="report-slide-author" style={{ marginLeft: '12px', fontStyle: 'italic', color: 'var(--color-primary, #00766c)' }}>👤 {r.authorName}</span>}
            </div>
          </div>
          {r.reportType === 'image' && r.fileUrl ? (
            <img className="report-slide-image" src={r.fileUrl} alt={r.title} />
          ) : (
            <p className="report-slide-text">{r.textContent}</p>
          )}
        </div>
      ))}
    </Slider>
  );
};
