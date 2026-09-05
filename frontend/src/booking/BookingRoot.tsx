import React, { useState } from 'react';
import './BookingRoot.css';
import type { BookingWizardState } from './types/booking.types';
import { Breadcrumb } from './components/Breadcrumb/Breadcrumb';
import { ProfileStep } from './components/Profile/ProfileStep';
import { StateStep } from './components/StateSelect/StateStep';
import { HospitalStep } from './components/HospitalSelect/HospitalStep';
import { ConsultStep } from './components/Consultation/ConsultStep';
import { DeptStep } from './components/Department/DeptStep';
import { CalendarStep } from './components/Calendar/CalendarStep';
import { AppointmentsList } from './components/Appointments/AppointmentsList';

export const BookingRoot: React.FC = () => {
  const [state, setState] = useState<BookingWizardState>({
    currentStep: 'profiles',
    selectedProfileId: null,
    selectedState: null,
    selectedHospitalId: null,
    selectedDepartmentId: null
  });

  const updateState = (updates: Partial<BookingWizardState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const handleProfileSelect = (id: number) => {
    updateState({ selectedProfileId: id, currentStep: 'states' });
  };

  const handleStateSelect = (stateName: string) => {
    updateState({ selectedState: stateName, currentStep: 'hospitals' });
  };

  const handleHospitalSelect = (hospitalId: number) => {
    updateState({ selectedHospitalId: hospitalId, currentStep: 'consultation' });
  };

  const handleDeptSelect = (deptId: number) => {
    updateState({ selectedDepartmentId: deptId, currentStep: 'calendar' });
  };

  return (
    <div className="booking-root">
      <Breadcrumb currentStep={state.currentStep} />
      
      <div className="booking-content-area">
        {state.currentStep === 'profiles' && (
          <ProfileStep onSelect={handleProfileSelect} />
        )}
        
        {state.currentStep === 'states' && (
          <StateStep 
            onSelect={handleStateSelect} 
            onBack={() => updateState({ currentStep: 'profiles' })} 
          />
        )}
        
        {state.currentStep === 'hospitals' && state.selectedState && (
          <HospitalStep 
            stateName={state.selectedState} 
            onSelect={handleHospitalSelect}
            onBack={() => updateState({ currentStep: 'states' })}
          />
        )}
        
        {state.currentStep === 'consultation' && (
          <ConsultStep 
            onNewAppointment={() => updateState({ currentStep: 'department' })}
            onViewAppointments={() => updateState({ currentStep: 'appointments' })}
            onBack={() => updateState({ currentStep: 'hospitals' })}
          />
        )}
        
        {state.currentStep === 'department' && state.selectedHospitalId && (
          <DeptStep 
            hospitalId={state.selectedHospitalId}
            onSelect={handleDeptSelect}
            onBack={() => updateState({ currentStep: 'consultation' })}
          />
        )}
        
        {state.currentStep === 'calendar' && state.selectedHospitalId && state.selectedDepartmentId && state.selectedProfileId && (
          <CalendarStep
            hospitalId={state.selectedHospitalId}
            deptId={state.selectedDepartmentId}
            profileId={state.selectedProfileId}
            stateName={state.selectedState || ''}
            onBookingSuccess={() => updateState({ currentStep: 'appointments' })}
            onBack={() => updateState({ currentStep: 'department' })}
          />
        )}

        {state.currentStep === 'appointments' && state.selectedProfileId && (
          <AppointmentsList 
            profileId={state.selectedProfileId}
            onBack={() => updateState({ currentStep: 'consultation' })}
          />
        )}
      </div>
    </div>
  );
};
