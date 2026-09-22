import { useEffect, useRef, useState } from 'react';
import type { TravelPlan } from '../types';
import { formatDuration } from '../data/travelRoutes';
import './TravelRoutePopup.css';

interface TravelRoutePopupProps {
  plans: [TravelPlan, TravelPlan];
  criticalPlan: TravelPlan;
  isCritical: boolean;
  originCity: string;
  destinationLabel: string;
  anchorRect: DOMRect;
  noCity?: boolean;
}

function PlanCard({ plan, accent }: { plan: TravelPlan; accent: 'fastest' | 'budget' | 'critical' }) {
  return (
    <div className={`trp-plan trp-plan--${accent}`}>
      <div className="trp-plan-header">
        <span className="trp-plan-emoji">{plan.planEmoji}</span>
        <span className="trp-plan-label">{plan.planLabel}</span>
        <span className="trp-plan-summary">
          {formatDuration(plan.totalDurationMin)} · {plan.totalDistanceKm} km
        </span>
      </div>

      <div className="trp-legs">
        {plan.legs.map((leg, legIdx) => (
          <div key={legIdx} className="trp-leg">
            <div className="trp-leg-icon-col">
              <div className="trp-leg-icon">{leg.emoji}</div>
              {legIdx < plan.legs.length - 1 && <div className="trp-leg-line" />}
            </div>
            <div className="trp-leg-info">
              <div className="trp-leg-label">{leg.label}</div>
              <div className="trp-leg-route">{leg.from} → {leg.to}</div>
              <div className="trp-leg-meta">
                {leg.distanceKm > 0 && <span>{leg.distanceKm} km</span>}
                <span>{formatDuration(leg.durationMin)}</span>
                {leg.note && <span className="trp-leg-note">· {leg.note}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={`trp-cost ${accent === 'critical' ? 'trp-cost--critical' : ''}`}>
        <span className="trp-cost-icon">{accent === 'critical' ? '🚨' : '💳'}</span>
        <span>
          Est. Cost: ₹{plan.estimatedCostMin.toLocaleString('en-IN')}–
          {plan.estimatedCostMax.toLocaleString('en-IN')}
        </span>
      </div>
    </div>
  );
}

export function TravelRoutePopup({
  plans,
  criticalPlan,
  isCritical,
  originCity,
  destinationLabel,
  anchorRect,
  noCity = false,
}: TravelRoutePopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const popup = popupRef.current;
    if (!popup) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pw = popup.offsetWidth || (isCritical ? 400 : 640);
    const ph = popup.offsetHeight || 360;

    let top = anchorRect.top - ph - 12;
    if (top < 8) top = anchorRect.bottom + 12;
    if (top + ph > vh - 8) top = vh - ph - 8;

    let left = anchorRect.left + anchorRect.width / 2 - pw / 2;
    if (left < 8) left = 8;
    if (left + pw > vw - 8) left = vw - pw - 8;

    setPos({ top, left });
  }, [anchorRect, isCritical]);

  if (noCity) {
    return (
      <div
        ref={popupRef}
        className="trp-popup trp-popup--no-city"
        style={{ top: pos.top, left: pos.left }}
      >
        <div className="trp-no-city-icon">📍</div>
        <p className="trp-no-city-text">
          Set your <strong>origin city</strong> in <em>⚙️ Time &amp; Date</em> settings to see
          detailed travel plans to the hospital.
        </p>
      </div>
    );
  }

  // ── CRITICAL MODE ─────────────────────────────────────────────────────────
  if (isCritical) {
    return (
      <div
        ref={popupRef}
        className="trp-popup trp-popup--critical"
        style={{ top: pos.top, left: pos.left }}
      >
        {/* Critical alert banner */}
        <div className="trp-critical-banner">
          <span className="trp-critical-pulse">🚨</span>
          <div className="trp-critical-banner-text">
            <span className="trp-critical-title">CRITICAL CASE — EMERGENCY ROUTE</span>
            <span className="trp-critical-subtitle">{originCity} → {destinationLabel}</span>
          </div>
          <span className="trp-critical-time">
            {formatDuration(criticalPlan.totalDurationMin)}
          </span>
        </div>

        {/* Warning strip */}
        <div className="trp-critical-warning">
          ⚡ Time-critical. Every minute matters. Take the fastest route — do not wait for budget options.
        </div>

        {/* The single emergency plan */}
        <div className="trp-critical-plan-wrap">
          <PlanCard plan={criticalPlan} accent="critical" />
        </div>

        {/* Book now CTAs */}
        <div className="trp-critical-actions">
          <div className="trp-action-chip">📱 Call 108 (Ambulance)</div>
          <div className="trp-action-chip">✈️ MakeMyTrip / IRCTC Air</div>
          <div className="trp-action-chip">🚕 Ola / Uber (now)</div>
        </div>
      </div>
    );
  }

  // ── NORMAL MODE (Routine / Urgent) ────────────────────────────────────────
  return (
    <div
      ref={popupRef}
      className="trp-popup"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="trp-header">
        <span className="trp-header-icon">🗺️</span>
        <div className="trp-header-text">
          <span className="trp-title">Travel Plans</span>
          <span className="trp-route-label">{originCity} → {destinationLabel}</span>
        </div>
      </div>

      <div className="trp-plans-grid">
        <PlanCard plan={plans[0]} accent="fastest" />
        <PlanCard plan={plans[1]} accent="budget" />
      </div>
    </div>
  );
}
