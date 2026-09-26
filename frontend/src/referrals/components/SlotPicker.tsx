import React, { useEffect, useState } from 'react';
import './referrals.css';
import { bookingApi } from '../../booking/api/bookingApi';
import type { SlotAvailability } from '../../booking/types/booking.types';

interface SlotPickerProps {
  hospitalId: number;
  deptId: number;
  value: string;
  onChange: (date: string) => void;
}

/** Current-month availability grid for one hospital department; click an available day to pick it. */
export const SlotPicker: React.FC<SlotPickerProps> = ({ hospitalId, deptId, value, onChange }) => {
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const month = new Date().toISOString().substring(0, 7);
    bookingApi.getSlots(hospitalId, deptId, month)
      .then(data => { if (active) setSlots(data); })
      .catch(() => { if (active) setSlots([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [hospitalId, deptId]);

  if (loading) return <p className="rf-meta">Loading available slots…</p>;
  if (!slots.some(s => s.status === 'available')) return <p className="rf-meta">No open slots left this month.</p>;

  return (
    <div className="rf-slots">
      {slots.map(slot => {
        const d = new Date(slot.date + 'T00:00:00');
        const available = slot.status === 'available';
        return (
          <div
            key={slot.date}
            className={`rf-slot ${available ? 'available' : ''} ${value === slot.date ? 'selected' : ''}`}
            onClick={() => available && onChange(slot.date)}
            title={slot.holidayName ?? undefined}
          >
            <div className="rf-slot-day">{d.getDate()}</div>
            <div className="rf-slot-name">{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
            {available && <div className="rf-slot-left">{slot.remainingSlots} slots</div>}
          </div>
        );
      })}
    </div>
  );
};
