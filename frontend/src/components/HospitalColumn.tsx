import type { Hospital, Appointment } from '../types'
import { AppointmentCard } from './AppointmentCard'
import { Slider } from './Slider'

export function HospitalColumn({ 
  hospital,
  onSelectAppointment,
  onToggleCompare,
  compareList = [],
  urgencyScore
}: { 
  hospital: Hospital,
  onSelectAppointment?: (app: Appointment) => void,
  onToggleCompare?: (app: Appointment) => void,
  compareList?: Appointment[],
  urgencyScore?: number
}) {
  return (
    <article className="column">
      <div className="column-title"><span>{hospital.name}</span><span className="column-number">{hospital.count}</span></div>
      <Slider className="appointment-slider" direction="vertical" label="appointment">
        {hospital.appointments.map((appointment) => (
          <AppointmentCard 
            key={`${hospital.name}-${appointment.token}`} 
            appointment={appointment} 
            onSelect={onSelectAppointment}
            onToggleCompare={onToggleCompare}
            isCompared={compareList.some(a => a.token === appointment.token && a.name === appointment.name)}
            urgencyScore={urgencyScore}
          />
        ))}
      </Slider>
    </article>
  )
}
