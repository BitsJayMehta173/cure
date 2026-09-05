import React from 'react';
import './Breadcrumb.css';
import type { BookingStep } from '../../types/booking.types';

interface BreadcrumbProps {
  currentStep: BookingStep;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ currentStep }) => {
  const steps: { key: BookingStep; label: string }[] = [
    { key: 'profiles', label: '1. Identity' },
    { key: 'states', label: '2. State' },
    { key: 'hospitals', label: '3. Hospital' },
    { key: 'consultation', label: '4. Action' },
    { key: 'department', label: '5. Department' },
    { key: 'calendar', label: '6. Slot' },
  ];

  const getStepIndex = (step: BookingStep) => {
    // Treat 'appointments' as an extension of 'consultation' for the breadcrumb
    if (step === 'appointments') return 3; 
    return steps.findIndex(s => s.key === step);
  };

  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="breadcrumb-container">
      {steps.map((step, index) => {
        const isPast = index < currentIndex;
        const isActive = index === currentIndex;
        const isFuture = index > currentIndex;

        let statusClass = '';
        if (isPast) statusClass = 'past';
        if (isActive) statusClass = 'active';
        if (isFuture) statusClass = 'future';

        return (
          <React.Fragment key={step.key}>
            <div className={`breadcrumb-step ${statusClass}`}>
              {step.label}
            </div>
            {index < steps.length - 1 && (
              <div className={`breadcrumb-separator ${isPast ? 'past' : ''}`}>›</div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
