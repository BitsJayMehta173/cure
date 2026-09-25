import React, { useState, useEffect } from 'react';
import './CalendarStep.css';
import { bookingApi } from '../../api/bookingApi';
import type { SlotAvailability } from '../../types/booking.types';
import { ConfirmModal } from '../Modals/ConfirmModal';

interface CalendarStepProps {
  hospitalId: number;
  deptId: number;
  /**
   * Pre-selected patient profile (used by the wizard flow).
   * In the Doctor Directory flow, this is null — the patient is selected
   * inside the confirm modal after the user clicks an available date.
   */
  profileId: number | null;
  stateName: string;
  /**
   * Optional — when set, the confirm modal opens in patient-select mode
   * (the doctor is pre-selected) and skips the doctor dropdown.
   * Used by the Doctor Directory "Book Appointment" flow.
   */
  doctorId?: number;
  /**
   * When set (referral flow), the patient is locked to this profile ID —
   * the patient picker in the confirm modal is hidden entirely.
   */
  lockedProfileId?: number;
  onBookingSuccess: (bookedProfileId?: number, appointmentId?: number) => void;
  onBack: () => void;
}

export const CalendarStep: React.FC<CalendarStepProps> = ({
  hospitalId, deptId, profileId, stateName,
  doctorId, lockedProfileId, onBookingSuccess, onBack
}) => {
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const currentMonth = new Date().toISOString().substring(0, 7);

  useEffect(() => {
    loadSlots();
  }, [hospitalId, deptId, stateName]);

  const loadSlots = async () => {
    try {
      const data = await bookingApi.getSlots(hospitalId, deptId, currentMonth, stateName);
      setSlots(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (slot: SlotAvailability) => {
    if (slot.status === 'available') {
      setSelectedDate(slot.date);
      setShowConfirmModal(true);
    }
  };

  // Determine effective profile and mode:
  // - lockedProfileId: referral flow — patient locked, doctor auto-assigned from doctorId
  // - doctorId (no lock): directory flow — patient picker shown
  // - neither: wizard flow — profile pre-selected, doctor picker shown
  const effectiveProfileId = lockedProfileId ?? profileId;
  const modalMode = (doctorId && !lockedProfileId) ? 'patient-select' : 'doctor-select';

  return (
    <div className="calendar-step">
      <button className="back-link" onClick={onBack}>
        {lockedProfileId ? '← Back to Appointments' : doctorId ? '← Back to Profile' : '← Back to Departments'}
      </button>

      <div className="calendar-header">
        <h2>Select a Date</h2>
        <p>Green slots are available. Red slots are full. Orange indicates a holiday.</p>
      </div>

      {loading ? (
        <p className="loading-text">Checking real-time slot availability...</p>
      ) : (
        <div className="calendar-grid">
          {slots.map(slot => {
            const dateObj = new Date(slot.date);
            const dayNum = dateObj.getDate();
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

            return (
              <div
                key={slot.date}
                className={`calendar-cell status-${slot.status}`}
                onClick={() => handleDateClick(slot)}
              >
                <div className="cell-date">{dayNum}</div>
                <div className="cell-day">{dayName}</div>

                {slot.status === 'available' && (
                  <div className="cell-meta">{slot.remainingSlots} slots</div>
                )}
                {slot.status === 'full' && (
                  <div className="cell-meta">Fully Booked</div>
                )}
                {slot.status === 'holiday' && (
                  <div className="cell-meta holiday">{slot.holidayName}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showConfirmModal && selectedDate && (
        <ConfirmModal
          hospitalId={hospitalId}
          deptId={deptId}
          profileId={effectiveProfileId}
          stateName={stateName}
          date={selectedDate}
          mode={modalMode}
          defaultDoctorId={doctorId}
          lockedProfileId={lockedProfileId}
          onClose={() => setShowConfirmModal(false)}
          onSuccess={onBookingSuccess}
        />
      )}
    </div>
  );
};
