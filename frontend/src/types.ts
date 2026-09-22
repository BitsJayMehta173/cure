export type Status = 'warning' | 'stable' | 'critical' | 'success' | 'error'

export type Appointment = {
  initials: string
  name: string
  qualification: string
  date: string
  time: string
  token: number
  status: string
  statusType: Status
  tradeoffLabel?: string
  distanceKm?: number
  waitDays?: number
  // Transport fields from ML pipeline
  transportMode?: string
  transportEmoji?: string
  transportTimeHrs?: number
  transportDescription?: string
  isLongDistance?: boolean
  shiftHours?: string
  yearsOfExperience?: number
  totalPatientsTreated?: number
  avgMinutesPerPatient?: number
  aiScore?: number
  doctorId?: number
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

// Re-export travel route types
export type { TravelLeg, TravelPlan, CityPairRoutes } from './data/travelRoutes'

