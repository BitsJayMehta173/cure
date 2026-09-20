import React, { useState } from 'react';
import type { RecordsStep, PatientRecord } from './types/records.types';
import type { AppointmentSummary } from '../booking/types/booking.types';
import { PatientChooser } from './components/PatientChooser/PatientChooser';
import { DateGallery } from './components/DateGallery/DateGallery';
import { AppointmentDetail } from './components/AppointmentDetail/AppointmentDetail';

/**
 * Step-machine for the Patient Records tab: chooser -> gallery -> detail.
 * Mirrors the pattern established by BookingRoot.tsx.
 */
export const PatientRecordsRoot: React.FC = () => {
  const [step, setStep] = useState<RecordsStep>('chooser');
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentSummary | null>(null);

  const handleSelectPatient = (patient: PatientRecord) => {
    setSelectedPatient(patient);
    setStep('gallery');
  };

  const handleSelectAppointment = (appointment: AppointmentSummary) => {
    setSelectedAppointment(appointment);
    setStep('detail');
  };

  return (
    <div className="records-root">
      {step === 'chooser' && (
        <PatientChooser onSelect={handleSelectPatient} />
      )}

      {step === 'gallery' && selectedPatient && (
        <DateGallery
          patient={selectedPatient}
          onBack={() => setStep('chooser')}
          onSelectAppointment={handleSelectAppointment}
        />
      )}

      {step === 'detail' && selectedAppointment && (
        <AppointmentDetail
          appointment={selectedAppointment}
          onBack={() => setStep('gallery')}
        />
      )}
    </div>
  );
};
