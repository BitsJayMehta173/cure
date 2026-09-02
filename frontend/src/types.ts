export type Status = 'warning' | 'stable' | 'critical'

export type Appointment = {
  initials: string
  name: string
  qualification: string
  date: string
  time: string
  token: number
  status: string
  statusType: Status
}

export type Hospital = {
  name: string
  count: number
  appointments: Appointment[]
}

export type Stat = {
  label: string
  value: string
}
