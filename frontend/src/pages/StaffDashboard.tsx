import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import './StaffDashboard.css';

interface PatientItem {
  id: number;
  fullName: string;
  age: number;
  gender: string;
  bloodGroup: string;
  mobile: string;
  relation: string;
  createdAt: string;
  userAccountId: number;
}

interface AppointmentItem {
  id: number;
  patientName: string;
  patientFk: number | null;
  doctorName: string;
  hospitalName: string;
  departmentName: string;
  dateStr: string;
  tokenCode: string;
  tokenNum: number;
  status: string;
}

export const StaffDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'patients' | 'appointments'>('patients');
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Edit Modal State
  const [editingPatient, setEditingPatient] = useState<PatientItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editAge, setEditAge] = useState(25);
  const [editGender, setEditGender] = useState('other');
  const [editBloodGroup, setEditBloodGroup] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editRelation, setEditRelation] = useState('self');
  const [modalSaving, setModalSaving] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  const loadPatients = async () => {
    setLoading(true);
    setError('');
    try {
      const url = search.trim()
        ? `${API_BASE}/api/staff/patients?search=${encodeURIComponent(search.trim())}`
        : `${API_BASE}/api/staff/patients`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load patient records');
      const data = await res.json();
      setPatients(data);
    } catch (err: any) {
      setError(err.message || 'Error fetching patients');
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/staff/appointments`);
      if (!res.ok) throw new Error('Failed to load appointments');
      const data = await res.json();
      setAppointments(data);
    } catch (err: any) {
      setError(err.message || 'Error fetching appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'patients') {
      loadPatients();
    } else {
      loadAppointments();
    }
  }, [activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadPatients();
  };

  const handleOpenEdit = (p: PatientItem) => {
    setEditingPatient(p);
    setEditName(p.fullName);
    setEditAge(p.age);
    setEditGender(p.gender);
    setEditBloodGroup(p.bloodGroup || '');
    setEditMobile(p.mobile);
    setEditRelation(p.relation || 'self');
  };

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;
    setModalSaving(true);
    try {
      const payload = {
        fullName: editName.trim(),
        age: Number(editAge),
        gender: editGender,
        bloodGroup: editBloodGroup.trim(),
        mobile: editMobile.trim(),
        relation: editRelation
      };
      const res = await fetch(`${API_BASE}/api/staff/patients/${editingPatient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to update patient');
      const updated: PatientItem = await res.json();
      setPatients(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      setEditingPatient(null);
      alert('Patient information updated successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to save patient');
    } finally {
      setModalSaving(false);
    }
  };

  const handleDeletePatient = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this patient profile?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/staff/patients/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete patient');
      setPatients(prev => prev.filter(p => p.id !== id));
      alert('Patient profile removed.');
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  const handleUpdateStatus = async (appointmentId: number, newStatus: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/staff/appointments/${appointmentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
      setAppointments(prev =>
        prev.map(a => (a.id === appointmentId ? { ...a, status: newStatus } : a))
      );
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  };

  return (
    <div className="staff-dashboard-container">
      {/* ─── Top Navigation ────────────────────────────────────────────── */}
      <header className="staff-nav-bar">
        <div className="staff-brand">
          <img src="/logo.png" alt="SujhavSewa Logo" className="staff-brand-logo" />
          <span className="staff-brand-text">SujhavSewa</span>
          <span className="staff-portal-pill">🏥 Staff Console</span>
        </div>
        <div className="staff-nav-actions">
          <span className="staff-nav-user">Staff: {user?.fullName}</span>
          <button className="staff-nav-logout" onClick={logout}>
            Sign Out
          </button>
        </div>
      </header>

      {/* ─── Main Content ─────────────────────────────────────────────── */}
      <main className="staff-content">
        {/* Banner with role isolation statement */}
        <div className="staff-sub-banner">
          <div className="staff-tabs">
            <button
              className={`staff-tab-btn ${activeTab === 'patients' ? 'active' : ''}`}
              onClick={() => setActiveTab('patients')}
            >
              👥 Patients Directory ({patients.length})
            </button>
            <button
              className={`staff-tab-btn ${activeTab === 'appointments' ? 'active' : ''}`}
              onClick={() => setActiveTab('appointments')}
            >
              📋 Appointments Roster
            </button>
          </div>
          <div className="staff-role-notice">
            🔒 Staff Authorization: Patient details &amp; appointments can be managed. Doctor clinical profiles are strictly read-only.
          </div>
        </div>

        {error && (
          <div style={{ background: '#f8d7da', color: '#721c24', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* ─── Tab 1: Patients Directory ─────────────────────────────── */}
        {activeTab === 'patients' && (
          <>
            <div className="staff-controls-row">
              <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: 1 }}>
                <input
                  type="text"
                  className="staff-search-input"
                  placeholder="Search patients by name, phone, or blood group..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <button type="submit" className="staff-action-btn edit" style={{ padding: '8px 16px' }}>
                  Search
                </button>
                {search && (
                  <button
                    type="button"
                    className="staff-action-btn"
                    onClick={() => {
                      setSearch('');
                      loadPatients();
                    }}
                  >
                    Clear
                  </button>
                )}
              </form>
            </div>

            <div className="staff-card">
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#0b5394' }}>Loading patients...</div>
              ) : patients.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#5d7285' }}>
                  No patient profiles found.
                </div>
              ) : (
                <table className="staff-table">
                  <thead>
                    <tr>
                      <th>Patient Name</th>
                      <th>Age / Gender</th>
                      <th>Mobile</th>
                      <th>Blood Group</th>
                      <th>Relation</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map(p => (
                      <tr key={p.id}>
                        <td>
                          <span className="patient-avatar-circle">
                            {p.fullName.charAt(0).toUpperCase()}
                          </span>
                          <strong>{p.fullName}</strong>
                        </td>
                        <td>
                          {p.age} yrs, <span style={{ textTransform: 'capitalize' }}>{p.gender}</span>
                        </td>
                        <td>{p.mobile || '—'}</td>
                        <td>
                          {p.bloodGroup ? (
                            <span className="blood-group-tag">{p.bloodGroup}</span>
                          ) : (
                            <span style={{ color: '#8c9ba5' }}>N/A</span>
                          )}
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>{p.relation || 'Self'}</td>
                        <td>
                          <button
                            className="staff-action-btn edit"
                            onClick={() => handleOpenEdit(p)}
                          >
                            ✏️ Edit Info
                          </button>
                          <button
                            className="staff-action-btn delete"
                            onClick={() => handleDeletePatient(p.id)}
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ─── Tab 2: Appointments Roster ─────────────────────────────── */}
        {activeTab === 'appointments' && (
          <div className="staff-card">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#0b5394' }}>Loading appointments...</div>
            ) : appointments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#5d7285' }}>
                No appointments recorded in the roster.
              </div>
            ) : (
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Patient Name</th>
                    <th>Doctor</th>
                    <th>Hospital / Dept</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Update Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map(a => (
                    <tr key={a.id}>
                      <td>
                        <strong style={{ color: '#0b5394' }}>#{a.tokenNum}</strong> ({a.tokenCode})
                      </td>
                      <td>
                        <strong>{a.patientName}</strong>
                      </td>
                      <td>{a.doctorName}</td>
                      <td>
                        <div>{a.hospitalName}</div>
                        <div style={{ fontSize: '11px', color: '#5d7285' }}>{a.departmentName}</div>
                      </td>
                      <td>{a.dateStr}</td>
                      <td>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background:
                              a.status === 'confirmed'
                                ? 'rgba(40, 167, 69, 0.12)'
                                : a.status === 'completed'
                                ? 'rgba(0, 123, 255, 0.12)'
                                : 'rgba(220, 53, 69, 0.12)',
                            color:
                              a.status === 'confirmed'
                                ? '#28a745'
                                : a.status === 'completed'
                                ? '#007bff'
                                : '#dc3545'
                          }}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td>
                        <select
                          value={a.status}
                          onChange={e => handleUpdateStatus(a.id, e.target.value)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid #c8d9e2',
                            fontSize: '12px'
                          }}
                        >
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ─── Edit Patient Modal ────────────────────────────────────── */}
        {editingPatient && (
          <div className="staff-modal-overlay" onClick={() => setEditingPatient(null)}>
            <div className="staff-modal-card" onClick={e => e.stopPropagation()}>
              <h3 className="staff-modal-title">Edit Patient Information</h3>
              <p className="staff-modal-subtitle">
                Update demographic information for <strong>{editingPatient.fullName}</strong>.
              </p>

              <form onSubmit={handleSavePatient}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #c8d9e2',
                      boxSizing: 'border-box'
                    }}
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                      Age *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="130"
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #c8d9e2',
                        boxSizing: 'border-box'
                      }}
                      value={editAge}
                      onChange={e => setEditAge(Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                      Gender *
                    </label>
                    <select
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #c8d9e2',
                        boxSizing: 'border-box'
                      }}
                      value={editGender}
                      onChange={e => setEditGender(e.target.value)}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                      Mobile Number (10 digits)
                    </label>
                    <input
                      type="text"
                      pattern="[0-9]{10}"
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #c8d9e2',
                        boxSizing: 'border-box'
                      }}
                      value={editMobile}
                      onChange={e => setEditMobile(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                      Blood Group
                    </label>
                    <select
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #c8d9e2',
                        boxSizing: 'border-box'
                      }}
                      value={editBloodGroup}
                      onChange={e => setEditBloodGroup(e.target.value)}
                    >
                      <option value="">Unknown / Not Set</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Relation
                  </label>
                  <select
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #c8d9e2',
                      boxSizing: 'border-box'
                    }}
                    value={editRelation}
                    onChange={e => setEditRelation(e.target.value)}
                  >
                    <option value="self">Self</option>
                    <option value="spouse">Spouse</option>
                    <option value="child">Child</option>
                    <option value="parent">Parent</option>
                    <option value="sibling">Sibling</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    className="staff-action-btn"
                    onClick={() => setEditingPatient(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="staff-action-btn edit"
                    style={{ background: '#0b5394', color: '#fff' }}
                    disabled={modalSaving}
                  >
                    {modalSaving ? 'Saving...' : '💾 Save Patient Info'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
