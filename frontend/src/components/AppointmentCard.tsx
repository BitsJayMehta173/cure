import type { Appointment } from '../types'

export function AppointmentCard({ 
  appointment, 
  onSelect,
  onToggleCompare,
  isCompared
}: { 
  appointment: Appointment, 
  onSelect?: (appointment: Appointment) => void,
  onToggleCompare?: (appointment: Appointment) => void,
  isCompared?: boolean
}) {
  return (
    <article className={`case-card ${isCompared ? 'compared' : ''}`} onClick={() => onSelect && onSelect(appointment)}>
      <div className="person">
        <div className="avatar">{appointment.initials}</div>
        <div className="person-info">
          <div className="person-name">{appointment.name}</div>
          <div className="day">{appointment.qualification}</div>
        </div>
        {onToggleCompare && (
          <input 
            type="checkbox" 
            className="compare-checkbox"
            checked={isCompared}
            onChange={(e) => {
              e.stopPropagation() // Prevent triggering the booking modal
              onToggleCompare(appointment)
            }}
            title="Select for comparison"
          />
        )}
      </div>
      <div className="amount">{appointment.date}</div>
      <div className="details">{appointment.time}<br />Token Number: {appointment.token}</div>
      <div className="card-footer">
        <span className={`status ${appointment.statusType}`}>{appointment.status}</span>
        {appointment.tradeoffLabel && (
          <div className="tradeoff-label">{appointment.tradeoffLabel}</div>
        )}
      </div>
    </article>
  )
}
