import { useEffect, useRef, useState, type ReactNode } from 'react'
import './App.css'

type Status = 'warning' | 'stable' | 'critical'

type Appointment = {
  initials: string
  name: string
  qualification: string
  date: string
  time: string
  token: number
  status: string
  statusType: Status
}

type Hospital = {
  name: string
  count: number
  appointments: Appointment[]
}

const hospitals: Hospital[] = [
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

function Slider({ children, className = '', direction = 'horizontal' }: { children: ReactNode; className?: string; direction?: 'horizontal' | 'vertical' }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [canScroll, setCanScroll] = useState(false)

  const scroll = (amount: number) => {
    const track = trackRef.current
    if (!track) return
    if (direction === 'horizontal') track.scrollBy({ left: amount * track.clientWidth, behavior: 'smooth' })
    else track.scrollBy({ top: amount * track.clientHeight, behavior: 'smooth' })
  }

  const updateScrollState = () => {
    const track = trackRef.current
    if (track) setCanScroll(direction === 'horizontal' ? track.scrollWidth > track.clientWidth + 1 : track.scrollHeight > track.clientHeight + 1)
  }

  useEffect(() => {
    updateScrollState()
    const observer = new ResizeObserver(updateScrollState)
    if (trackRef.current) observer.observe(trackRef.current)
    return () => observer.disconnect()
  })

  return (
    <div className={`slider ${className}`}>
      <button className="slider-button slider-button-left" type="button" aria-label="Previous" onClick={() => scroll(-1)} hidden={!canScroll}>&lt;</button>
      <div className="slider-track" ref={trackRef} onScroll={updateScrollState}>{children}</div>
      <button className="slider-button slider-button-right" type="button" aria-label="Next" onClick={() => scroll(1)} hidden={!canScroll}>&gt;</button>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return <article className="stat-card"><span className="stat-label">{label}</span><span className="stat-value">{value}</span></article>
}

function AppointmentCard({ appointment }: { appointment: Appointment }) {
  return (
    <article className="case-card">
      <div className="person"><div className="avatar">{appointment.initials}</div><div className="person-info"><div className="person-name">{appointment.name}</div><div className="day">{appointment.qualification}</div></div></div>
      <div className="amount">{appointment.date}</div>
      <div className="details">{appointment.time}<br />Token Number: {appointment.token}</div>
      <span className={`status ${appointment.statusType}`}>{appointment.status}</span>
    </article>
  )
}

function HospitalColumn({ hospital }: { hospital: Hospital }) {
  return (
    <article className="column">
      <div className="column-title"><span>{hospital.name}</span><span className="column-number">{hospital.count}</span></div>
      <Slider className="appointment-slider" direction="vertical">
        {hospital.appointments.map((appointment) => <AppointmentCard key={`${hospital.name}-${appointment.token}`} appointment={appointment} />)}
      </Slider>
    </article>
  )
}

function Panel({ title, items }: { title: string; items: [string, string][] }) {
  return <section className="panel"><h3>{title}</h3>{items.map(([label, value]) => <div className="activity" key={label}><span>{label}</span><span>{value}</span></div>)}</section>
}

function App() {
  const [disease, setDisease] = useState('')
  const [location, setLocation] = useState('')

  return (
    <main className="app">
      <header className="header">
        <select className="disease-select" aria-label="Select disease" value={disease} onChange={(event) => setDisease(event.target.value)}><option value="" disabled>Disease</option><option value="all">All diseases</option></select>
        <select className="disease-select" aria-label="Select location" value={location} onChange={(event) => setLocation(event.target.value)}><option value="" disabled>Location</option><option value="all">All locations</option></select>
        <button className="header-btn" type="button">Search</button>
      </header>
      <section className="stats-slider" aria-label="Hospital statistics"><Slider>{[['Total Available Doctors', '248'], ['Total Live Hospitals', '42'], ['Total Available Beds', '1,284'], ['Shortest Queue', '3']].map(([label, value]) => <StatCard key={label} label={label} value={value} />)}</Slider></section>
      <div className="section-header"><h2>Active Pipeline</h2><span className="count">8 options found</span></div>
      <section className="pipeline">{hospitals.map((hospital) => <HospitalColumn key={hospital.name} hospital={hospital} />)}</section>
      <section className="bottom"><Panel title="Recent Activity" items={[["Record updated", "2 min ago"], ["Review completed", "12 min ago"], ["New case assigned", "31 min ago"], ["Status changed", "1 hr ago"]]} /><Panel title="System Status" items={[["Database", "Online"], ["API", "Online"], ["Workers", "Online"]]} /></section>
    </main>
  )
}

export default App
