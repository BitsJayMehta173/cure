import React, { useEffect, useState } from 'react';
import type { AppointmentSummary } from '../../../booking/types/booking.types';
import { useAuth } from '../../../auth/AuthContext';
import { followUpApi, referralApi } from '../../../referrals/api/referralApi';
import type { AppointmentStatus, FollowUp } from '../../../referrals/types/referral.types';
import { StatusBadge, StatusTimeline } from '../../../referrals/components/StatusTimeline';
import { PatientCareItems } from '../../../referrals/components/PatientCareItems';
import { ReferredFromInfo } from '../../../referrals/components/ReferredFromInfo';

interface StatusPanelProps {
  appointment: AppointmentSummary;
}

/** Visit status, timeline, and the referrals/follow-ups that came out of this visit — all server-computed. */
export const StatusPanel: React.FC<StatusPanelProps> = ({ appointment }) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<AppointmentStatus | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);

  const load = () => {
    if (!user) return;
    referralApi.appointmentStatus(appointment.id, { userId: user.id })
      .then(setStatus)
      .catch(() => setStatus(null));
    followUpApi.forPatient(user.id)
      .then(list => setFollowUps(list.filter(f => f.sourceAppointment?.id === appointment.id)))
      .catch(() => setFollowUps([]));
  };
  useEffect(load, [appointment.id, user?.id]);

  const display = status?.displayStatus ?? appointment.displayStatus ?? appointment.status;

  return (
    <div className="status-panel">
      <div className="status-panel-top">
        <div>
          <h3>{appointment.hospitalName}</h3>
          <p className="status-panel-dept">{appointment.departmentName}</p>
        </div>
        <StatusBadge status={display} label={status?.displayLabel ?? display} />
      </div>

      {status && <StatusTimeline steps={status.timeline} />}
      {status?.referredFrom && <ReferredFromInfo referral={status.referredFrom} />}

      {user && status && (
        <div className="rf-list" style={{ marginBottom: 16 }}>
          <PatientCareItems
            userId={user.id}
            referrals={status.referrals}
            followUps={followUps}
            onChanged={load}
          />
        </div>
      )}

      <div className="status-detail-grid">
        <div className="status-detail-box">
          <span className="label">Doctor</span>
          <span className="value">{appointment.doctorName || 'Assigned Specialist'}</span>
        </div>
        <div className="status-detail-box">
          <span className="label">Date</span>
          <span className="value">{appointment.date}</span>
        </div>
        <div className="status-detail-box">
          <span className="label">Token Number</span>
          <span className="value">{appointment.tokenNumber}</span>
        </div>
        <div className="status-detail-box highlight">
          <span className="label">Expected Time</span>
          <span className="value">{appointment.expectedTimeStr || 'Pending'}</span>
        </div>
      </div>
    </div>
  );
};
