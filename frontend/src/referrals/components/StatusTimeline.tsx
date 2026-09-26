import React from 'react';
import './referrals.css';
import type { TimelineStep } from '../types/referral.types';

/** Renders a server-computed timeline. No status logic here — that lives in ReferralService. */
export const StatusTimeline: React.FC<{ steps: TimelineStep[]; compact?: boolean }> = ({ steps, compact }) => (
  <div className={`rf-timeline ${compact ? 'compact' : ''}`}>
    {steps.map((step, i) => (
      <React.Fragment key={`${step.label}-${i}`}>
        <div className={`rf-step ${step.state}`}>
          <span className="rf-step-dot" />
          <span className="rf-step-label">{step.label}</span>
        </div>
        {i < steps.length - 1 && <div className={`rf-step-line ${step.state === 'done' ? 'done' : ''}`} />}
      </React.Fragment>
    ))}
  </div>
);

/** Badge for an appointment displayStatus (confirmed/referred/...) or a referral status (REQUESTED/...). */
export const StatusBadge: React.FC<{ status: string; label: string }> = ({ status, label }) => (
  <span className={`rf-badge ${status}`}>{label}</span>
);
