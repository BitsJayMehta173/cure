import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { Appointment } from '../types'
import { getTravelPlans } from '../data/travelRoutes'
import { TravelRoutePopup } from './TravelRoutePopup'

function getDaysLabel(dateStr: string): string {
  if (!dateStr) return 'N/A'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  const diffMs = target.getTime() - today.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays < 0) return `${Math.abs(diffDays)} day(s) ago`
  return `In ${diffDays} day(s)`
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export function AppointmentCard({ 
  appointment, 
  onSelect,
  onToggleCompare,
  isCompared,
  patientCity,
  hospitalName,
  hospitalState,
  urgencyScore = 1,
}: { 
  appointment: Appointment, 
  onSelect?: (appointment: Appointment) => void,
  onToggleCompare?: (appointment: Appointment) => void,
  isCompared?: boolean,
  patientCity?: string,
  hospitalName?: string,
  hospitalState?: string,
  urgencyScore?: number,
}) {
  const transportRef = useRef<HTMLDivElement>(null)
  const [popupAnchor, setPopupAnchor] = useState<DOMRect | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Determine travel plans: use hospitalState as destination
  const destState = hospitalState || patientCity || ''
  const travelData = patientCity
    ? getTravelPlans(patientCity, destState, urgencyScore)
    : null


  const handleMouseEnter = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    if (transportRef.current) {
      setPopupAnchor(transportRef.current.getBoundingClientRect())
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    hideTimer.current = setTimeout(() => setPopupAnchor(null), 150)
  }, [])

  const showPopup = !!popupAnchor && !!appointment.transportMode

  return (
    <article className={`case-card ${isCompared ? 'compared' : ''}`} onClick={() => onSelect && onSelect(appointment)}>
      <div className="person">
        <div className="avatar">{appointment.initials}</div>
        <div className="person-info">
          <div className="person-name">{appointment.name}</div>
          <div className="day">{appointment.qualification}</div>
          {(appointment.yearsOfExperience !== undefined || appointment.totalPatientsTreated !== undefined || appointment.avgMinutesPerPatient !== undefined) && (
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-muted)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'nowrap', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {appointment.yearsOfExperience !== undefined && (
                <span style={{ color: appointment.yearsOfExperience >= 15 ? '#059669' : 'var(--color-text-muted)' }}>
                  {appointment.yearsOfExperience >= 15 ? '⭐' : '🩺'} {appointment.yearsOfExperience}y
                </span>
              )}
              {appointment.totalPatientsTreated !== undefined && (
                <><span style={{ opacity: 0.4 }}>·</span><span style={{ color: 'var(--color-primary)' }}>👥 {(appointment.totalPatientsTreated / 1000).toFixed(1)}k</span></>
              )}
              {appointment.avgMinutesPerPatient !== undefined && (
                <><span style={{ opacity: 0.4 }}>·</span><span style={{ color: appointment.avgMinutesPerPatient <= 12 ? '#d97706' : 'var(--color-text-muted)' }}>{appointment.avgMinutesPerPatient <= 12 ? '⚡' : '⏱'} {appointment.avgMinutesPerPatient}m/pt</span></>
              )}
            </div>
          )}
        </div>
        {onToggleCompare && (
          <input 
            type="checkbox" 
            className="compare-checkbox"
            checked={isCompared}
            onChange={(e) => {
              e.stopPropagation()
              onToggleCompare(appointment)
            }}
            title="Select for comparison"
          />
        )}
      </div>
      {/* Date: shows "In X days" label, tooltip shows full date on hover */}
      <div
        className="amount"
        title={appointment.date ? `Available: ${formatDisplayDate(appointment.date)}` : ''}
        style={{ cursor: 'help' }}
      >
        {getDaysLabel(appointment.date)}
      </div>
      <div className="details">
        {appointment.isLongDistance ? (
          <div style={{ fontWeight: 600, color: 'var(--color-text-main)', fontSize: '14px', marginBottom: '4px' }}>
            Visit Until: <span style={{ color: 'var(--color-primary)' }}>{appointment.shiftHours ? appointment.shiftHours.split(' - ')[1] : '05:00 PM'}</span>
          </div>
        ) : (
          <div style={{ fontWeight: 600, color: 'var(--color-text-main)', fontSize: '14px', marginBottom: '4px' }}>
            Expected Time: <span style={{ color: 'var(--color-primary)' }}>{appointment.time}</span>
          </div>
        )}
        Token Number: {appointment.token}
        <div style={{ marginTop: '8px', padding: '8px', background: 'var(--color-surface)', borderRadius: '6px', border: '1px dashed var(--border-default)', fontSize: '12px', lineHeight: '1.8' }}>
          {appointment.shiftHours && (
            <div style={{ color: 'var(--color-text-main)', fontWeight: 600 }}>
              Doctor Shift: <span style={{ color: 'var(--color-primary)' }}>{appointment.shiftHours}</span>
            </div>
          )}
          <div style={{ color: 'var(--color-text-main)', fontWeight: 600 }}>
            Avg time per patient: <span style={{ color: 'var(--color-primary)' }}>~{appointment.avgMinutesPerPatient ?? 15} mins</span>
          </div>

          {/* ── Transport section — hover here to see route popup ── */}
          {appointment.transportMode && (() => {
            const hrs = appointment.transportTimeHrs ?? 0;
            const timeLabel = hrs < 1
              ? `~${Math.round(hrs * 60)} mins`
              : `~${hrs.toFixed(1)} hrs`;
            return (
              <div
                ref={transportRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={(e) => e.stopPropagation()}
                style={{
                  marginTop: '4px',
                  padding: '5px 7px',
                  borderRadius: '4px',
                  background: appointment.isLongDistance ? 'rgba(239,68,68,0.08)' : 'rgba(59,130,246,0.08)',
                  border: `1px solid ${appointment.isLongDistance ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)'}`,
                  cursor: 'help',
                  position: 'relative',
                  transition: 'box-shadow 0.15s ease',
                  boxShadow: showPopup ? `0 0 0 2px ${appointment.isLongDistance ? 'rgba(239,68,68,0.35)' : 'rgba(59,130,246,0.35)'}` : 'none',
                }}
              >
                <div style={{ fontWeight: 700, color: appointment.isLongDistance ? '#b91c1c' : 'var(--color-primary)' }}>
                  {appointment.transportEmoji} {appointment.transportMode} — {timeLabel}
                  <span style={{
                    marginLeft: '6px',
                    fontSize: '10px',
                    fontWeight: 600,
                    opacity: 0.6,
                    verticalAlign: 'middle',
                  }}>
                    🗺️ hover for route
                  </span>
                </div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>{appointment.transportDescription}</div>
              </div>
            );
          })()}
        </div>
      </div>
      <div className="card-footer">
        <span className={`status ${appointment.statusType}`}>{appointment.status}</span>
        {appointment.tradeoffLabel && (
          <div className="tradeoff-label">{appointment.tradeoffLabel}</div>
        )}
      </div>

      {/* ── Portal-rendered popup (outside card stacking context) ── */}
      {showPopup && popupAnchor && createPortal(
        <TravelRoutePopup
          plans={travelData?.plans ?? [{ planLabel: '', planEmoji: '', totalDistanceKm: 0, totalDurationMin: 0, estimatedCostMin: 0, estimatedCostMax: 0, legs: [] }, { planLabel: '', planEmoji: '', totalDistanceKm: 0, totalDurationMin: 0, estimatedCostMin: 0, estimatedCostMax: 0, legs: [] }]}
          criticalPlan={travelData?.criticalPlan ?? { planLabel: '', planEmoji: '', totalDistanceKm: 0, totalDurationMin: 0, estimatedCostMin: 0, estimatedCostMax: 0, legs: [] }}
          isCritical={travelData?.isCritical ?? false}
          originCity={patientCity || ''}
          destinationLabel={hospitalName || 'Hospital'}
          anchorRect={popupAnchor}
          noCity={!patientCity}
        />,
        document.body
      )}
    </article>
  )
}
