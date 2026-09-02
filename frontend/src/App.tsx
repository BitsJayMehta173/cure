import { useState } from 'react'
import './App.css'
import { baseHospitals, expandedRadiusHospitals, aiOptimizerHospitals, crossBorderHospitals, customFilterHospitals, recentActivity, stats, systemStatus } from './data'
import { HospitalColumn } from './components/HospitalColumn'
import { Panel } from './components/Panel'
import { Slider } from './components/Slider'
import { StatCard } from './components/StatCard'
import type { Appointment, Hospital } from './types'
import { dict, type Language } from './translations'

function App() {
  // Phase 4 State
  const [lang, setLang] = useState<Language>('en')
  const [isOffline, setIsOffline] = useState(false)
  const t = dict[lang]

  const [disease, setDisease] = useState('')
  const [location, setLocation] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [showTriage, setShowTriage] = useState(false)
  const [urgencyScore, setUrgencyScore] = useState(1)

  // Phase 5 & Expansion State
  const [dpdpConsent, setDpdpConsent] = useState(false)
  const [compareList, setCompareList] = useState<Appointment[]>([])
  const [showCompareModal, setShowCompareModal] = useState(false)
  const [expansionMode, setExpansionMode] = useState<string>('default')
  
  // Custom Filter State
  const [showCustomFilter, setShowCustomFilter] = useState(false)
  const [maxWait, setMaxWait] = useState(2)
  const [maxTravel, setMaxTravel] = useState(50)

  // Phase 3 State
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [simulateFailure, setSimulateFailure] = useState(true)
  const [showRematch, setShowRematch] = useState(false)

  // Determine which mock dataset to show
  let activeHospitals: Hospital[] = baseHospitals;
  if (location === 'kathmandu') {
    activeHospitals = crossBorderHospitals;
  } else if (expansionMode === 'Expand Radius') {
    activeHospitals = expandedRadiusHospitals;
  } else if (expansionMode === 'AI Compromise Optimizer') {
    activeHospitals = aiOptimizerHospitals;
  } else if (expansionMode === 'Custom Preference') {
    activeHospitals = customFilterHospitals;
  } else if (expansionMode === 'Lowest Queue Time') {
    // Clone and sort baseHospitals by token to simulate "lowest queue"
    activeHospitals = baseHospitals.map(h => ({
      ...h,
      appointments: [...h.appointments].sort((a, b) => (a.token ?? 0) - (b.token ?? 0))
    }));
  }

  const handleSearchClick = () => {
    if (!disease || !location) {
      window.alert('Please select a condition and location first.')
      return
    }
    if (!dpdpConsent) {
      window.alert('Please provide DPDP consent to process your health parameters.')
      return
    }
    if (isOffline) {
      window.alert('OFFLINE MODE: Network unavailable. Your search request has been safely queued and will sync automatically when connectivity returns.')
      return
    }
    setShowTriage(true)
  }

  const handleTriageSubmit = () => {
    setShowTriage(false)
    setHasSearched(true)
    setShowRematch(false)
    setExpansionMode('default') // Reset expansion mode on new search
  }

  const handleExpansion = (mode: string) => {
    if (mode === 'Custom Preference') {
      setShowCustomFilter(true);
      return;
    }
    setExpansionMode(mode);
  }

  const handleApplyCustomFilter = () => {
    setShowCustomFilter(false);
    setExpansionMode('Custom Preference');
  }

  const handleBooking = () => {
    if (simulateFailure) {
      setSelectedAppointment(null)
      setShowRematch(true)
    } else {
      window.alert(`Booking Confirmed for ${selectedAppointment?.name}!`)
      setSelectedAppointment(null)
    }
  }

  const handleToggleCompare = (app: Appointment) => {
    setCompareList(prev => {
      const exists = prev.find(a => a.token === app.token && a.name === app.name)
      if (exists) return prev.filter(a => a.token !== app.token || a.name !== app.name)
      if (prev.length >= 3) {
        window.alert('You can only compare up to 3 specialists at a time.')
        return prev
      }
      return [...prev, app]
    })
  }

  return (
    <main className="app">
      {/* Localization Header */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', gap: '8px' }}>
        <button className="header-btn" style={{ padding: '8px 16px', minWidth: 'auto', background: lang === 'en' ? 'var(--color-primary)' : 'var(--color-surface)', color: lang === 'en' ? '#fff' : 'var(--color-primary)' }} onClick={() => setLang('en')}>English</button>
        <button className="header-btn" style={{ padding: '8px 16px', minWidth: 'auto', background: lang === 'hi' ? 'var(--color-primary)' : 'var(--color-surface)', color: lang === 'hi' ? '#fff' : 'var(--color-primary)' }} onClick={() => setLang('hi')}>हिंदी (Hindi)</button>
      </div>

      <header className="header" style={{ flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: '16px', width: '100%', justifyContent: 'center' }}>
          <select className="disease-select" aria-label="Select disease" value={disease} onChange={(event) => setDisease(event.target.value)}>
            <option value="" disabled>{t.condition}</option>
            <option value="cardiology">Cardiology</option>
            <option value="oncology">Oncology</option>
          </select>
          <select className="disease-select" aria-label="Select location" value={location} onChange={(event) => setLocation(event.target.value)}>
            <option value="" disabled>{t.location}</option>
            <option value="jaipur">Jaipur (Simulated)</option>
            <option value="jodhpur">Jodhpur (Simulated)</option>
            <option value="kathmandu">Kathmandu, Nepal (Cross-Border Routing)</option>
          </select>
          <button className="header-btn" type="button" onClick={handleSearchClick}>{t.findMatch}</button>
        </div>
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-main)', fontSize: '13px' }}>
          <input type="checkbox" id="dpdp" checked={dpdpConsent} onChange={(e) => setDpdpConsent(e.target.checked)} />
          <label htmlFor="dpdp">{t.dpdpConsent}</label>
        </div>
      </header>

      {/* Compare Floating Button */}
      {compareList.length > 0 && !showCompareModal && (
        <div className="compare-floating-bar">
          <span>{compareList.length} Selected</span>
          <button className="header-btn" onClick={() => setShowCompareModal(true)}>{t.compareSelected}</button>
        </div>
      )}

      {/* Comparison Modal */}
      {showCompareModal && (
        <div className="modal-overlay">
          <div className="modal-content comparison-modal">
            <h2>{t.compareTitle}</h2>
            <div className="comparison-grid">
              {compareList.map(app => (
                <div key={`${app.name}-${app.token}`} className="comparison-col">
                  <div className="avatar" style={{margin: '0 auto 12px'}}>{app.initials}</div>
                  <strong style={{display: 'block', textAlign: 'center'}}>{app.name}</strong>
                  <div style={{textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)'}}>{app.qualification}</div>
                  
                  <hr style={{margin: '16px 0', borderColor: 'var(--border-default)'}}/>
                  
                  <div style={{fontSize: '13px', lineHeight: '1.8'}}>
                    <strong>Wait Time:</strong> {app.date} <br/>
                    <strong>Tradeoff:</strong> {app.tradeoffLabel || 'Standard'} <br/>
                    <strong>AI Status:</strong> <span className={`status ${app.statusType}`}>{app.status}</span>
                  </div>
                  
                  <button className="header-btn" style={{width: '100%', marginTop: '16px'}} onClick={() => {
                    setSelectedAppointment(app);
                    setShowCompareModal(false);
                  }}>Book</button>
                </div>
              ))}
            </div>
            <button className="header-btn cancel-btn" style={{marginTop: '24px'}} onClick={() => setShowCompareModal(false)}>{t.close}</button>
          </div>
        </div>
      )}

      {/* Custom Filter Modal */}
      {showCustomFilter && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>⚙️ Custom Preferences</h2>
            <p>Fine-tune your constraints. The Matching Engine will recalculate options.</p>
            
            <div className="triage-form" style={{ marginTop: '20px' }}>
              <label style={{ display: 'block' }}>
                Max Acceptable Wait Time:
                <input 
                  type="range" 
                  min="1" max="14" 
                  value={maxWait} 
                  onChange={(e) => setMaxWait(Number(e.target.value))}
                  style={{width: '100%', marginTop: '8px'}} 
                />
                <div style={{textAlign: 'right', fontWeight: 'bold', fontSize: '13px', color: 'var(--color-primary)'}}>&lt; {maxWait} Days</div>
              </label>

              <label style={{marginTop: '20px', display: 'block'}}>
                Max Acceptable Travel Distance:
                <input 
                  type="range" 
                  min="5" max="300" step="5"
                  value={maxTravel} 
                  onChange={(e) => setMaxTravel(Number(e.target.value))}
                  style={{width: '100%', marginTop: '8px'}} 
                />
                <div style={{textAlign: 'right', fontWeight: 'bold', fontSize: '13px', color: 'var(--color-primary)'}}>&lt; {maxTravel} km</div>
              </label>

              <label style={{marginTop: '20px', display: 'block'}}>
                Preferred Facility Type:
                <select className="disease-select" style={{width: '100%', marginTop: '8px'}}>
                  <option>Any (Government + Private)</option>
                  <option>Government Only (Lower Cost)</option>
                  <option>Private Only (Premium Care)</option>
                </select>
              </label>

              <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                <button className="header-btn cancel-btn" style={{flex: 1}} onClick={() => setShowCustomFilter(false)}>
                  Cancel
                </button>
                <button className="header-btn" style={{flex: 1}} onClick={handleApplyCustomFilter}>
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Triage Modal */}
      {showTriage && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{t.triageTitle}</h2>
            <p>{t.triageDesc}</p>
            
            <div className="triage-form">
              <label>
                Symptom Onset:
                <select className="disease-select" style={{width: '100%', marginTop: '8px'}}>
                  <option>Less than 24 hours</option>
                  <option>1-3 days</option>
                  <option>More than a week</option>
                </select>
              </label>

              <label style={{marginTop: '16px', display: 'block'}}>
                Severity Scale (1-10):
                <input 
                  type="range" 
                  min="1" max="10" 
                  value={urgencyScore} 
                  onChange={(e) => setUrgencyScore(Number(e.target.value))}
                  style={{width: '100%', marginTop: '8px'}} 
                />
                <div style={{textAlign: 'right', fontWeight: 'bold'}}>{urgencyScore} / 10</div>
              </label>

              <button className="header-btn" style={{width: '100%', marginTop: '24px'}} onClick={handleTriageSubmit}>
                {t.computeTradeoffs}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {selectedAppointment && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Review Booking</h2>
            <p>You are about to lock this slot.</p>
            <div className="booking-details">
              <strong>{selectedAppointment.name}</strong><br/>
              {selectedAppointment.qualification}<br/>
              <span style={{color: 'var(--color-primary)', fontWeight: 'bold'}}>{selectedAppointment.date} at {selectedAppointment.time}</span>
            </div>
            
            <button className="header-btn upi-btn" onClick={handleBooking}>
              Pay via UPI & Lock Slot
            </button>
            <button className="header-btn cancel-btn" onClick={() => setSelectedAppointment(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Rematch Alert Overlay */}
      {showRematch && (
        <div className="alert-overlay">
          <div className="alert-content">
            <h2 className="alert-title">⚠️ SLOT UNAVAILABLE</h2>
            <p>Doctor called into emergency surgery. Slot has been cancelled.</p>
            <div className="alert-rematch">
              <strong>Dynamic Rematch Triggered:</strong><br/>
              Next best tradeoff option is <em>Dr. Vikram Kapoor (AI Compromise)</em>.
            </div>
            <button className="header-btn" onClick={() => setShowRematch(false)}>
              View New Match
            </button>
          </div>
        </div>
      )}

      {hasSearched ? (
        <>
          <div className="section-header">
            <h2>{t.optimalMatches} {expansionMode !== 'default' && `(${expansionMode})`}</h2>
            <span className="count">{activeHospitals.reduce((total, hospital) => total + hospital.appointments.length, 0)} {t.optionsFound} {urgencyScore}/10</span>
          </div>

          <section className="pipeline">
            {activeHospitals.map((hospital) => (
              <HospitalColumn 
                key={hospital.name} 
                hospital={hospital} 
                onSelectAppointment={setSelectedAppointment}
                onToggleCompare={handleToggleCompare}
                compareList={compareList}
              />
            ))}
          </section>

          <div className="not-satisfied-panel">
            <h3>{t.notSatisfied}</h3>
            <div className="expansion-buttons">
              <button 
                className={expansionMode === 'Expand Radius' ? 'active-expansion' : ''}
                onClick={() => handleExpansion('Expand Radius')}>🌍 Expand Radius</button>
              <button 
                className={expansionMode === 'Lowest Queue Time' ? 'active-expansion' : ''}
                onClick={() => handleExpansion('Lowest Queue Time')}>⏱️ Lowest Queue Time</button>
              <button 
                className={expansionMode === 'Custom Preference' ? 'active-expansion' : ''}
                onClick={() => handleExpansion('Custom Preference')}>⚙️ Custom Filter</button>
              <button 
                className={`ai-btn ${expansionMode === 'AI Compromise Optimizer' ? 'active-expansion' : ''}`}
                onClick={() => handleExpansion('AI Compromise Optimizer')}>✨ AI Optimizer</button>
            </div>
          </div>
        </>
      ) : (
        <section className="stats-slider" aria-label="Hospital statistics">
          <div className="section-header">
            <h2>{t.networkStatus}</h2>
          </div>
          <Slider label="statistics">{stats.map((stat) => <StatCard key={stat.label} {...stat} />)}</Slider>
        </section>
      )}

      <section className="bottom">
        <Panel title={t.recentActivity} items={recentActivity} />
        <div className="panel demo-controls">
          <h3>{t.demoControls}</h3>
          <p style={{fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '12px'}}>Toggle settings for your presentation.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 'bold'}}>
              <input 
                type="checkbox" 
                checked={simulateFailure} 
                onChange={(e) => setSimulateFailure(e.target.checked)} 
              />
              Simulate Booking Failure (Rematch)
            </label>
            <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 'bold'}}>
              <input 
                type="checkbox" 
                checked={isOffline} 
                onChange={(e) => setIsOffline(e.target.checked)} 
              />
              Simulate Offline (Airplane Mode)
            </label>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
