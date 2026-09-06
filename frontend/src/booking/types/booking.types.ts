export interface PatientProfile {
  id: number;
  fullName: string;
  age: number;
  gender: string;
  bloodGroup: string;
  mobile: string;
  relation: string;
  createdAt: string;
}

export interface HospitalSummary {
  id: number;
  name: string;
  address: string;
  state: string;
  type: string; // government | private | trust
  opdHours: string;
  rating: number;
  departmentCount: number;
  accreditation: string[];
}

export interface DepartmentSummary {
  id: number;
  conditionName: string;
}

export interface SlotAvailability {
  date: string;       // YYYY-MM-DD
  status: 'available' | 'full' | 'holiday' | 'not_open';
  totalSlots: number;
  bookedSlots: number;
  remainingSlots: number;
  holidayName: string | null;
}

export interface TokenPreview {
  assignedDoctor: string;
  doctorQualification: string;
  tokenNumber: number;
  avgMinutesPerPatient: number;
  expectedTimeStr: string;
  remainingSlots: number;
  doctorId: number;
}

export interface AvailableDoctor {
  doctorId: number;
  doctorName: string;
  qualification: string;
  yearsOfExperience: number;
  avgMinutesPerPatient: number;
  tokenNumber: number;
  remainingSlots: number;
  expectedTimeStr: string;
}

export interface BookingConfirmation {
  appointmentId: number;
  tokenCode: string;
  tokenNumber: number;
  doctorName: string;
  expectedTimeStr: string;
  hospitalName: string;
  departmentName: string;
  date: string;
  status: string;
}

export interface AppointmentSummary {
  id: number;
  hospitalName: string;
  departmentName: string;
  doctorName: string;
  date: string;
  tokenNumber: number;
  expectedTimeStr: string;
  status: string;
  patientName: string;
}

export type BookingStep = 
  | 'profiles' 
  | 'states' 
  | 'hospitals' 
  | 'consultation'
  | 'department'
  | 'calendar'
  | 'appointments';

export interface BookingWizardState {
  currentStep: BookingStep;
  selectedProfileId: number | null;
  selectedState: string | null;
  selectedHospitalId: number | null;
  selectedDepartmentId: number | null;
}
