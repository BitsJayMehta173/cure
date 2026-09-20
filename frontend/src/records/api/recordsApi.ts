import type { PatientRecord, MedicalReport, Prescription } from '../types/records.types';

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/records` : 'http://localhost:8080/api/records';

/**
 * Get the current user's ID from AuthContext (stored in localStorage).
 * Duplicated from bookingApi.ts's own local helper — this codebase's
 * established convention for small per-module helpers rather than a shared util.
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

export const recordsApi = {
  // Patient chooser — profiles + unread notification counts
  getPatients: async (): Promise<PatientRecord[]> => {
    const userId = getCurrentUserId();
    if (!userId) throw new Error('Not logged in');
    const res = await fetch(`${API_BASE}/patients?userId=${userId}`);
    if (!res.ok) throw new Error('Failed to fetch patients');
    return res.json();
  },

  // Mark all of one patient's notifications read (called when opening their gallery)
  markPatientRead: async (patientId: number): Promise<void> => {
    const userId = getCurrentUserId();
    if (!userId) throw new Error('Not logged in');
    const res = await fetch(`${API_BASE}/patients/${patientId}/mark-read?userId=${userId}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to mark notifications read');
  },

  // Reports tab
  getReports: async (appointmentId: number): Promise<MedicalReport[]> => {
    const userId = getCurrentUserId();
    if (!userId) throw new Error('Not logged in');
    const res = await fetch(`${API_BASE}/reports?appointmentId=${appointmentId}&userId=${userId}`);
    if (!res.ok) throw new Error('Failed to fetch reports');
    return res.json();
  },

  // Medicine tab
  getMedicines: async (appointmentId: number): Promise<Prescription[]> => {
    const userId = getCurrentUserId();
    if (!userId) throw new Error('Not logged in');
    const res = await fetch(`${API_BASE}/medicines?appointmentId=${appointmentId}&userId=${userId}`);
    if (!res.ok) throw new Error('Failed to fetch medicines');
    return res.json();
  }
};
