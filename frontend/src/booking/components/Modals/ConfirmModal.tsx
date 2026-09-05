import React, { useState, useEffect } from 'react';
import './ConfirmModal.css';
import { bookingApi } from '../../api/bookingApi';
import type { TokenPreview, BookingConfirmation } from '../../types/booking.types';

interface ConfirmModalProps {
  hospitalId: number;
  deptId: number;
  profileId: number;
  date: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ hospitalId, deptId, profileId, date, onClose, onSuccess }) => {
  const [preview, setPreview] = useState<TokenPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  useEffect(() => {
    loadPreview();
  }, []);

  const loadPreview = async () => {
    try {
      const data = await bookingApi.getPreview(hospitalId, deptId, date);
      setPreview(data);
    } catch (e) {
      console.error(e);
      alert('Failed to load token preview.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setBooking(true);
    try {
      const data = await bookingApi.confirmBooking(profileId, hospitalId, deptId, date);
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
          <div className="loading-view">Calculating expected time...</div>
        ) : preview ? (
          <div className="preview-view">
            <h2>Confirm Appointment</h2>
            <div className="preview-card">
              <div className="doc-info">
                <h3>{preview.assignedDoctor}</h3>
                <span>{preview.doctorQualification}</span>
              </div>
              <div className="time-calc">
                <div className="calc-row">
                  <span>Your Token Number:</span>
                  <strong>{preview.tokenNumber}</strong>
                </div>
                <div className="calc-row">
                  <span>Time per patient:</span>
                  <strong>{preview.avgMinutesPerPatient} mins</strong>
                </div>
                <div className="calc-divider"></div>
                <div className="calc-row highlight">
                  <span>Expected Turn:</span>
                  <strong>{preview.expectedTimeStr}</strong>
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
