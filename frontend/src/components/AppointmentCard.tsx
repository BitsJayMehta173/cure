import type { Appointment } from '../types'

export function AppointmentCard({ appointment }: { appointment: Appointment }) {
  return (
    <article className="case-card">
      <div className="person">
        <div className="avatar">{appointment.initials}</div>
        <div className="person-info">
          <div className="person-name">{appointment.name}</div>
          <div className="day">{appointment.qualification}</div>
        </div>
      </div>
      <div className="amount">{appointment.date}</div>
      <div className="details">{appointment.time}<br />Token Number: {appointment.token}</div>
      <span className={`status ${appointment.statusType}`}>{appointment.status}</span>
    </article>
  )
}
