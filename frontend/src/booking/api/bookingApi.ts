import type {
  PatientProfile,
  HospitalSummary,
  DepartmentSummary,
  SlotAvailability,
  TokenPreview,
  AvailableDoctor,
  BookingConfirmation,
  AppointmentSummary,
  DoctorSearchResult,
  DoctorProfile
} from '../types/booking.types';

const API_BASE = 'http://localhost:8080/api/booking';
const DOCTORS_BASE = 'http://localhost:8080/api/doctors';

/**
 * Get the current user's ID from AuthContext (stored in localStorage).
 * Returns null if not logged in.
 */
const getCurrentUserId = (): number | null => {
  try {
    const stored = localStorage.getItem('medroute_user');
    if (stored) {
      const user = JSON.parse(stored);
      return user.id || null;
    }
  } catch {
    // ignore parse errors
  }
  return null;
};

export const bookingApi = {
  // Profiles
  getProfiles: async (): Promise<PatientProfile[]> => {
    const userId = getCurrentUserId();
    if (!userId) throw new Error('Not logged in');
    const res = await fetch(`${API_BASE}/profiles?userId=${userId}`);
    if (!res.ok) throw new Error('Failed to fetch profiles');
    return res.json();
  },
  createProfile: async (data: Omit<PatientProfile, 'id' | 'createdAt'>): Promise<PatientProfile> => {
    const userId = getCurrentUserId();
    if (!userId) throw new Error('Not logged in');
    const res = await fetch(`${API_BASE}/profiles?userId=${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create profile');
    return res.json();
  },
  deleteProfile: async (id: number): Promise<void> => {
    const userId = getCurrentUserId();
    if (!userId) throw new Error('Not logged in');
    const res = await fetch(`${API_BASE}/profiles/${id}?userId=${userId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete profile');
  },

  // States
  getStates: async (): Promise<string[]> => {
    const res = await fetch(`${API_BASE}/states`);
    if (!res.ok) throw new Error('Failed to fetch states');
    return res.json();
  },

  // Hospitals
  getHospitals: async (state: string): Promise<HospitalSummary[]> => {
    const res = await fetch(`${API_BASE}/hospitals?state=${encodeURIComponent(state)}`);
    if (!res.ok) throw new Error('Failed to fetch hospitals');
    return res.json();
  },

  // Departments
  getDepartments: async (hospitalId: number): Promise<DepartmentSummary[]> => {
    const res = await fetch(`${API_BASE}/departments?hospitalId=${hospitalId}`);
    if (!res.ok) throw new Error('Failed to fetch departments');
    return res.json();
  },

  // Slots
  getSlots: async (hospitalId: number, deptId: number, month: string, state?: string): Promise<SlotAvailability[]> => {
    const url = state
      ? `${API_BASE}/slots?hospitalId=${hospitalId}&deptId=${deptId}&month=${month}&state=${encodeURIComponent(state)}`
      : `${API_BASE}/slots?hospitalId=${hospitalId}&deptId=${deptId}&month=${month}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch slots');
    return res.json();
  },

  // Preview
  getPreview: async (hospitalId: number, deptId: number, date: string, state?: string): Promise<TokenPreview> => {
    const url = state
      ? `${API_BASE}/preview?hospitalId=${hospitalId}&deptId=${deptId}&date=${date}&state=${encodeURIComponent(state)}`
      : `${API_BASE}/preview?hospitalId=${hospitalId}&deptId=${deptId}&date=${date}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch token preview');
    return res.json();
  },

  // Available doctors for a date (used in the doctor dropdown of the confirm modal)
  getAvailableDoctors: async (hospitalId: number, deptId: number, date: string, state?: string): Promise<AvailableDoctor[]> => {
    const url = state
      ? `${API_BASE}/available-doctors?hospitalId=${hospitalId}&deptId=${deptId}&date=${date}&state=${encodeURIComponent(state)}`
      : `${API_BASE}/available-doctors?hospitalId=${hospitalId}&deptId=${deptId}&date=${date}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch available doctors');
    return res.json();
  },

  // Confirm
  confirmBooking: async (
    profileId: number,
    hospitalId: number,
    deptId: number,
    date: string,
    doctorId?: number
  ): Promise<BookingConfirmation> => {
    const params = new URLSearchParams({
      profileId: String(profileId),
      hospitalId: String(hospitalId),
      deptId: String(deptId),
      date
    });
    if (doctorId != null) params.append('doctorId', String(doctorId));
    const res = await fetch(`${API_BASE}/confirm?${params.toString()}`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to confirm booking');
    return res.json();
  },

  // Appointments
  getAppointments: async (profileId?: number | null): Promise<AppointmentSummary[]> => {
    const userId = getCurrentUserId();
    if (!userId) throw new Error('Not logged in');
    const url = (profileId && profileId > 0)
      ? `${API_BASE}/appointments?userId=${userId}&profileId=${profileId}`
      : `${API_BASE}/appointments?userId=${userId}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch appointments');
    return res.json();
  },

  cancelAppointment: async (id: number): Promise<void> => {
    const userId = getCurrentUserId();
    if (!userId) throw new Error('Not logged in');
    const res = await fetch(`${API_BASE}/appointments/${id}?userId=${userId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to cancel appointment');
  },

  removeAppointment: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/appointments/${id}/remove`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to remove appointment');
  },

  // ─── Doctor Directory ────────────────────────────────────────────────
  /**
   * Real-time fuzzy search for doctors by name.
   * Uses PostgreSQL pg_trgm similarity — handles typos like "jay" vs "jai".
   */
  searchDoctors: async (query: string, limit = 10): Promise<DoctorSearchResult[]> => {
    if (!query || query.trim().length === 0) return [];
    const url = `${DOCTORS_BASE}/search?q=${encodeURIComponent(query.trim())}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to search doctors');
    return res.json();
  },

  /**
   * Fetch the full profile for a single doctor.
   */
  getDoctorProfile: async (doctorId: number): Promise<DoctorProfile> => {
    const res = await fetch(`${DOCTORS_BASE}/${doctorId}`);
    if (!res.ok) throw new Error('Failed to load doctor profile');
    return res.json();
  }
};
