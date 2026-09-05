import React, { useState, useEffect } from 'react';
import './CalendarStep.css';
import { bookingApi } from '../../api/bookingApi';
import type { SlotAvailability } from '../../types/booking.types';
import { ConfirmModal } from '../Modals/ConfirmModal';

interface CalendarStepProps {
  hospitalId: number;
  deptId: number;
  profileId: number;
  onBookingSuccess: () => void;
  onBack: () => void;
}

export const CalendarStep: React.FC<CalendarStepProps> = ({ hospitalId, deptId, profileId, onBookingSuccess, onBack }) => {
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Use current month for simple MVP
  const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

  useEffect(() => {
    loadSlots();
  }, [hospitalId, deptId]);

  const loadSlots = async () => {
    try {
      const data = await bookingApi.getSlots(hospitalId, deptId, currentMonth);
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

  return (
    <div className="calendar-step">
      <button className="back-link" onClick={onBack}>
        ← Back to Departments
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
          profileId={profileId}
          date={selectedDate}
          onClose={() => setShowConfirmModal(false)}
          onSuccess={onBookingSuccess}
        />
      )}
    </div>
  );
};
