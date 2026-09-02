import type { Hospital, Stat } from './types'

export const stats: Stat[] = [
  { label: 'Total Available Doctors', value: '248' },
  { label: 'Total Live Hospitals', value: '42' },
  { label: 'Total Available Beds', value: '1,284' },
  { label: 'Shortest Queue (mins)', value: '15' },
]

export const baseHospitals: Hospital[] = [
  {
    name: 'AIIMS JODHPUR',
    count: 1,
    appointments: [
      { 
        initials: 'SM', name: 'Dr. Ravi Kishan', qualification: 'MD Cardiology', 
        date: 'Sept 5, 2026', time: '11:15 AM (Wait: 3 Days)', token: 3, 
        status: 'Nearest Option', statusType: 'stable', tradeoffLabel: 'Nearest: 3 days wait, 15 min travel'
      }
    ],
  },
  {
    name: 'SMS HOSPITAL JAIPUR',
    count: 1,
    appointments: [
      { 
        initials: 'CF', name: 'Dr. Neha Sharma', qualification: 'MD Cardiology', 
        date: 'Sept 3, 2026', time: '12:00 PM (Wait: 1 Day)', token: 7, 
        status: 'Fastest Option', statusType: 'stable', tradeoffLabel: 'Faster: 1 day wait, 3 hr travel'
      }
    ],
  },
  {
    name: 'FORTIS HOSPITAL JAIPUR',
    count: 1,
    appointments: [
      { 
        initials: 'VK', name: 'Dr. Vikram Kapoor', qualification: 'MD Cardiology (Expert)', 
        date: 'Sept 2, 2026', time: '05:00 PM (Wait: 2 Hours)', token: 2, 
        status: 'AI Compromise', statusType: 'critical', tradeoffLabel: 'AI Pick: 2 hr wait, 3.5 hr travel'
      },
    ],
  }
]

export const expandedRadiusHospitals: Hospital[] = [
  ...baseHospitals,
  {
    name: 'APOLLO DELHI (RADIUS +300KM)',
    count: 2,
    appointments: [
      { 
        initials: 'RJ', name: 'Dr. Rahul Jain', qualification: 'MD Cardiology', 
        date: 'Sept 2, 2026', time: '10:00 AM (Wait: 1 Hour)', token: 1, 
        status: 'Fastest Outside City', statusType: 'stable', tradeoffLabel: 'Radius +300km: Immediate, 5 hr travel'
      },
      { 
        initials: 'MK', name: 'Dr. Maya Khan', qualification: 'Senior Cardiologist', 
        date: 'Sept 4, 2026', time: '01:00 PM (Wait: 2 Days)', token: 15, 
        status: 'Available', statusType: 'stable', tradeoffLabel: 'Radius +300km'
      }
    ],
  }
]

export const aiOptimizerHospitals: Hospital[] = [
  {
    name: '✨ AI OPTIMIZED ROUTING ✨',
    count: 1,
    appointments: [
      { 
        initials: 'VK', name: 'Dr. Vikram Kapoor', qualification: 'MD Cardiology (Expert)', 
        date: 'Sept 2, 2026', time: '02:00 PM (Wait: 1 Hour)', token: 1, 
        status: 'Best Compromise', statusType: 'critical', tradeoffLabel: '98% Match: Immediate Slot, Average Travel'
      },
    ],
  },
  ...baseHospitals
]

export const crossBorderHospitals: Hospital[] = [
  {
    name: 'MEDANTA (GURUGRAM)',
    count: 1,
    appointments: [
      { 
        initials: 'ST', name: 'Dr. Suresh Trehan', qualification: 'Oncology Specialist', 
        date: 'Sept 4, 2026', time: '09:00 AM (Wait: 2 Days)', token: 1, 
        status: 'Cross-Border Match', statusType: 'stable', tradeoffLabel: 'Nepal-to-India: 2 days wait, 1.5 hr flight'
      }
    ],
  },
  {
    name: 'APOLLO HOSPITALS (DELHI)',
    count: 1,
    appointments: [
      { 
        initials: 'AS', name: 'Dr. Amit Singh', qualification: 'Surgical Oncology', 
        date: 'Sept 5, 2026', time: '02:00 PM (Wait: 3 Days)', token: 12, 
        status: 'Cross-Border Match', statusType: 'stable', tradeoffLabel: 'Nepal-to-India: 3 days wait, 1.5 hr flight'
      }
    ],
  }
]

export const recentActivity: [string, string][] = [
  ['System matched new critical patient', '2 min ago'],
  ['Triage algorithm updated weights', '12 min ago'],
  ['AIIMS Jodhpur slot opened', '31 min ago'],
]

export const systemStatus: [string, string][] = [
  ['Live Simulator', 'Active'],
  ['Matching Engine', 'Online'],
  ['UHI Sync', 'Pending'],
]

export const customFilterHospitals: Hospital[] = [
  {
    name: 'FILTERED RESULT: TOP RATED',
    count: 1,
    appointments: [
      { 
        initials: 'NS', name: 'Dr. Neha Sharma', qualification: 'MD Cardiology', 
        date: 'Sept 3, 2026', time: '12:00 PM (Wait: 1 Day)', token: 7, 
        status: 'Fastest Option', statusType: 'stable', tradeoffLabel: 'Matches Custom Criteria: <2 days wait, <5hr travel'
      }
    ],
  }
]

