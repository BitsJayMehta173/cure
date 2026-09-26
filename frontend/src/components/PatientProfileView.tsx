import React, { useState, useEffect } from 'react';
import './PatientProfileView.css';
import { ReferralModal } from './ReferralModal';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface PatientProfileViewProps {
  patientId: number;
  doctorId: number;
  onClose: () => void;
  /** Inside the referral workspace: no back button / refer actions (the workspace owns those). */
  embedded?: boolean;
}

interface HistoryItem {
  id: number;
  dateStr: string;
  status: string;
  generalAdvice: string;
  hospitalName: string;
  departmentName: string;
  doctorName: string;
  ownRecord: boolean;
  parentAppointmentId: number | null;
}

/**
 * A doctor's view of one patient: bio + the visits this doctor may see. Which visits
 * are visible is decided server-side (ReferralService.viewableAppointmentIds): own visits,
 * referred visits and the earlier visits in their care chain — each tagged with its owner.
 */
export const PatientProfileView: React.FC<PatientProfileViewProps> = ({ patientId, doctorId, onClose, embedded }) => {
  const [activeTab, setActiveTab] = useState<'bio' | 'history'>(embedded ? 'history' : 'bio');
  const [patient, setPatient] = useState<any>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApptId, setSelectedApptId] = useState<number | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);

  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [referralApptId, setReferralApptId] = useState<number | null>(null); // null = whole history

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [profileRes, historyRes] = await Promise.all([
          fetch(`${API_BASE}/api/doctor-portal/patients/${patientId}/profile`),
          fetch(`${API_BASE}/api/doctor-portal/patients/${patientId}/history?doctorId=${doctorId}`)
        ]);
        if (profileRes.ok) setPatient(await profileRes.json());
        if (historyRes.ok) {
          const histData: HistoryItem[] = await historyRes.json();
          setHistory(histData);
          if (histData.length > 0) setSelectedApptId(histData[0].id);
        }
      } catch (e) {
        console.error('Error fetching patient profile', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [patientId, doctorId]);

  // Reports & prescriptions of the selected visit (visit list is already access-filtered)
  useEffect(() => {
    if (!selectedApptId) { setReports([]); setMedicines([]); return; }
    fetch(`${API_BASE}/api/records/reports?appointmentId=${selectedApptId}&userId=0`)
      .then(r => (r.ok ? r.json() : [])).then(setReports).catch(() => setReports([]));
    fetch(`${API_BASE}/api/records/medicines?appointmentId=${selectedApptId}&userId=0`)
      .then(r => (r.ok ? r.json() : [])).then(setMedicines).catch(() => setMedicines([]));
  }, [selectedApptId]);

  const handleOpenReferral = (apptId: number | null) => {
    setReferralApptId(apptId);
    setIsReferralOpen(true);
  };

  if (loading) return <div className="patient-profile-loading">Loading Patient Profile...</div>;
  if (!patient) return <div className="patient-profile-error">Patient not found <button onClick={onClose}>Back</button></div>;

  const selectedAppt = history.find(a => a.id === selectedApptId);

  return (
    <div className="patient-profile-container">
      <div className="patient-profile-header">
        {!embedded && <button className="back-btn" onClick={onClose}>&larr; Back to Directory</button>}
        <div className="patient-header-info">
          <h2>{embedded ? `Shared records · ${patient.fullName}` : patient.fullName}</h2>
          <div className="patient-badges">
            <span className="badge">{patient.age}y - {patient.gender}</span>
            <span className="badge blood-group">Blood: {patient.bloodGroup || 'Unknown'}</span>
          </div>
        </div>
        {!embedded && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="refer-primary-btn" onClick={() => handleOpenReferral(null)}>
              Refer Patient
            </button>
          </div>
        )}
      </div>

      <div className="profile-tabs">
        <button className={`tab ${activeTab === 'bio' ? 'active' : ''}`} onClick={() => setActiveTab('bio')}>Bio & Profile</button>
        <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>Medical History</button>
      </div>

      <div className="profile-content">
        {activeTab === 'bio' && (
          <div className="bio-section">
            <div className="bio-card">
              <h3>Personal Information</h3>
              <div className="bio-grid">
                <div className="bio-item"><strong>Mobile:</strong> {patient.mobile}</div>
                <div className="bio-item"><strong>Relation:</strong> {patient.relation}</div>
                <div className="bio-item"><strong>Location:</strong> {patient.location || 'Not provided'}</div>
                <div className="bio-item" style={{ gridColumn: '1 / -1' }}>
                  <strong>Address:</strong> {patient.address || 'Not provided'}
                </div>
              </div>
            </div>
            <div className="bio-card health-profile">
              <h3>Health Profile</h3>
              <p>{patient.healthProfile || 'No health profile details provided.'}</p>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-section">
            <div className="history-sidebar">
              <h4>Visits you can see</h4>
              {history.length === 0 ? (
                <div className="no-history">No medical history available.</div>
              ) : (
                <ul className="history-list">
                  {history.map(appt => (
                    <li
                      key={appt.id}
                      className={`history-list-item ${selectedApptId === appt.id ? 'active' : ''}`}
                      onClick={() => setSelectedApptId(appt.id)}
                    >
                      <div className="hist-date">{appt.dateStr}</div>
                      <div className="hist-doc">{appt.doctorName} · {appt.departmentName}</div>
                      <div className="hist-doc">{appt.ownRecord ? '🩺 Your visit' : `📁 ${appt.hospitalName}`}</div>
                      <div className={`hist-status status-${appt.status?.toLowerCase()}`}>{appt.status}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="history-detail">
              {selectedAppt ? (
                <div className="appt-detail-card">
                  <div className="appt-detail-header">
                    <h3>Visit Details: {selectedAppt.dateStr}</h3>
                    {!embedded && (
                      <button className="refer-secondary-btn" onClick={() => handleOpenReferral(selectedAppt.id)}>
                        Refer this Case
                      </button>
                    )}
                  </div>

                  <div className="appt-info-grid">
                    <div><strong>Doctor:</strong> {selectedAppt.doctorName}{selectedAppt.ownRecord ? ' (you)' : ''}</div>
                    <div><strong>Department:</strong> {selectedAppt.departmentName}</div>
                    <div><strong>Hospital:</strong> {selectedAppt.hospitalName}</div>
                    <div><strong>Status:</strong> {selectedAppt.status}</div>
                  </div>

                  <div className="appt-advice-section">
                    <h4>General Advice</h4>
                    <div className="advice-box">
                      {selectedAppt.generalAdvice || 'No advice recorded for this visit.'}
                    </div>
                  </div>

                  <div className="appt-advice-section">
                    <h4>Reports</h4>
                    {reports.length === 0 ? (
                      <div className="advice-box">No reports for this visit.</div>
                    ) : reports.map((r: any) => (
                      <div key={r.id} className="advice-box" style={{ marginBottom: 8 }}>
                        <strong>📄 {r.title}</strong> <span style={{ color: '#7a8a99', fontSize: 12 }}>· {r.reportDate}{r.authorName ? ` · by ${r.authorName}` : ''}</span>
                        {r.textContent && <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{r.textContent}</div>}
                        {r.fileUrl && <img src={r.fileUrl} alt={r.title} style={{ maxWidth: '100%', marginTop: 6, borderRadius: 6 }} />}
                      </div>
                    ))}
                  </div>

                  <div className="appt-advice-section">
                    <h4>Prescriptions</h4>
                    {medicines.length === 0 ? (
                      <div className="advice-box">No prescriptions for this visit.</div>
                    ) : medicines.map((m: any) => (
                      <div key={m.id} className="advice-box" style={{ marginBottom: 8 }}>
                        <strong>💊 {m.medicineName}</strong>{m.dosage ? ` · ${m.dosage}` : ''}{m.frequency ? ` · ${m.frequency}` : ''}{m.duration ? ` · ${m.duration}` : ''}
                        {m.instructions && <div style={{ marginTop: 4 }}>{m.instructions}</div>}
                        {m.authorName && <div style={{ color: '#7a8a99', fontSize: 12, marginTop: 4 }}>by {m.authorName}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="select-prompt">Select a visit from the left to view details.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {isReferralOpen && (
        <ReferralModal
          patientId={patientId}
          patientName={patient.fullName}
          currentDoctorId={doctorId}
          appointmentId={referralApptId}
          onClose={() => setIsReferralOpen(false)}
        />
      )}
    </div>
  );
};
