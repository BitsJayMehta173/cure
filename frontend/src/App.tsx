import { useState } from 'react'
import './App.css'
import { hospitals, recentActivity, stats, systemStatus } from './data'
import { HospitalColumn } from './components/HospitalColumn'
import { Panel } from './components/Panel'
import { Slider } from './components/Slider'
import { StatCard } from './components/StatCard'

function App() {
  const [disease, setDisease] = useState('')
  const [location, setLocation] = useState('')

  return (
    <main className="app">
      <header className="header">
        <select className="disease-select" aria-label="Select disease" value={disease} onChange={(event) => setDisease(event.target.value)}>
          <option value="" disabled>Disease</option>
          <option value="all">All diseases</option>
        </select>
        <select className="disease-select" aria-label="Select location" value={location} onChange={(event) => setLocation(event.target.value)}>
          <option value="" disabled>Location</option>
          <option value="all">All locations</option>
        </select>
        <button className="header-btn" type="button" onClick={() => window.alert('Search clicked')}>Search</button>
      </header>

      <section className="stats-slider" aria-label="Hospital statistics">
        <Slider label="statistics">{stats.map((stat) => <StatCard key={stat.label} {...stat} />)}</Slider>
      </section>

      <div className="section-header">
        <h2>Active Pipeline</h2>
        <span className="count">{hospitals.reduce((total, hospital) => total + hospital.appointments.length, 0)} options found</span>
      </div>

      <section className="pipeline">
        {hospitals.map((hospital) => <HospitalColumn key={hospital.name} hospital={hospital} />)}
      </section>

      <section className="bottom">
        <Panel title="Recent Activity" items={recentActivity} />
        <Panel title="System Status" items={systemStatus} />
      </section>
    </main>
  )
}

export default App
