/** Patient profile + unread notification count, for the Patient Records chooser. */
export interface PatientRecord {
  id: number;
  fullName: string;
  age: number;
  gender: string;
  relation: string;
  unreadNotifications: number;
}

/** A single medical report attached to an appointment. */
export interface MedicalReport {
  id: number;
  reportType: 'text' | 'image';
  title: string;
  textContent: string | null;
  fileUrl: string | null;
  reportDate: string; // YYYY-MM-DD
}

/** A single prescribed medicine entry attached to an appointment. */
export interface Prescription {
  id: number;
  medicineName: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
  prescribedDate: string; // YYYY-MM-DD
}

export type RecordsStep = 'chooser' | 'gallery' | 'detail';
