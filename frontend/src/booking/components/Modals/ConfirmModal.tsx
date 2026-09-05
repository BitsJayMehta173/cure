import React, { useState, useEffect } from 'react';
import './ConfirmModal.css';
import { bookingApi } from '../../api/bookingApi';
import type { AvailableDoctor, BookingConfirmation } from '../../types/booking.types';

interface ConfirmModalProps {
  hospitalId: number;
  deptId: number;
  profileId: number;
  stateName: string;
  date: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ hospitalId, deptId, profileId, stateName, date, onClose, onSuccess }) => {
  const [doctors, setDoctors] = useState<AvailableDoctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  useEffect(() => {
    loadAvailableDoctors();
  }, []);

  const loadAvailableDoctors = async () => {
    try {
      const list = await bookingApi.getAvailableDoctors(hospitalId, deptId, date, stateName);
      setDoctors(list);
      if (list.length > 0) {
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

  const selectedDoctor = doctors.find(d => d.doctorId === selectedDoctorId) ?? null;

  const handleConfirm = async () => {
    if (!selectedDoctorId) return;
    setBooking(true);
    try {
      const data = await bookingApi.confirmBooking(profileId, hospitalId, deptId, date, selectedDoctorId);
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
            <button className="done-btn" onClick={onSuccess}>View Appointments</button>
          </div>
        ) : loading ? (
          <div className="loading-view">Loading available doctors...</div>
        ) : doctors.length === 0 ? (
          <div className="empty-view">
            <h2>No Doctors Available</h2>
            <p>No doctors in this department have open slots on {date}.</p>
            <button className="cancel-btn" onClick={onClose}>Back</button>
          </div>
        ) : selectedDoctor ? (
          <div className="preview-view">
            <h2>Confirm Appointment</h2>

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
              <button className="confirm-btn" onClick={handleConfirm} disabled={booking}>
                {booking ? 'Locking Slot...' : 'Confirm & Book'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
