import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';

interface DownloadReportButtonProps {
  appointmentId: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Downloads a PDF summary of one appointment (patient, doctor, hospital, advice,
 * reports, prescriptions). The PDF library is loaded only when clicked.
 */
export const DownloadReportButton: React.FC<DownloadReportButtonProps> = ({ appointmentId, className, style }) => {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const download = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || busy) return;
    setBusy(true);
    try {
      const { fetchAppointmentReport, downloadAppointmentReportPdf } = await import('./appointmentReport');
      downloadAppointmentReportPdf(await fetchAppointmentReport(appointmentId, user.id));
    } catch (err: any) {
      alert(err?.message || 'Could not download the report.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={className}
      style={{
        border: '1px solid var(--color-primary, #006078)', background: '#fff', color: 'var(--color-primary, #006078)',
        borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 600, cursor: busy ? 'wait' : 'pointer',
        width: '100%', ...style,
      }}
      onClick={download}
      disabled={busy}
      title="Download this appointment's report as a PDF"
    >
      {busy ? 'Preparing PDF…' : '⬇️ Download report (PDF)'}
    </button>
  );
};
