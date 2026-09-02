import type { Hospital } from '../types'
import { AppointmentCard } from './AppointmentCard'
import { Slider } from './Slider'

export function HospitalColumn({ hospital }: { hospital: Hospital }) {
  return (
    <article className="column">
      <div className="column-title"><span>{hospital.name}</span><span className="column-number">{hospital.count}</span></div>
      <Slider className="appointment-slider" direction="vertical" label="appointment">
        {hospital.appointments.map((appointment) => <AppointmentCard key={`${hospital.name}-${appointment.token}`} appointment={appointment} />)}
      </Slider>
    </article>
  )
}
