import React, { useState, useEffect } from 'react';
import './PatientProfileView.css';
import { ReferralModal } from './ReferralModal';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface PatientProfileViewProps {
  patientId: number;
  doctorId: number;
  onClose: () => void;
  restrictedAppointmentId?: number | null;
  onOpenAppointment?: (appointmentId: number) => void;
  referralId?: number;
  referralStatus?: string;
  onAnalysisComplete?: (referralId: number) => void;
}

export const PatientProfileView: React.FC<PatientProfileViewProps> = ({ 
  patientId, doctorId, onClose, restrictedAppointmentId, onOpenAppointment, 
  referralId, referralStatus, onAnalysisComplete 
}) => {
  const [activeTab, setActiveTab] = useState<'bio' | 'history'>('bio');
  const [patient, setPatient] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Master-detail state for history
  const [selectedApptId, setSelectedApptId] = useState<number | null>(null);

  // Referral Modal State
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [referralApptId, setReferralApptId] = useState<number | null>(null); // null means refer whole history

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [profileRes, historyRes] = await Promise.all([
          fetch(`${API_BASE}/api/doctor-portal/patients/${patientId}/profile`),
          fetch(`${API_BASE}/api/doctor-portal/patients/${patientId}/history?doctorId=${doctorId}`)
        ]);
        
        if (profileRes.ok) {
          setPatient(await profileRes.json());
        }
        if (historyRes.ok) {
          let histData = await historyRes.json();
          // Filter if this is a restricted (single-case) referral
          if (restrictedAppointmentId) {
            histData = histData.filter((a: any) => a.id === restrictedAppointmentId);
          }
          setHistory(histData);
          if (histData.length > 0) {
            setSelectedApptId(histData[0].id);
          }
        }
      } catch (e) {
        console.error("Error fetching patient profile", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [patientId, restrictedAppointmentId]);

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
        <button className="back-btn" onClick={onClose}>&larr; Back to Directory</button>
        <div className="patient-header-info">
          <h2>{patient.fullName}</h2>
          <div className="patient-badges">
            <span className="badge">{patient.age}y - {patient.gender}</span>
            <span className="badge blood-group">Blood: {patient.bloodGroup || 'Unknown'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {referralId && referralStatus !== 'analysed' && onAnalysisComplete && (
            <button 
              className="refer-primary-btn" 
              style={{ background: '#059669', borderColor: '#059669' }}
              onClick={() => onAnalysisComplete(referralId)}
            >
              ✅ Complete Analysis
            </button>
          )}
          {referralId && referralStatus === 'analysed' && (
            <span className="badge" style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #10b981' }}>
              Analysis Completed
            </span>
          )}
          <button className="refer-primary-btn" onClick={() => handleOpenReferral(null)}>
            Refer Patient
          </button>
        </div>
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
              <h4>Past Visits</h4>
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
                      <div className="hist-doc">{appt.departmentName} - {appt.hospitalName}</div>
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
                    <div style={{display: 'flex', gap: '8px'}}>
                      {onOpenAppointment && (
                        <button className="refer-primary-btn" onClick={() => onOpenAppointment(selectedAppt.id)}>
                          Open Medical Report
                        </button>
                      )}
                      <button className="refer-secondary-btn" onClick={() => handleOpenReferral(selectedAppt.id)}>
                        Refer this Case
                      </button>
                    </div>
                  </div>
                  
                  <div className="appt-info-grid">
                    <div><strong>Doctor:</strong> {selectedAppt.doctorName}</div>
                    <div><strong>Department:</strong> {selectedAppt.departmentName}</div>
                    <div><strong>Hospital:</strong> {selectedAppt.hospitalName}</div>
                    <div><strong>Status:</strong> {selectedAppt.status}</div>
                  </div>
                  
                  <div className="appt-advice-section">
                    <h4>General Advice & Prescription</h4>
                    <div className="advice-box">
                      {selectedAppt.generalAdvice || 'No advice/prescription recorded for this visit.'}
                    </div>
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
