// Mirrors backend com.medroute.dto.ReferralViews. Every status/label/action below is
// computed by the server (ReferralService) — screens render them, never derive them.

export type TimelineState = 'done' | 'current' | 'upcoming';

export interface TimelineStep {
  label: string;
  state: TimelineState;
}

export type ReferralKind = 'CONSULT' | 'TRANSFER';
export type ReferralScope = 'CASE' | 'FULL_HISTORY';
export type ReferralStatus = 'REQUESTED' | 'RESPONDED' | 'ACCEPTED' | 'FOLLOW_UP_BOOKED' | 'DECLINED' | 'CANCELLED';
export type ReferralAction = 'respond' | 'accept' | 'decline' | 'cancel' | 'book_follow_up' | 'add_records';

/** confirmed | referred | feedback_received | completed | cancelled */
export type AppointmentDisplayStatus = 'confirmed' | 'referred' | 'feedback_received' | 'completed' | 'cancelled';

export interface PatientRef {
  id: number;
  fullName: string;
  age: number | null;
  gender: string | null;
  bloodGroup: string | null;
  location: string | null;
}

export interface DoctorRef {
  id: number;
  name: string;
  qualification: string | null;
  hospitalId: number | null;
  hospitalName: string | null;
  departmentId: number | null;
  departmentName: string | null;
}

export interface AppointmentRef {
  id: number;
  date: string;
  status: string;
  tokenNumber: number | null;
  expectedTime: string | null;
}

export interface Referral {
  id: number;
  kind: ReferralKind;
  scope: ReferralScope;
  status: ReferralStatus;
  displayStatus: string;
  notes: string | null;
  responseNotes: string | null;
  createdAt: string;
  respondedAt: string | null;
  acceptedAt: string | null;
  closedAt: string | null;
  patient: PatientRef;
  fromDoctor: DoctorRef;
  toDoctor: DoctorRef;
  sourceAppointment: AppointmentRef | null;
  followUpAppointment: AppointmentRef | null;
  timeline: TimelineStep[];
  actions: ReferralAction[];
}

export interface AppointmentStatus {
  appointmentId: number;
  status: string;
  displayStatus: AppointmentDisplayStatus;
  displayLabel: string;
  timeline: TimelineStep[];
  /** Referrals sent FROM this visit. */
  referrals: Referral[];
  /** Handover this visit was booked from — null for a normal booking. */
  referredFrom: Referral | null;
}

export interface FollowUp {
  id: number;
  status: 'OPEN' | 'BOOKED' | 'CANCELLED';
  notes: string | null;
  createdAt: string;
  patient: PatientRef;
  doctor: DoctorRef;
  sourceAppointment: AppointmentRef | null;
  bookedAppointment: AppointmentRef | null;
  actions: 'book'[];
}

// ─── Case file (reports / prescriptions / notes along the care chain) ─────

/** Who wrote a record and where it came from — shown next to every item. */
export interface Ownership {
  authorDoctorId: number | null;
  authorName: string;
  /** imported = copied into this visit from a handover packet (original author kept). Records are never editable. */
  authorRole: 'visit_doctor' | 'second_opinion' | 'imported';
  appointmentId: number | null;
  /** Date of the visit the record was ORIGINALLY written on. */
  visitDate: string | null;
  referralId: number | null;
  /** From an earlier visit in the (same-doctor) care chain. */
  inherited: boolean;
  /** Written by the viewing doctor. */
  mine: boolean;
}

export interface CaseReport {
  id: number;
  reportType: string;
  title: string;
  textContent: string | null;
  fileUrl: string | null;
  reportDate: string;
  owner: Ownership;
}

export interface CasePrescription {
  id: number;
  medicineName: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
  prescribedDate: string;
  owner: Ownership;
}

export interface CaseNote {
  kind: 'advice' | 'findings';
  text: string;
  owner: Ownership;
}

export interface CaseRecords {
  appointmentId: number | null;
  referralId: number | null;
  canAdd: boolean;
  reports: CaseReport[];
  prescriptions: CasePrescription[];
  notes: CaseNote[];
}
