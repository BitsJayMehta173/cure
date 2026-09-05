import type {
  PatientProfile,
  HospitalSummary,
  DepartmentSummary,
  SlotAvailability,
  TokenPreview,
  BookingConfirmation,
  AppointmentSummary
} from '../types/booking.types';

const API_BASE = 'http://localhost:8080/api/booking';

export const bookingApi = {
  // Profiles
  getProfiles: async (): Promise<PatientProfile[]> => {
    const res = await fetch(`${API_BASE}/profiles`);
    if (!res.ok) throw new Error('Failed to fetch profiles');
    return res.json();
  },
  createProfile: async (data: Omit<PatientProfile, 'id' | 'createdAt'>): Promise<PatientProfile> => {
    const res = await fetch(`${API_BASE}/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create profile');
    return res.json();
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
  getSlots: async (hospitalId: number, deptId: number, month: string): Promise<SlotAvailability[]> => {
    const res = await fetch(`${API_BASE}/slots?hospitalId=${hospitalId}&deptId=${deptId}&month=${month}`);
    if (!res.ok) throw new Error('Failed to fetch slots');
    return res.json();
  },

  // Preview
  getPreview: async (hospitalId: number, deptId: number, date: string): Promise<TokenPreview> => {
    const res = await fetch(`${API_BASE}/preview?hospitalId=${hospitalId}&deptId=${deptId}&date=${date}`);
    if (!res.ok) throw new Error('Failed to fetch token preview');
    return res.json();
  },

  // Confirm
  confirmBooking: async (profileId: number, hospitalId: number, deptId: number, date: string): Promise<BookingConfirmation> => {
    const res = await fetch(`${API_BASE}/confirm?profileId=${profileId}&hospitalId=${hospitalId}&deptId=${deptId}&date=${date}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to confirm booking');
    return res.json();
  },

  // Appointments
  getAppointments: async (profileId: number): Promise<AppointmentSummary[]> => {
    const res = await fetch(`${API_BASE}/appointments?profileId=${profileId}`);
    if (!res.ok) throw new Error('Failed to fetch appointments');
    return res.json();
  },
  
  cancelAppointment: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/appointments/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to cancel appointment');
  }
};
