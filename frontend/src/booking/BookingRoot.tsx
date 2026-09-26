import React, { useState, useEffect } from 'react';
import './BookingRoot.css';
import type { BookingWizardState, DoctorProfile } from './types/booking.types';
import { Breadcrumb } from './components/Breadcrumb/Breadcrumb';
import { ProfileStep } from './components/Profile/ProfileStep';
import { StateStep } from './components/StateSelect/StateStep';
import { HospitalStep } from './components/HospitalSelect/HospitalStep';
import { ConsultStep } from './components/Consultation/ConsultStep';
import { DeptStep } from './components/Department/DeptStep';
import { CalendarStep } from './components/Calendar/CalendarStep';
import { AppointmentsList } from './components/Appointments/AppointmentsList';

/**
 * Props for the Doctor Directory entry point.
 * When provided, the wizard skips the hospital/department selection
 * and jumps directly to the calendar for the given doctor.
 */
export interface BookingRootDoctorModeProps {
  doctorMode?: boolean;
  doctorInfo?: DoctorProfile;
  /** Profile to pre-select in the follow-up appointments page after booking */
  pendingProfileId?: number;
}

export const BookingRoot: React.FC<BookingRootDoctorModeProps> = ({
  doctorMode = false,
  doctorInfo,
  pendingProfileId
}) => {
  // Build the initial state depending on entry mode
  const getInitialState = (): BookingWizardState & { previousStep?: string; pendingProfileId?: number } => {
    if (doctorMode && doctorInfo) {
      return {
        currentStep: 'calendar',
        selectedProfileId: null,
        selectedState: doctorInfo.hospitalState,
        selectedHospitalId: doctorInfo.hospitalId,
        selectedDepartmentId: doctorInfo.departmentId,
        selectedDoctorId: doctorInfo.id,
        pendingProfileId: pendingProfileId ?? undefined,
        previousStep: undefined
      };
    }
    return {
      currentStep: 'profiles',
      selectedProfileId: null,
      selectedState: null,
      selectedHospitalId: null,
      selectedDepartmentId: null
    };
  };

  const [state, setState] = useState<BookingWizardState & { previousStep?: string }>(
    getInitialState()
  );

  // Re-initialize when doctor mode entry changes
  useEffect(() => {
    if (doctorMode && doctorInfo) {
      setState(getInitialState());
    }
  }, [doctorInfo?.id]);

  useEffect(() => {
    if (doctorMode && doctorInfo && state.currentStep === 'profiles') {
      setState(prev => ({ ...prev, currentStep: 'calendar' }));
    }
  }, [state.currentStep, doctorMode, doctorInfo]);

  const updateState = (updates: Partial<typeof state>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const handleProfileSelect = (id: number) => {
    if (doctorMode && doctorInfo) {
      updateState({ selectedProfileId: id, currentStep: 'calendar' });
    } else {
      updateState({ selectedProfileId: id, currentStep: 'states' });
    }
  };

  const handleViewAllAppointments = () => {
    updateState({
      selectedProfileId: null,
      currentStep: 'appointments',
      previousStep: 'profiles'
    });
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

  const handleBookingSuccess = (bookedProfileId?: number) => {
    updateState({
      currentStep: 'appointments',
      pendingProfileId: bookedProfileId ?? state.pendingProfileId
    });
  };

  const handleAppointmentsBack = () => {
    if (doctorMode && doctorInfo) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('medroute:exit-doctor-mode'));
      }
      updateState({ currentStep: 'calendar', pendingProfileId: null });
    } else {
      updateState({ currentStep: (state.previousStep as any) || 'profiles' });
    }
  };

  const handleCalendarBack = () => {
    if (doctorMode && doctorInfo) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('medroute:exit-doctor-mode'));
      }
    } else {
      updateState({ currentStep: 'department' });
    }
  };

  return (
    <div className="booking-root">
      {!doctorMode && <Breadcrumb currentStep={state.currentStep} />}

      <div className="booking-content-area">
        {state.currentStep === 'profiles' && (
          <ProfileStep onSelect={handleProfileSelect} onViewAppointments={handleViewAllAppointments} />
        )}

        {!doctorMode && state.currentStep === 'states' && (
          <StateStep
            onSelect={handleStateSelect}
            onBack={() => updateState({ currentStep: 'profiles' })}
          />
        )}

        {!doctorMode && state.currentStep === 'hospitals' && state.selectedState && (
          <HospitalStep
            stateName={state.selectedState}
            onSelect={handleHospitalSelect}
            onBack={() => updateState({ currentStep: 'states' })}
          />
        )}

        {!doctorMode && state.currentStep === 'consultation' && (
          <ConsultStep
            onNewAppointment={() => updateState({ currentStep: 'department' })}
            onBack={() => updateState({ currentStep: 'hospitals' })}
          />
        )}

        {!doctorMode && state.currentStep === 'department' && state.selectedHospitalId && (
          <DeptStep
            hospitalId={state.selectedHospitalId}
            onSelect={handleDeptSelect}
            onBack={() => updateState({ currentStep: 'consultation' })}
          />
        )}

        {state.currentStep === 'calendar' &&
          state.selectedHospitalId &&
          state.selectedDepartmentId && (
            <CalendarStep
              hospitalId={state.selectedHospitalId}
              deptId={state.selectedDepartmentId}
              profileId={state.selectedProfileId}
              stateName={state.selectedState || ''}
              doctorId={state.selectedDoctorId ?? undefined}
              onBookingSuccess={handleBookingSuccess}
              onBack={handleCalendarBack}
            />
          )}

        {state.currentStep === 'appointments' && (
          <AppointmentsList
            profileId={state.selectedProfileId}
            initialProfileId={state.pendingProfileId}
            onBack={handleAppointmentsBack}
          />
        )}
      </div>
    </div>
  );
};
