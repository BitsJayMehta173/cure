import type { Hospital, Stat } from './types'

export const stats: Stat[] = [
  { label: 'Total Available Doctors', value: '248' },
  { label: 'Total Live Hospitals', value: '42' },
  { label: 'Total Available Beds', value: '1,284' },
  { label: 'Shortest Queue', value: '3' },
]

export const hospitals: Hospital[] = [
  {
    name: 'AIIMS JODHPUR',
    count: 8,
    appointments: [
      { initials: 'SM', name: 'Ravi Kishan', qualification: 'MBBS', date: '2026/09/05', time: '11:15 AM TO 11:45 AM', token: 3, status: 'Filling Fast', statusType: 'warning' },
      { initials: 'DL', name: 'Amit Joshi', qualification: 'MBBS, Pediatrics', date: '2026/09/06', time: '10:30 AM TO 11:00 AM', token: 5, status: 'Available', statusType: 'stable' },
      { initials: 'RK', name: 'Rohan Kumar', qualification: 'MD Internal Medicine', date: '2026/09/13', time: '06:30 PM TO 07:00 PM', token: 30, status: 'Available', statusType: 'stable' },
    ],
  },
  {
    name: 'SMS HOSPITAL JAIPUR',
    count: 2,
    appointments: [
      { initials: 'CF', name: 'Neha Sharma', qualification: 'MD Cardiology', date: '2026/09/08', time: '12:00 PM TO 12:30 PM', token: 7, status: 'Available', statusType: 'stable' },
      { initials: 'PA', name: 'Kavita Rao', qualification: 'MD Dermatology', date: '2026/09/07', time: '02:15 PM TO 02:45 PM', token: 11, status: 'Available', statusType: 'stable' },
    ],
  },
  {
    name: 'FORTIS HOSPITAL JAIPUR',
    count: 1,
    appointments: [
      { initials: 'RD', name: 'Arjun Mehta', qualification: 'MBBS, General Medicine', date: '2026/09/09', time: '03:30 PM TO 04:00 PM', token: 15, status: 'Late Available', statusType: 'critical' },
      { initials: 'VK', name: 'Vikram Kapoor', qualification: 'MD Neurology', date: '2026/09/11', time: '05:00 PM TO 05:30 PM', token: 22, status: 'Late Available', statusType: 'critical' },
    ],
  },
  {
    name: 'MAHATMA GANDHI HOSPITAL',
    count: 2,
    appointments: [
      { initials: 'MW', name: 'Pooja Verma', qualification: 'MS Orthopedics', date: '2026/09/10', time: '04:15 PM TO 04:45 PM', token: 19, status: 'Available', statusType: 'stable' },
      { initials: 'AS', name: 'Anjali Singh', qualification: 'MBBS, Gynecology', date: '2026/09/12', time: '05:45 PM TO 06:15 PM', token: 26, status: 'Available', statusType: 'stable' },
    ],
  },
]

export const recentActivity: [string, string][] = [
  ['Record updated', '2 min ago'],
  ['Review completed', '12 min ago'],
  ['New case assigned', '31 min ago'],
  ['Status changed', '1 hr ago'],
]

export const systemStatus: [string, string][] = [
  ['Database', 'Online'],
  ['API', 'Online'],
  ['Workers', 'Online'],
]
