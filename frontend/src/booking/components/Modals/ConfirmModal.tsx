import React, { useState, useEffect } from 'react';
import './ConfirmModal.css';
import { bookingApi } from '../../api/bookingApi';
import type { AvailableDoctor, BookingConfirmation, PatientProfile } from '../../types/booking.types';

interface ConfirmModalProps {
  hospitalId: number;
  deptId: number;
  /**
   * Pre-selected patient profile. In doctor-select mode (wizard flow), this is
   * required and the modal books for that patient. In patient-select mode
   * (Doctor Directory flow), this is null and the user picks a patient inside
   * the modal.
   */
  profileId: number | null;
  stateName: string;
  date: string;
  /**
   * 'doctor-select' (default) — wizard flow, user picks a doctor from a dropdown
   * 'patient-select' — directory flow, doctor is pre-selected, user picks a patient
   */
  mode?: 'doctor-select' | 'patient-select';
  /**
   * Pre-select a specific doctor (used in patient-select mode from the directory)
   */
  defaultDoctorId?: number;
  /**
   * Called on successful booking. In patient-select mode, the chosen profileId is passed.
   * The BookingRoot can then auto-navigate to the follow-up page with that profile selected.
   */
  onSuccess: (bookedProfileId?: number) => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  hospitalId, deptId, profileId, stateName, date,
  mode = 'doctor-select', defaultDoctorId, onSuccess, onClose
}) => {
  const [doctors, setDoctors] = useState<AvailableDoctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(
    defaultDoctorId ?? null
  );
  const [patientProfiles, setPatientProfiles] = useState<PatientProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(
    mode === 'doctor-select' ? profileId : null
  );
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  useEffect(() => {
    if (mode === 'patient-select') {
      loadForPatientMode();
    } else {
      loadAvailableDoctors();
    }
  }, []);

  const loadAvailableDoctors = async () => {
    try {
      const list = await bookingApi.getAvailableDoctors(hospitalId, deptId, date, stateName);
      setDoctors(list);
      if (list.length > 0 && selectedDoctorId === null) {
        setSelectedDoctorId(list[0].doctorId);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to load available doctors.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // Patient-select mode: doctor is fixed, user picks the patient profile.
  const loadForPatientMode = async () => {
    try {
      const [doctorList, profiles] = await Promise.all([
        bookingApi.getAvailableDoctors(hospitalId, deptId, date, stateName),
        bookingApi.getProfiles()
      ]);
      setDoctors(doctorList);
      setPatientProfiles(profiles);
      // Auto-select the default doctor if it appears in the list; otherwise pick first
      if (doctorList.length > 0) {
        const match = defaultDoctorId
          ? doctorList.find(d => d.doctorId === defaultDoctorId)
          : undefined;
        setSelectedDoctorId(match?.doctorId ?? doctorList[0].doctorId);
      }
      if (profiles.length === 1) {
        setSelectedProfileId(profiles[0].id);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to load booking details.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const selectedDoctor = doctors.find(d => d.doctorId === selectedDoctorId) ?? null;
  const effectiveProfileId = mode === 'patient-select' ? selectedProfileId : profileId;

  const handleConfirm = async () => {
    if (!selectedDoctorId) return;
    if (mode === 'patient-select' && !selectedProfileId) {
      alert('Please select a patient profile.');
      return;
    }
    setBooking(true);
    try {
      const data = await bookingApi.confirmBooking(
        effectiveProfileId!, hospitalId, deptId, date, selectedDoctorId
      );
      setConfirmation(data);
    } catch (e) {
      console.error(e);
      alert('Booking failed. The slot may have been taken.');
      onClose();
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="confirm-modal">
        {confirmation ? (
          <div className="success-view">
            <div className="success-icon">✅</div>
            <h2>Booking Confirmed!</h2>
            <div className="token-display">
              <span className="token-label">YOUR TOKEN</span>
              <span className="token-code">{confirmation.tokenCode}</span>
            </div>
            <div className="confirm-details">
              <p><strong>Doctor:</strong> {confirmation.doctorName}</p>
              <p><strong>Date:</strong> {confirmation.date}</p>
              <p><strong>Expected Time:</strong> {confirmation.expectedTimeStr}</p>
            </div>
            <button className="done-btn" onClick={() => onSuccess(effectiveProfileId ?? undefined)}>View Appointments</button>
          </div>
        ) : loading ? (
          <div className="loading-view">Loading booking details...</div>
        ) : doctors.length === 0 ? (
          <div className="empty-view">
            <h2>No Doctors Available</h2>
            <p>No doctors in this department have open slots on {date}.</p>
            <button className="cancel-btn" onClick={onClose}>Back</button>
          </div>
        ) : selectedDoctor ? (
          <div className="preview-view">
            <h2>Confirm Appointment</h2>

            {/* Doctor selector — only shown in 'doctor-select' mode */}
            {mode === 'doctor-select' && (
              <>
                <label className="doctor-select-label" htmlFor="doctor-select">
                  Choose your doctor
                </label>
                <select
                  id="doctor-select"
                  className="doctor-select"
                  value={selectedDoctorId ?? ''}
                  onChange={(e) => setSelectedDoctorId(Number(e.target.value))}
                  disabled={booking}
                >
                  {doctors.map((d) => (
                    <option key={d.doctorId} value={d.doctorId}>
                      {d.doctorName} — Token {d.tokenNumber} ({d.remainingSlots} slot{d.remainingSlots === 1 ? '' : 's'} left)
                    </option>
                  ))}
                </select>
              </>
            )}

            {/* Patient selector — only shown in 'patient-select' mode (Doctor Directory flow) */}
            {mode === 'patient-select' && (
              <>
                <label className="doctor-select-label" htmlFor="patient-select">
                  Book appointment for
                </label>
                <select
                  id="patient-select"
                  className="doctor-select"
                  value={selectedProfileId ?? ''}
                  onChange={(e) => setSelectedProfileId(Number(e.target.value))}
                  disabled={booking}
                >
                  <option value="">-- Select a patient --</option>
                  {patientProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.age} yrs, {p.relation})
                    </option>
                  ))}
                </select>
                {patientProfiles.length === 0 && (
                  <p style={{ fontSize: 13, color: '#92400e', marginTop: 6 }}>
                    No patient profiles found. Please create one in the Booking tab first.
                  </p>
                )}
              </>
            )}

            <div className="preview-card">
              <div className="doc-info">
                <h3>{selectedDoctor.doctorName}</h3>
                <span>
                  {selectedDoctor.qualification}
                  {selectedDoctor.yearsOfExperience ? ` • ${selectedDoctor.yearsOfExperience} yrs exp` : ''}
                </span>
              </div>
              <div className="time-calc">
                <div className="calc-row">
                  <span>Your Token Number:</span>
                  <strong>{selectedDoctor.tokenNumber}</strong>
                </div>
                <div className="calc-row">
                  <span>Time per patient:</span>
                  <strong>{selectedDoctor.avgMinutesPerPatient} mins</strong>
                </div>
                <div className="calc-row">
                  <span>Remaining slots today:</span>
                  <strong>{selectedDoctor.remainingSlots}</strong>
                </div>
                <div className="calc-divider"></div>
                <div className="calc-row highlight">
                  <span>Expected Turn:</span>
                  <strong>{selectedDoctor.expectedTimeStr}</strong>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={onClose} disabled={booking}>Cancel</button>
              <button
                className="confirm-btn"
                onClick={handleConfirm}
                disabled={booking || (mode === 'patient-select' && !selectedProfileId)}
              >
                {booking ? 'Locking Slot...' : 'Confirm & Book'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
