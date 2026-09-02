import { useState, useEffect } from 'react'
import './App.css'
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
  
  // Multi-Preference State
  const [prefExpand, setPrefExpand] = useState(false)
  const [prefQueue, setPrefQueue] = useState(false)
  const [prefCustom, setPrefCustom] = useState(false)
  
  // Backend Integration State
  const [activeHospitals, setActiveHospitals] = useState<Hospital[]>([])
  const [loading, setLoading] = useState(false)
  const [availableStates, setAvailableStates] = useState<string[]>([])
  const [availableConditions, setAvailableConditions] = useState<string[]>([])
  const [stats, setStats] = useState<{label: string, value: string}[]>([])

  // Load dynamic filters from database on page load
  useEffect(() => {
    fetch('http://localhost:8080/api/search/filters')
      .then(res => res.json())
      .then(data => {
        setAvailableStates(data.states || [])
        setAvailableConditions(data.conditions || [])
      })
      .catch(() => console.warn('Could not load filters from backend.'))

    fetch('http://localhost:8080/api/stats')
      .then(res => res.json())
      .then(data => {
        const statsArr = Object.entries(data).map(([label, value]) => ({ label, value: String(value) }))
        setStats(statsArr)
      })
      .catch(() => console.warn('Could not load stats from backend.'))
  }, [])
  
  // Custom Filter State
  const [showCustomFilter, setShowCustomFilter] = useState(false)
  const [maxWait, setMaxWait] = useState(2)
  const [maxTravel, setMaxTravel] = useState(50)

  // Journey Settings State
  const [showJourneySettings, setShowJourneySettings] = useState(false)
  const [journeyDate, setJourneyDate] = useState('') 
  const [journeyTime, setJourneyTime] = useState('')
  const [travelMode, setTravelMode] = useState('ai')
  const [patientCity, setPatientCity] = useState('')

  // Advanced Filter State
  const [requireSenior, setRequireSenior] = useState(false)
  const [requireFastQueue, setRequireFastQueue] = useState(false)

  // Phase 3 State
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [simulateFailure, setSimulateFailure] = useState(false) // Default OFF so real bookings work
  const [showRematch, setShowRematch] = useState(false)
  const [patientName, setPatientName] = useState('')

  const fetchMatches = async (isAI: boolean = false) => {
    setLoading(true);
    let url = `http://localhost:8080/api/search/state?state=${location}&condition=${disease}&urgency=${urgencyScore}`;
    
    if (journeyDate) url += `&journeyDate=${journeyDate}`;
    if (journeyTime) url += `&journeyTime=${journeyTime}`;
    if (travelMode) url += `&travelMode=${travelMode}`;
    if (patientCity) url += `&patientCity=${encodeURIComponent(patientCity)}`;
    if (requireSenior) url += `&requireSenior=true`;
    if (requireFastQueue) url += `&requireFastQueue=true`;

    if (isAI) {
      url += '&aiOptimize=true';
      if (prefExpand) url += '&expandRadius=true';
      if (prefQueue) url += '&lowestQueueTime=true';
      if (prefCustom) url += `&customFilter=true&maxWait=${maxWait}&maxTravel=${maxTravel}`;
      setExpansionMode('AI Multi-Preference');
    } else {
      setExpansionMode('default');
    }
    
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setActiveHospitals(data);
    } catch (e) {
      console.error(e);
      window.alert('Backend connection failed. Make sure Spring Boot is running on port 8080.');
    } finally {
      setLoading(false);
    }
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
    setPrefExpand(false)
    setPrefQueue(false)
    setPrefCustom(false)
    fetchMatches(false)
  }

  const handleExpansion = (mode: string) => {
    if (mode === 'Custom Preference') {
      setShowCustomFilter(true);
    } else if (mode === 'Expand Radius') {
      setPrefExpand(prev => !prev);
    } else if (mode === 'Lowest Queue Time') {
      setPrefQueue(prev => !prev);
    } else if (mode === 'AI Compromise Optimizer') {
      fetchMatches(true); // Submit all preferences to AI Optimizer
    }
  }

  const handleApplyCustomFilter = () => {
    setShowCustomFilter(false);
    setPrefCustom(true);
  }

  const handleBooking = async () => {
    // Demo toggle: simulate the emergency rematch scenario for presentations
    if (simulateFailure) {
      setSelectedAppointment(null)
      setShowRematch(true)
      return;
    } 

    if (!selectedAppointment) return;
    if (!patientName.trim()) {
      window.alert('Please enter the patient name before booking.')
      return;
    }

    try {
      const res = await fetch('http://localhost:8080/api/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: (selectedAppointment as any).doctorId || 1,
          dateStr: selectedAppointment.date,
          patientName: patientName.trim(),
          source: 'ReactApp'
        })
      });
      
      if (!res.ok) {
        if (res.status === 409) throw new Error('Daily limit reached for this doctor. Please choose another.');
        throw new Error('Booking failed. Please try again.');
      }

      const confirmed = await res.json();
      window.alert(`✅ Booking Confirmed!\nDoctor: ${selectedAppointment.name}\nToken: ${confirmed.tradeoffLabel}\nPatient: ${patientName}`);
      setSelectedAppointment(null);
      setPatientName('');
      fetchMatches(expansionMode === 'AI Multi-Preference'); // Re-fetch to update slot counts
    } catch (e: any) {
      window.alert('❌ ' + (e.message || 'An error occurred'));
      if (e.message && e.message.includes('limit')) {
         setSelectedAppointment(null);
         setShowRematch(true);
      }
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
            {availableConditions.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select className="disease-select" aria-label="Select location" value={location} onChange={(event) => setLocation(event.target.value)}>
            <option value="" disabled>{t.location}</option>
            {availableStates.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button className="header-btn" type="button" onClick={() => setShowJourneySettings(true)} style={{ background: 'var(--color-surface)', color: 'var(--color-primary)', border: '1px solid var(--border-default)' }}>
            ⚙️ Time & Date
          </button>
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

      {/* Journey Settings Modal */}
      {showJourneySettings && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>⚙️ Journey Configuration</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '16px' }}>Define your exact start time, date, and preferred mode of travel to feed precise constraints into the AI Optimizer.</p>
            
            <div className="triage-form" style={{ marginTop: '20px' }}>
              <label style={{ display: 'block' }}>
                Journey Start Date:
                <input 
                  type="date" 
                  value={journeyDate} 
                  onChange={(e) => setJourneyDate(e.target.value)}
                  style={{width: '100%', marginTop: '8px', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--color-surface)', color: 'var(--color-text-main)'}} 
                />
              </label>

              <label style={{marginTop: '20px', display: 'block'}}>
                Journey Start Time:
                <input 
                  type="time" 
                  value={journeyTime} 
                  onChange={(e) => setJourneyTime(e.target.value)}
                  style={{width: '100%', marginTop: '8px', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--color-surface)', color: 'var(--color-text-main)'}} 
                />
              </label>

              <label style={{marginTop: '20px', display: 'block'}}>
                Mode of Travel:
                <select 
                  value={travelMode} 
                  onChange={(e) => setTravelMode(e.target.value)}
                  style={{width: '100%', marginTop: '8px', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--color-surface)', color: 'var(--color-text-main)'}} 
                >
                  <option value="ai">✨ AI Recommended (Fastest)</option>
                  <option value="bike/auto">🚲/🚕 Bike / Auto</option>
                  <option value="bus">🚌 Bus</option>
                  <option value="train">🚆 Train</option>
                  <option value="flight">✈️ Flight</option>
                </select>
              </label>

              <label style={{marginTop: '20px', display: 'block'}}>
                My Current City (for precise distance):
                <input
                  type="text"
                  list="city-list"
                  value={patientCity}
                  onChange={(e) => setPatientCity(e.target.value)}
                  placeholder="e.g. Jaipur, Jodhpur, New Delhi..."
                  style={{width: '100%', marginTop: '8px', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--color-surface)', color: 'var(--color-text-main)'}}
                />
                <datalist id="city-list">
                  <option value="Mumbai" /><option value="Pune" /><option value="Nagpur" />
                  <option value="Bangalore" /><option value="Mysore" />
                  <option value="New Delhi" /><option value="Gurgaon" /><option value="Noida" />
                  <option value="Chennai" /><option value="Coimbatore" />
                  <option value="Jaipur" /><option value="Jodhpur" /><option value="Udaipur" /><option value="Kota" /><option value="Ajmer" />
                </datalist>
              </label>

              <button className="header-btn" style={{width: '100%', marginTop: '24px'}} onClick={() => setShowJourneySettings(false)}>
                Save Settings
              </button>
            </div>
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

              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text-main)', fontWeight: 600 }}>
                  <input type="checkbox" checked={requireSenior} onChange={(e) => setRequireSenior(e.target.checked)} />
                  ⭐ Senior Specialists Only (15+ years experience)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text-main)', fontWeight: 600 }}>
                  <input type="checkbox" checked={requireFastQueue} onChange={(e) => setRequireFastQueue(e.target.checked)} />
                  ⚡ Fast-Moving Queues Only (≤ 15 min/patient)
                </label>
              </div>

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
          <div className="modal-content" style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowTriage(false)} 
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              aria-label="Close"
            >
              &times;
            </button>
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
                Optimization Goal:
                <select 
                  className="disease-select" 
                  style={{width: '100%', marginTop: '8px'}}
                  value={urgencyScore}
                  onChange={(e) => setUrgencyScore(Number(e.target.value))}
                >
                  <option value={1}>Nearest possible distance (Routine)</option>
                  <option value={5}>Both shortest time and distance combined (Urgent)</option>
                  <option value={10}>Nearest possible time (Critical)</option>
                </select>
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
            <p>Lock this slot in the database in real time.</p>
            <div className="booking-details">
              <strong>{selectedAppointment.name}</strong><br/>
              {selectedAppointment.qualification}<br/>
              <span style={{color: 'var(--color-primary)', fontWeight: 'bold'}}>
                {selectedAppointment.date
                  ? new Date(selectedAppointment.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
                  : 'N/A'}
                {' '}at {selectedAppointment.time}
              </span>
            </div>

            <div style={{marginTop: '16px'}}>
              <label style={{fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '6px'}}>
                Patient Name *
              </label>
              <input
                type="text"
                value={patientName}
                onChange={e => setPatientName(e.target.value)}
                placeholder="Enter patient name"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid var(--border-default)', background: 'var(--color-surface)',
                  color: 'var(--color-text-main)', fontSize: '14px', boxSizing: 'border-box'
                }}
                onKeyDown={e => e.key === 'Enter' && handleBooking()}
              />
            </div>

            <button className="header-btn upi-btn" style={{marginTop: '20px'}} onClick={handleBooking}>
              Pay via UPI &amp; Lock Slot
            </button>
            <button className="header-btn cancel-btn" onClick={() => { setSelectedAppointment(null); setPatientName(''); }}>
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
            {loading ? <span className="count">Loading matches via ML Backend...</span> : 
            <span className="count">{activeHospitals.reduce((total, hospital) => total + hospital.appointments.length, 0)} {t.optionsFound} {urgencyScore}/10</span>}
          </div>

          <section className="pipeline">
            {activeHospitals.map((hospital) => (
              <HospitalColumn 
                key={hospital.name} 
                hospital={hospital} 
                onSelectAppointment={setSelectedAppointment}
                onToggleCompare={handleToggleCompare}
                compareList={compareList}
                urgencyScore={urgencyScore}
              />
            ))}
          </section>

          <div className="not-satisfied-panel">
            <h3>{t.notSatisfied}</h3>
            <div className="expansion-buttons">
              <button 
                className={prefExpand ? 'active-expansion' : ''}
                onClick={() => handleExpansion('Expand Radius')}>🌍 Expand Radius</button>
              <button 
                className={prefQueue ? 'active-expansion' : ''}
                onClick={() => handleExpansion('Lowest Queue Time')}>⏱️ Lowest Queue Time</button>
              <button 
                className={prefCustom ? 'active-expansion' : ''}
                onClick={() => handleExpansion('Custom Preference')}>⚙️ Custom Filter</button>
              <button 
                className={`ai-btn`}
                onClick={() => handleExpansion('AI Compromise Optimizer')}>✨ AI Optimizer (Run)</button>
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
