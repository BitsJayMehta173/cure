import type { AppointmentStatus, CaseRecords, FollowUp, Referral, ReferralKind } from '../types/referral.types';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/** Throws an Error carrying the server's message (ResponseStatusException reason) when available. */
async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      msg = data.message || data.error || msg;
    } catch { /* non-JSON error body */ }
    throw new Error(msg);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

/** Who is viewing/acting — exactly one of doctorId (doctor portal) / userId (patient app). */
export type Viewer = { doctorId: number } | { userId: number };

const viewerQuery = (v: Viewer) => ('doctorId' in v ? `doctorId=${v.doctorId}` : `userId=${v.userId}`);

export const referralApi = {
  create: (data: {
    patientId: number;
    fromDoctorId: number;
    toDoctorId: number;
    appointmentId: number | null;
    kind: ReferralKind;
    notes: string;
  }) => send<Referral>('POST', '/api/referrals', data),

  incoming: (doctorId: number) => send<Referral[]>('GET', `/api/referrals/incoming?doctorId=${doctorId}`),
  outgoing: (doctorId: number) => send<Referral[]>('GET', `/api/referrals/outgoing?doctorId=${doctorId}`),
  forPatient: (userId: number) => send<Referral[]>('GET', `/api/referrals/patient?userId=${userId}`),
  get: (id: number, viewer: Viewer) => send<Referral>('GET', `/api/referrals/${id}?${viewerQuery(viewer)}`),

  appointmentStatus: (appointmentId: number, viewer: Viewer) =>
    send<AppointmentStatus>('GET', `/api/referrals/appointment-status/${appointmentId}?${viewerQuery(viewer)}`),

  respond: (id: number, doctorId: number, findings: string) =>
    send<Referral>('POST', `/api/referrals/${id}/respond`, { doctorId, findings }),
  accept: (id: number, doctorId: number) => send<Referral>('POST', `/api/referrals/${id}/accept`, { doctorId }),
  decline: (id: number, doctorId: number, reason: string) =>
    send<Referral>('POST', `/api/referrals/${id}/decline`, { doctorId, reason }),
  cancel: (id: number, doctorId: number) => send<Referral>('POST', `/api/referrals/${id}/cancel`, { doctorId }),
  bookFollowUp: (id: number, actor: Viewer, date: string) =>
    send<Referral>('POST', `/api/referrals/${id}/book-follow-up`, { ...actor, date }),
};

export const followUpApi = {
  /** Finalizes the source visit; books now if `date` is given, else leaves it OPEN for the patient. */
  create: (sourceAppointmentId: number, doctorId: number, date: string | null, notes: string) =>
    send<FollowUp>('POST', '/api/follow-ups', { sourceAppointmentId, doctorId, date, notes }),
  forPatient: (userId: number) => send<FollowUp[]>('GET', `/api/follow-ups/patient?userId=${userId}`),
  book: (id: number, userId: number, date: string) =>
    send<FollowUp>('POST', `/api/follow-ups/${id}/book`, { userId, date }),
};

/** Where a new record goes: a visit (its own doctor) or a second-opinion referral (the referred doctor). */
export type RecordTarget = { appointmentId: number } | { referralId: number };

export const caseRecordsApi = {
  forAppointment: (appointmentId: number, doctorId: number) =>
    send<CaseRecords>('GET', `/api/case-records/appointment/${appointmentId}?doctorId=${doctorId}`),
  forReferral: (referralId: number, doctorId: number) =>
    send<CaseRecords>('GET', `/api/case-records/referral/${referralId}?doctorId=${doctorId}`),
  addReport: (doctorId: number, target: RecordTarget, data: { title: string; textContent: string; reportType?: string }) =>
    send<unknown>('POST', '/api/case-records/reports', { doctorId, ...target, ...data }),
  addPrescription: (doctorId: number, target: RecordTarget, data: {
    medicineName: string; dosage: string; frequency: string; duration: string; instructions: string;
  }) => send<unknown>('POST', '/api/case-records/prescriptions', { doctorId, ...target, ...data }),
};
