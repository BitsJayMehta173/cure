import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import './DoctorDashboard.css';
import type { DoctorProfile } from '../booking/types/booking.types';
import { PatientProfileView } from '../components/PatientProfileView';
import { referralApi, followUpApi, caseRecordsApi } from '../referrals/api/referralApi';
import { CaseRecordsPanel } from '../referrals/components/CaseRecordsPanel';
import { ReferredFromInfo } from '../referrals/components/ReferredFromInfo';
import { SmartTextInput } from '../smart-input/SmartTextInput';
import { suggestApi } from '../smart-input/suggestApi';
import type { AppointmentDisplayStatus, AppointmentStatus, Referral } from '../referrals/types/referral.types';
import { StatusBadge, StatusTimeline } from '../referrals/components/StatusTimeline';
import { SlotPicker } from '../referrals/components/SlotPicker';
import { ReferralCard } from '../referrals/components/ReferralCard';
import { ReferralWorkspace } from '../referrals/components/ReferralWorkspace';
import { AppointmentReferralsPanel } from '../referrals/components/AppointmentReferralsPanel';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface DoctorDashboardProps {
  doctorId?: number | null;
}

const getInitials = (name: string) => {
  if (!name) return 'DR';
  return name.replace('Dr.', '').trim().split(' ').slice(0, 2).map(p => p.charAt(0)).join('').toUpperCase();
};

const formatDate = (d: string) => {
  if (!d) return '';
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return d; }
};

// ─── Types ─────────────────────────────────────────────────────────────────

interface DoctorPatient {
  id: number;
  fullName: string;
  age: number;
  gender: string;
  bloodGroup: string;
  mobile: string;
  relation: string;
  lastVisitDate: string;
  lastVisitStatus: string;
}

interface DoctorAppointment {
  id: number;
  patientName: string;
  patientFk: number | null;
  tokenNum: number;
  tokenCode: string;
  dateStr: string;
  status: string;
  /** Server-computed (ReferralService): confirmed | referred | feedback_received | completed | cancelled */
  displayStatus?: AppointmentDisplayStatus;
  generalAdvice: string;
  expectedTimeStr: string;
  hospitalName: string;
  departmentName: string;
  doctorName: string;
  hospitalId?: number;
  departmentId?: number;
  patientAge?: number;
  patientGender?: string;
  patientBloodGroup?: string;
  patientMobile?: string;
}

// ─── Sub-component: Edit / View Profile Panel (slide-in overlay) ─────────

interface EditProfilePanelProps {
  doctor: DoctorProfile;
  onClose: () => void;
  onSaved: (updated: DoctorProfile) => void;
}

const EditProfilePanel: React.FC<EditProfilePanelProps> = ({ doctor, onClose, onSaved }) => {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [panelImgError, setPanelImgError] = useState(false);

  const [editName, setEditName] = useState(doctor.name || '');
  const [editQualification, setEditQualification] = useState(doctor.qualification || '');
  const [editPhotoUrl, setEditPhotoUrl] = useState(doctor.photoUrl || '');
  const [editBio, setEditBio] = useState(doctor.bio || '');
  const [editYearsExp, setEditYearsExp] = useState(doctor.yearsOfExperience ?? 0);
  const [editPatientsTreated, setEditPatientsTreated] = useState(doctor.totalPatientsTreated ?? 0);
  const [editAvgMinutes, setEditAvgMinutes] = useState(doctor.avgMinutesPerPatient ?? 15);
  const [editDailyLimit, setEditDailyLimit] = useState(doctor.dailyLimit ?? 20);
  const [editHospitalName, setEditHospitalName] = useState(doctor.hospitalName || '');
  const [editDepartmentName, setEditDepartmentName] = useState(doctor.departmentName || '');
  const [editHospitalAddress, setEditHospitalAddress] = useState(doctor.hospitalAddress || '');
  const [editHospitalState, setEditHospitalState] = useState(doctor.hospitalState || '');
  const [saving, setSaving] = useState(false);

  // ── Photo upload ────────────────────────────────────────────────────
  const [photoPreview, setPhotoPreview] = useState<string>(doctor.photoUrl || '');
  const [photoError, setPhotoError] = useState<string>('');
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ── Cascading dropdown state ────────────────────────────────────────
  const [states, setStates] = useState<string[]>([]);
  const [hospitals, setHospitals] = useState<{ id: number; name: string; address: string }[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | null>(null);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [loadingDepts, setLoadingDepts] = useState(false);

  useEffect(() => {
    setEditName(doctor.name || '');
    setEditQualification(doctor.qualification || '');
    setEditPhotoUrl(doctor.photoUrl || '');
    setPhotoPreview(doctor.photoUrl || '');
    setEditBio(doctor.bio || '');
    setEditYearsExp(doctor.yearsOfExperience ?? 0);
    setEditPatientsTreated(doctor.totalPatientsTreated ?? 0);
    setEditAvgMinutes(doctor.avgMinutesPerPatient ?? 15);
    setEditDailyLimit(doctor.dailyLimit ?? 20);
    setEditHospitalName(doctor.hospitalName || '');
    setEditDepartmentName(doctor.departmentName || '');
    setEditHospitalAddress(doctor.hospitalAddress || '');
    setEditHospitalState(doctor.hospitalState || '');
    setSelectedHospitalId(null);
    setPanelImgError(false);
    setPhotoError('');
  }, [doctor]);

  // Load states on mount
  useEffect(() => {
    setLoadingStates(true);
    fetch(`${API_BASE}/api/booking/states`)
      .then(r => r.ok ? r.json() : [])
      .then(setStates)
      .catch(() => setStates([]))
      .finally(() => setLoadingStates(false));
  }, []);

  // Load hospitals when state changes
  useEffect(() => {
    if (!editHospitalState) { setHospitals([]); setSelectedHospitalId(null); return; }
    setLoadingHospitals(true);
    fetch(`${API_BASE}/api/booking/hospitals?state=${encodeURIComponent(editHospitalState)}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        const mapped = data.map(h => ({ id: h.id, name: h.name, address: h.address }));
        setHospitals(mapped);
        const match = mapped.find(h => h.name === editHospitalName);
        if (match) { setSelectedHospitalId(match.id); setEditHospitalAddress(match.address || ''); }
        else setSelectedHospitalId(null);
      })
      .catch(() => setHospitals([]))
      .finally(() => setLoadingHospitals(false));
  }, [editHospitalState]);

  // Load departments when hospital changes
  useEffect(() => {
    if (!selectedHospitalId) { setDepartments([]); return; }
    setLoadingDepts(true);
    fetch(`${API_BASE}/api/booking/departments?hospitalId=${selectedHospitalId}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => setDepartments(data.map((d: any) => d.conditionName || d.name || '')))
      .catch(() => setDepartments([]))
      .finally(() => setLoadingDepts(false));
  }, [selectedHospitalId]);

  // Photo upload — max 1 MB with canvas compression
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError('');
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please upload a valid image file (JPG, PNG, WebP).');
      return;
    }
    const MAX_SIZE = 1 * 1024 * 1024; // 1 MB limit
    if (file.size > MAX_SIZE) {
      setPhotoError(`Photo size is ${(file.size / (1024 * 1024)).toFixed(2)} MB. Maximum allowed size is 1 MB.`);
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rawData = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxDim = 400;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.88);
          setPhotoPreview(compressed);
          setEditPhotoUrl(compressed);
        } else {
          setPhotoPreview(rawData);
          setEditPhotoUrl(rawData);
        }
      };
      img.onerror = () => {
        setPhotoPreview(rawData);
        setEditPhotoUrl(rawData);
      };
      img.src = rawData;
    };
    reader.readAsDataURL(file);
  };

  // Hospital selection — auto-fill address, reset department
  const handleHospitalChange = (hospitalId: number) => {
    const hosp = hospitals.find(h => h.id === hospitalId);
    if (hosp) {
      setSelectedHospitalId(hosp.id);
      setEditHospitalName(hosp.name);
      setEditHospitalAddress(hosp.address || '');
      setEditDepartmentName('');
    } else {
      setSelectedHospitalId(null);
      setEditHospitalName('');
      setEditHospitalAddress('');
      setEditDepartmentName('');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: editName.trim(), qualification: editQualification.trim(),
        photoUrl: editPhotoUrl.trim(), bio: editBio.trim(),
        yearsOfExperience: Number(editYearsExp), totalPatientsTreated: Number(editPatientsTreated),
        avgMinutesPerPatient: Number(editAvgMinutes), dailyLimit: Number(editDailyLimit),
        hospitalName: editHospitalName.trim(), departmentName: editDepartmentName.trim(),
        hospitalAddress: editHospitalAddress.trim(), hospitalState: editHospitalState.trim()
      };
      const res = await fetch(`${API_BASE}/api/doctors/${doctor.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Update failed');
      const updated: DoctorProfile = await res.json();
      onSaved(updated);
      setMode('view');
    } catch (err: any) {
      alert(err.message || 'Update failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="dd-edit-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dd-edit-panel">
        <div className="dd-edit-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2>{mode === 'view' ? '👤 Doctor Profile' : '✏️ Edit Profile'}</h2>
            {mode === 'edit' && (
              <button
                type="button"
                className="dd-panel-back-btn"
                onClick={() => setMode('view')}
              >
                ← View Profile
              </button>
            )}
          </div>
          <button className="dd-edit-close" onClick={onClose} title="Close">✕</button>
        </div>

        <div className="dd-edit-panel-body">
          {mode === 'view' ? (
            <div className="dd-profile-view-wrap">
              {/* Doctor Hero Card inside Profile Modal */}
              <div className="dd-profile-view-hero">
                <div className="dd-hero-photo">
                  {doctor.photoUrl && !panelImgError ? (
                    <img src={doctor.photoUrl} alt={doctor.name} onError={() => setPanelImgError(true)} />
                  ) : (
                    <span>{getInitials(doctor.name)}</span>
                  )}
                </div>
                <div className="dd-hero-info">
                  <h2 className="dd-hero-name" style={{ fontSize: '20px', margin: '0 0 4px' }}>{doctor.name}</h2>
                  <p className="dd-hero-qual" style={{ margin: '0 0 8px' }}>{doctor.qualification || 'Specialist'}</p>
                  <div className="dd-hero-badges">
                    {doctor.hospitalName && <span className="dd-badge hospital">{doctor.hospitalName}</span>}
                    {doctor.departmentName && <span className="dd-badge dept">{doctor.departmentName}</span>}
                    {doctor.hospitalState && <span className="dd-badge state">{doctor.hospitalState}</span>}
                  </div>
                  <div className={`dd-hero-avail ${doctor.hasUpcomingSlots ? 'avail' : 'unavail'}`} style={{ marginTop: '4px' }}>
                    {doctor.hasUpcomingSlots ? '🟢 Available — accepting new bookings' : '🟡 Currently fully booked'}
                  </div>
                </div>
              </div>

              {/* 4 Stats Cards */}
              <div className="dd-profile-stats-grid">
                <div className="dd-mini-stat">
                  <span className="n">{doctor.yearsOfExperience ?? 0}+</span>
                  <span className="l">Yrs Exp</span>
                </div>
                <div className="dd-mini-stat">
                  <span className="n">{doctor.totalPatientsTreated ? `${(doctor.totalPatientsTreated / 1000).toFixed(1)}k` : '0'}</span>
                  <span className="l">Patients</span>
                </div>
                <div className="dd-mini-stat">
                  <span className="n">{doctor.avgMinutesPerPatient ?? 15}</span>
                  <span className="l">Mins/Pt</span>
                </div>
                <div className="dd-mini-stat">
                  <span className="n">{doctor.dailyLimit ?? 0}</span>
                  <span className="l">Capacity</span>
                </div>
              </div>

              {/* Biography Section */}
              <div className="dd-profile-view-section">
                <h3>About & Biography</h3>
                <p className="dd-profile-view-bio">
                  {doctor.bio || 'No biography added yet. Click "Edit Profile" below to add your clinical approach, expertise, or background.'}
                </p>
              </div>

              {/* Practice & Location Section */}
              <div className="dd-profile-view-section">
                <h3>Practice & Hospital Details</h3>
                <div className="dd-profile-details-grid">
                  <div className="dd-profile-detail-card">
                    <span className="dd-detail-label">Hospital</span>
                    <span className="dd-detail-val">{doctor.hospitalName || '—'}</span>
                  </div>
                  <div className="dd-profile-detail-card">
                    <span className="dd-detail-label">Department</span>
                    <span className="dd-detail-val">{doctor.departmentName || '—'}</span>
                  </div>
                  <div className="dd-profile-detail-card">
                    <span className="dd-detail-label">Location / Address</span>
                    <span className="dd-detail-val">{doctor.hospitalAddress || '—'}</span>
                  </div>
                  <div className="dd-profile-detail-card">
                    <span className="dd-detail-label">State</span>
                    <span className="dd-detail-val">{doctor.hospitalState || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="dd-edit-actions">
                <button type="button" className="doc-btn-secondary" onClick={onClose}>Close</button>
                <button type="button" className="doc-btn-primary" onClick={() => setMode('edit')}>
                  ✏️ Edit Profile
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave}>
              <div className="dd-edit-section">
                <h3>Basic Info</h3>
                <div className="dd-edit-grid-2">
                  <div className="edit-field-group">
                    <label>Doctor Name *</label>
                    <input required value={editName} onChange={e => setEditName(e.target.value)} placeholder="e.g. Dr. Chitra Rajan" />
                  </div>
                  <div className="edit-field-group">
                    <label>Qualification</label>
                    <input value={editQualification} onChange={e => setEditQualification(e.target.value)} placeholder="e.g. MBBS, MD (Specialist)" />
                  </div>
                </div>
                {/* ── Photo Upload ── */}
                <div className="edit-field-group">
                  <label>Profile Photo</label>
                  <div className="dd-photo-upload-wrap">
                    <div className="dd-photo-preview">
                      {photoPreview
                        ? <img src={photoPreview} alt="Preview" onError={() => setPhotoPreview('')} />
                        : <span className="dd-photo-initials">{getInitials(editName || doctor.name)}</span>}
                    </div>
                    <div className="dd-photo-upload-controls">
                      <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
                      <button type="button" className="dd-upload-btn" onClick={() => photoInputRef.current?.click()}>📷 Upload Photo</button>
                      {photoPreview && <button type="button" className="dd-remove-photo-btn" onClick={() => { setPhotoPreview(''); setEditPhotoUrl(''); if (photoInputRef.current) photoInputRef.current.value = ''; }}>✕ Remove</button>}
                      <span className="dd-photo-hint">Max size: 1 MB · JPG, PNG, WebP</span>
                    </div>
                  </div>
                  {photoError && <div className="dd-photo-error">⚠️ {photoError}</div>}
                </div>
                <div className="edit-field-group">
                  <label>Biography / About</label>
                  <textarea rows={4} value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Clinical background, specialties, approach to care..." />
                </div>
              </div>

              <div className="dd-edit-section">
                <h3>Practice Details</h3>

                {/* 1 ─ State */}
                <div className="edit-field-group">
                  <label>State *</label>
                  <div className="dd-select-wrap">
                    <select className="dd-cascade-select" value={editHospitalState} required
                      onChange={e => { setEditHospitalState(e.target.value); setEditHospitalName(''); setEditHospitalAddress(''); setEditDepartmentName(''); setSelectedHospitalId(null); }}>
                      <option value="">{loadingStates ? 'Loading states…' : '— Select State —'}</option>
                      {states.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {loadingStates && <span className="dd-select-spinner">⏳</span>}
                  </div>
                </div>

                {/* 2 ─ Hospital */}
                <div className="edit-field-group">
                  <label>
                    Hospital Name *
                    {editHospitalState && !loadingHospitals && (
                      <span className="dd-cascade-count">
                        {hospitals.length} {hospitals.length === 1 ? 'hospital' : 'hospitals'} in {editHospitalState}
                      </span>
                    )}
                  </label>
                  <div className="dd-select-wrap">
                    <select
                      className="dd-cascade-select"
                      value={selectedHospitalId ?? ''}
                      required
                      disabled={!editHospitalState || loadingHospitals}
                      onChange={e => handleHospitalChange(Number(e.target.value))}
                    >
                      <option value="">
                        {!editHospitalState
                          ? '— Select a state first —'
                          : loadingHospitals
                          ? 'Loading hospitals…'
                          : hospitals.length === 0
                          ? 'No hospitals found in this state'
                          : `— Select Hospital (${hospitals.length} in ${editHospitalState}) —`}
                      </option>
                      {hospitals.map(h => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                    {loadingHospitals && <span className="dd-select-spinner">⏳</span>}
                  </div>
                </div>

                {/* 3 ─ Department */}
                <div className="edit-field-group">
                  <label>
                    Department *
                    {selectedHospitalId && !loadingDepts && (
                      <span className="dd-cascade-count">
                        {departments.length} {departments.length === 1 ? 'department' : 'departments'} available
                      </span>
                    )}
                  </label>
                  <div className="dd-select-wrap">
                    <select
                      className="dd-cascade-select"
                      value={editDepartmentName}
                      required
                      disabled={!selectedHospitalId || loadingDepts}
                      onChange={e => setEditDepartmentName(e.target.value)}
                    >
                      <option value="">
                        {!selectedHospitalId
                          ? '— Select a hospital first —'
                          : loadingDepts
                          ? 'Loading departments…'
                          : departments.length === 0
                          ? 'No departments found for this hospital'
                          : `— Select Department (${departments.length} available) —`}
                      </option>
                      {departments.map(d => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    {loadingDepts && <span className="dd-select-spinner">⏳</span>}
                  </div>
                </div>

                {/* 4 ─ Location (auto-filled, read-only) */}
                <div className="edit-field-group">
                  <label>
                    Location / Address
                    <span className="dd-readonly-badge">🔒 Auto-selected · Cannot be edited</span>
                  </label>
                  <div className="dd-readonly-input">
                    <span className="dd-readonly-icon">📍</span>
                    <input
                      type="text"
                      readOnly
                      tabIndex={-1}
                      value={editHospitalAddress}
                      placeholder={selectedHospitalId ? 'No address on file' : 'Select a hospital above to automatically populate location'}
                      className="dd-readonly-field"
                      title="Hospital location is auto-selected from the hospital name and cannot be edited"
                    />
                  </div>
                </div>
              </div>

              <div className="dd-edit-section">
                <h3>Capacity & Experience</h3>
                <div className="dd-edit-grid-4">
                  <div className="edit-field-group">
                    <label>Years Experience</label>
                    <input type="number" min="0" max="60" value={editYearsExp} onChange={e => setEditYearsExp(Number(e.target.value))} />
                  </div>
                  <div className="edit-field-group">
                    <label>Patients Treated</label>
                    <input type="number" min="0" value={editPatientsTreated} onChange={e => setEditPatientsTreated(Number(e.target.value))} />
                  </div>
                  <div className="edit-field-group">
                    <label>Mins / Patient</label>
                    <input type="number" min="5" max="120" value={editAvgMinutes} onChange={e => setEditAvgMinutes(Number(e.target.value))} />
                  </div>
                  <div className="edit-field-group">
                    <label>Daily Capacity</label>
                    <input type="number" min="1" max="100" value={editDailyLimit} onChange={e => setEditDailyLimit(Number(e.target.value))} />
                  </div>
                </div>
              </div>

              <div className="dd-edit-actions">
                <button type="button" className="doc-btn-secondary" onClick={() => setMode('view')}>Cancel</button>
                <button type="submit" className="doc-btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : '💾 Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Sub-component: Doctor Patient Directory ───────────────────────────────

interface DoctorPatientDirectoryProps {
  doctorId: number;
}

const DoctorPatientDirectory: React.FC<DoctorPatientDirectoryProps> = ({ doctorId }) => {
  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState<DoctorPatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/doctor-portal/patients?doctorId=${doctorId}`)
      .then(r => r.json()).then(data => { setPatients(data); setFiltered(data); }).catch(() => setPatients([]))
      .finally(() => setLoading(false));
  }, [doctorId]);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) { setFiltered(patients); return; }
    setFiltered(patients.filter(p =>
      p.fullName?.toLowerCase().includes(q) ||
      p.mobile?.includes(q) ||
      p.bloodGroup?.toLowerCase().includes(q)
    ));
  }, [search, patients]);

  if (selectedPatientId) {
    return <PatientProfileView patientId={selectedPatientId} doctorId={doctorId} onClose={() => setSelectedPatientId(null)} />;
  }

  return (
    <div className="dd-patient-dir">
      <div className="dd-search-bar">
        <span className="dd-search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search your patients by name, mobile, or blood group..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="dd-search-input"
        />
        {search && <button className="dd-search-clear" onClick={() => setSearch('')}>✕</button>}
      </div>

      {loading && <div className="dd-loading">⏳ Loading patients...</div>}

      {!loading && filtered.length === 0 && (
        <div className="dd-empty-state">
          <div className="dd-empty-icon">👥</div>
          <h3>{search ? 'No patients match your search' : 'No patients yet'}</h3>
          <p>{search ? 'Try a different name, mobile number, or blood group.' : 'Patients who book appointments with you will appear here.'}</p>
        </div>
      )}

      <div className="dd-patient-grid">
        {filtered.map(p => (
          <div key={p.id} className="dd-patient-card" onClick={() => setSelectedPatientId(p.id)} style={{ cursor: 'pointer' }}>
            <div className="dd-patient-avatar">{p.fullName?.charAt(0).toUpperCase() || '?'}</div>
            <div className="dd-patient-info">
              <div className="dd-patient-name">{p.fullName}</div>
              <div className="dd-patient-meta">
                {p.age && <span>{p.age}y</span>}
                {p.gender && <span>· {p.gender}</span>}
                {p.bloodGroup && <span className="dd-blood-group">🩸 {p.bloodGroup}</span>}
              </div>
              {p.mobile && <div className="dd-patient-mobile">📞 {p.mobile}</div>}
              {p.lastVisitDate && (
                <div className="dd-patient-last-visit">
                  Last visit: <strong>{formatDate(p.lastVisitDate)}</strong>
                  <span className={`dd-apt-status ${p.lastVisitStatus}`}>{p.lastVisitStatus}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Sub-component: Appointment Detail (Status/Reports/Prescriptions/Advice/Referrals/Finalize) ─

interface DoctorAptDetailProps {
  appointment: DoctorAppointment;
  doctorId: number;
  onBack: () => void;
}

const DoctorAptDetail: React.FC<DoctorAptDetailProps> = ({ appointment, doctorId, onBack }) => {
  const [tab, setTab] = useState<'status' | 'reports' | 'prescriptions' | 'advice' | 'refer' | 'finalize'>('status');
  const [advice, setAdvice] = useState(appointment.generalAdvice || '');
  const [savingAdvice, setSavingAdvice] = useState(false);
  const [adviceSaved, setAdviceSaved] = useState(false);
  // Advice is write-once (like every record): locked as soon as it exists.
  const [adviceLocked, setAdviceLocked] = useState(!!appointment.generalAdvice?.trim());
  const [adviceError, setAdviceError] = useState('');

  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeMessage, setFinalizeMessage] = useState('');

  // Status, timeline and referrals all come from the server (ReferralService).
  const [status, setStatus] = useState<AppointmentStatus | null>(null);
  const loadStatus = () => {
    referralApi.appointmentStatus(appointment.id, { doctorId })
      .then(setStatus)
      .catch(() => setStatus(null));
  };
  useEffect(loadStatus, [appointment.id, doctorId]);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const display: AppointmentDisplayStatus = status?.displayStatus ?? appointment.displayStatus ?? 'confirmed';
  const handedOver = (status?.referrals ?? []).some(r => r.kind === 'TRANSFER' && (r.status === 'ACCEPTED' || r.status === 'FOLLOW_UP_BOOKED'));
  const isFinal = display === 'completed' || display === 'cancelled' || handedOver;

  const saveAdvice = async () => {
    if (!advice.trim() || adviceLocked) return;
    if (!window.confirm("General advice can't be changed after saving. Save it now?")) return;
    setSavingAdvice(true);
    setAdviceError('');
    try {
      const res = await fetch(`${API_BASE}/api/doctor-portal/appointments/${appointment.id}/advice`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advice })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Could not save advice.');
      }
      setAdviceLocked(true);
      setAdviceSaved(true);
      suggestApi.learn('advice', advice, doctorId);
      setTimeout(() => setAdviceSaved(false), 3000);
    } catch (e: any) {
      setAdviceError(e?.message || 'Could not save advice.');
    } finally { setSavingAdvice(false); }
  };

  // Referrals still awaiting a response are withdrawn by the server when the visit is finalized.
  const pendingReferrals = (status?.referrals ?? []).filter(r => r.status === 'REQUESTED');
  const confirmWithdrawPending = () =>
    pendingReferrals.length === 0 || window.confirm(
      `Finalizing will cancel the pending referral${pendingReferrals.length > 1 ? 's' : ''} to `
      + pendingReferrals.map(r => r.toDoctor.name).join(', ')
      + ' — they have not responded yet. Continue?');

  const handleCompleteAppointment = async () => {
    if (!confirmWithdrawPending()) return;
    setFinalizing(true);
    try {
      await fetch(`${API_BASE}/api/doctor-portal/appointments/${appointment.id}/complete`, { method: 'POST' });
      setFinalizeMessage('✅ Appointment marked as completed.');
      loadStatus();
    } catch (e) {
      console.error(e);
      setFinalizeMessage('❌ Error completing appointment.');
    } finally {
      setFinalizing(false);
    }
  };

  const handleRequestFollowUp = async () => {
    if (!appointment.patientFk) return;
    if (!confirmWithdrawPending()) return;
    setFinalizing(true);
    setFinalizeMessage('');
    try {
      // Completes this visit and creates a follow-up: booked now if a date is picked, else left for the patient.
      await followUpApi.create(appointment.id, doctorId, followUpDate || null, followUpNotes);
      setFinalizeMessage(followUpDate
        ? `✅ Visit completed and follow-up booked for ${followUpDate}.`
        : '✅ Visit completed. The patient can book the follow-up from their portal.');
      setFollowUpDate('');
      loadStatus();
    } catch (e: any) {
      setFinalizeMessage('❌ ' + (e?.message || 'Error requesting follow-up.'));
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <div className="dd-apt-detail">
      <button className="dd-back-btn" onClick={onBack}>← Back to Appointments</button>

      <div className="dd-apt-detail-layout">
        {/* Left Nav */}
        <div className="dd-apt-detail-nav">
          {[
            { key: 'status', label: 'Status', icon: '🩺' },
            { key: 'reports', label: 'Medical Reports', icon: '📄' },
            { key: 'prescriptions', label: 'Prescriptions', icon: '💊' },
            { key: 'advice', label: 'General Advice', icon: '📝' },
            { key: 'refer', label: `Referrals${status?.referrals.length ? ` (${status.referrals.length})` : ''}`, icon: '🔄' },
            { key: 'finalize', label: 'Finalize', icon: '✅' },
          ].map(item => (
            <button
              key={item.key}
              className={`dd-apt-nav-btn ${tab === item.key ? 'active' : ''}`}
              onClick={() => setTab(item.key as any)}
            >
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </div>

        {/* Right Content */}
        <div className="dd-apt-detail-content">
          {tab === 'status' && (
            <div className="dd-status-panel">
              <div className="dd-status-panel-top">
                <div>
                  <h3>{appointment.hospitalName}</h3>
                  <p className="dd-status-dept">{appointment.departmentName}</p>
                </div>
                <StatusBadge status={display} label={status?.displayLabel ?? display} />
              </div>

              {status && <StatusTimeline steps={status.timeline} />}
              {status?.referredFrom && <ReferredFromInfo referral={status.referredFrom} />}
              {display === 'feedback_received' && (
                <div className="rf-success" style={{ marginBottom: 16 }}>
                  ✅ Second-opinion findings received — see the Referrals tab, then finalize this visit.
                </div>
              )}

              <div className="dd-status-grid">
                <div className="dd-status-box">
                  <span className="label">Patient</span>
                  <span className="value">{appointment.patientName}</span>
                </div>
                <div className="dd-status-box">
                  <span className="label">Date</span>
                  <span className="value">{formatDate(appointment.dateStr)}</span>
                </div>
                <div className="dd-status-box">
                  <span className="label">Token Number</span>
                  <span className="value">{appointment.tokenNum}</span>
                </div>
                <div className="dd-status-box highlight">
                  <span className="label">Expected Time</span>
                  <span className="value">{appointment.expectedTimeStr}</span>
                </div>
              </div>

              {(appointment.patientAge || appointment.patientGender || appointment.patientBloodGroup || appointment.patientMobile) && (
                <div className="dd-status-patient-info">
                  <h4>Patient Information</h4>
                  <div className="dd-status-grid">
                    {appointment.patientAge && <div className="dd-status-box"><span className="label">Age</span><span className="value">{appointment.patientAge} yrs</span></div>}
                    {appointment.patientGender && <div className="dd-status-box"><span className="label">Gender</span><span className="value">{appointment.patientGender}</span></div>}
                    {appointment.patientBloodGroup && <div className="dd-status-box"><span className="label">Blood Group</span><span className="value">🩸 {appointment.patientBloodGroup}</span></div>}
                    {appointment.patientMobile && <div className="dd-status-box"><span className="label">Mobile</span><span className="value">{appointment.patientMobile}</span></div>}
                  </div>
                </div>
              )}
            </div>
          )}

          {(tab === 'reports' || tab === 'prescriptions') && (
            <CaseRecordsPanel
              key={tab}
              load={() => caseRecordsApi.forAppointment(appointment.id, doctorId)}
              target={{ appointmentId: appointment.id }}
              doctorId={doctorId}
              sections={[tab]}
            />
          )}

          {tab === 'advice' && (
            <div className="dd-advice-panel">
              <h3>📝 General Advice</h3>
              {adviceLocked ? (
                <>
                  <p className="dd-advice-subtitle">🔒 Saved advice is permanent and can't be changed. Add a report if you need to record more.</p>
                  <div className="rf-quote" style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{advice}</div>
                  {adviceSaved && <span className="dd-advice-saved">✅ Saved successfully!</span>}
                </>
              ) : (
                <>
                  <p className="dd-advice-subtitle">
                    Add clinical notes, lifestyle recommendations, or follow-up instructions for this patient's visit.
                    {' '}🔒 Once saved, advice can't be edited.
                  </p>
                  <SmartTextInput
                    field="advice"
                    doctorId={doctorId}
                    multiline
                    rows={8}
                    className="dd-advice-textarea"
                    value={advice}
                    onChange={setAdvice}
                    placeholder="e.g. Take rest for 3 days. Avoid spicy food. Follow up in 2 weeks. Drink plenty of water..."
                  />
                  <div className="dd-advice-actions">
                    {adviceError && <span className="rf-error">❌ {adviceError}</span>}
                    <button className="doc-btn-primary" onClick={saveAdvice} disabled={savingAdvice || !advice.trim()}>
                      {savingAdvice ? 'Saving...' : '💾 Save Advice'}
                    </button>
                  </div>
                </>
              )}
              <h4 style={{ margin: '24px 0 10px' }}>Earlier in this case</h4>
              <CaseRecordsPanel
                load={() => caseRecordsApi.forAppointment(appointment.id, doctorId)}
                target={{ appointmentId: appointment.id }}
                doctorId={doctorId}
                sections={['notes']}
                hideOwnAdvice
                reloadKey={adviceSaved}
              />
            </div>
          )}

          {tab === 'refer' && (
            <AppointmentReferralsPanel
              appointmentId={appointment.id}
              patientId={appointment.patientFk}
              patientName={appointment.patientName}
              doctorId={doctorId}
              status={status}
              onChanged={loadStatus}
            />
          )}

          {tab === 'finalize' && (
            <div className="dd-advice-panel">
              <h3>✅ Finalize Appointment</h3>
              {isFinal ? (
                <p className="dd-advice-subtitle">
                  {handedOver
                    ? 'This case was handed over to another doctor — nothing left to finalize here.'
                    : `This visit is ${display}. Nothing left to finalize.`}
                </p>
              ) : (
                <>
                  <p className="dd-advice-subtitle">
                    Mark this appointment as completed, optionally with a follow-up visit with you.
                  </p>
                  {pendingReferrals.length > 0 && (
                    <p className="rf-meta" style={{ color: '#b45309' }}>
                      ⏳ Still awaiting a response from {pendingReferrals.map(r => r.toDoctor.name).join(', ')}.
                      Finalizing now will cancel {pendingReferrals.length > 1 ? 'those referrals' : 'that referral'}.
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '20px', marginTop: '20px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 240, padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                      <h4>Complete Only</h4>
                      <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>No follow-up needed.</p>
                      <button className="doc-btn-primary" onClick={handleCompleteAppointment} disabled={finalizing} style={{ width: '100%', background: '#4caf50' }}>
                        {finalizing ? 'Processing...' : 'Complete Appointment'}
                      </button>
                    </div>

                    <div style={{ flex: 2, minWidth: 300, padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                      <h4>Complete & Request Follow-up</h4>
                      <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 12px' }}>
                        Pick a date to book it now, or leave it blank and the patient books from their portal.
                      </p>
                      {appointment.hospitalId && appointment.departmentId && (
                        <SlotPicker hospitalId={appointment.hospitalId} deptId={appointment.departmentId}
                          value={followUpDate} onChange={setFollowUpDate} />
                      )}
                      <textarea className="rf-textarea" rows={2} style={{ marginTop: 10 }} value={followUpNotes}
                        onChange={e => setFollowUpNotes(e.target.value)} placeholder="Note for the patient (e.g. review in 2 weeks with blood report)" />
                      <div style={{ display: 'flex', gap: '10px', marginTop: 10 }}>
                        <button className="doc-btn-primary" onClick={handleRequestFollowUp} disabled={finalizing || !appointment.patientFk} style={{ flex: 1 }}>
                          {finalizing ? 'Processing...' : (followUpDate ? `Complete & book ${followUpDate}` : 'Complete & request follow-up')}
                        </button>
                        {followUpDate && (
                          <button className="doc-btn-secondary" onClick={() => setFollowUpDate('')} style={{ padding: '8px' }}>Clear</button>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {finalizeMessage && (
                <div style={{ marginTop: '20px', padding: '12px', background: '#f5f5f5', borderRadius: '6px', textAlign: 'center', fontWeight: 500 }}>
                  {finalizeMessage}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Sub-component: Doctor Appointments Tab ────────────────────────────────

interface DoctorAppointmentsTabProps {
  doctorId: number;
}

const DoctorAppointmentsTab: React.FC<DoctorAppointmentsTabProps> = ({ doctorId }) => {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedApt, setSelectedApt] = useState<DoctorAppointment | null>(null);
  const [dates, setDates] = useState<string[]>([]);
  // Bumped when returning from a detail view so statuses changed there (referred, completed…) refresh.
  const [reloadKey, setReloadKey] = useState(0);
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  // Load available dates
  useEffect(() => {
    fetch(`${API_BASE}/api/doctor-portal/appointment-dates?doctorId=${doctorId}`)
      .then(r => r.json()).then(setDates).catch(() => setDates([]));
  }, [doctorId]);

  // Load appointments for selected date
  useEffect(() => {
    setLoading(true);
    setSelectedApt(null);
    fetch(`${API_BASE}/api/doctor-portal/appointments?doctorId=${doctorId}&date=${selectedDate}`)
      .then(r => r.json()).then(setAppointments).catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, [doctorId, selectedDate, reloadKey]);

  if (selectedApt) {
    return (
      <DoctorAptDetail
        appointment={selectedApt}
        doctorId={doctorId}
        onBack={() => { setSelectedApt(null); setReloadKey(k => k + 1); }}
      />
    );
  }

  return (
    <div className="dd-appointments-tab">
      {/* Date Filter */}
      <div className="dd-date-filter">
        <div className="dd-date-filter-left">
          <label>📅 Filter by Date</label>
          <input
            type="date"
            className="dd-date-input"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>
        <div className="dd-date-chips">
          <button className={`dd-date-chip ${selectedDate === today ? 'active' : ''}`} onClick={() => setSelectedDate(today)}>Today</button>
          {dates.slice(0, 5).map(d => d !== today && (
            <button key={d} className={`dd-date-chip ${selectedDate === d ? 'active' : ''}`} onClick={() => setSelectedDate(d)}>
              {formatDate(d)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      {!loading && (
        <div className="dd-apt-summary">
          <strong>{appointments.length}</strong> appointment{appointments.length !== 1 ? 's' : ''} on <strong>{formatDate(selectedDate)}</strong>
        </div>
      )}

      {loading && <div className="dd-loading">⏳ Loading appointments...</div>}

      {!loading && appointments.length === 0 && (
        <div className="dd-empty-state">
          <div className="dd-empty-icon">📅</div>
          <h3>No appointments on this date</h3>
          <p>Select a different date to view your schedule.</p>
        </div>
      )}

      <div className="dd-apt-list">
        {appointments.map(apt => (
          <div key={apt.id} className="dd-apt-card" onClick={() => setSelectedApt(apt)}>
            <div className="dd-apt-token">
              <span className="dd-token-num">#{apt.tokenNum}</span>
              <span className="dd-token-time">{apt.expectedTimeStr}</span>
            </div>
            <div className="dd-apt-info">
              <div className="dd-apt-patient-name">{apt.patientName}</div>
              <div className="dd-apt-meta">
                {apt.patientAge && <span>{apt.patientAge}y</span>}
                {apt.patientGender && <span>· {apt.patientGender}</span>}
                {apt.patientBloodGroup && <span>🩸 {apt.patientBloodGroup}</span>}
              </div>
            </div>
            <div className="dd-apt-right">
              <StatusBadge status={apt.displayStatus ?? apt.status} label={(apt.displayStatus ?? apt.status).replace('_', ' ')} />
              <span className="dd-apt-arrow">›</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Sub-component: Doctor Referrals Tab ────────────────────────────────────

interface DoctorReferralsTabProps {
  doctorId: number;
}

type ReferralFilter = 'action' | 'received' | 'sent';

const DoctorReferralsTab: React.FC<DoctorReferralsTabProps> = ({ doctorId }) => {
  const [incoming, setIncoming] = useState<Referral[]>([]);
  const [outgoing, setOutgoing] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReferralFilter>('action');
  const [selected, setSelected] = useState<Referral | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([referralApi.incoming(doctorId), referralApi.outgoing(doctorId)])
      .then(([inc, out]) => { setIncoming(inc); setOutgoing(out); })
      .catch(() => { setIncoming([]); setOutgoing([]); })
      .finally(() => setLoading(false));
  };
  useEffect(load, [doctorId]);

  const needsAction = incoming.filter(r => r.actions.length > 0);

  if (selected) {
    return (
      <ReferralWorkspace
        referral={selected}
        doctorId={doctorId}
        onBack={() => { setSelected(null); load(); }}
        onChanged={updated => {
          setSelected(updated);
          setIncoming(prev => prev.map(r => (r.id === updated.id ? updated : r)));
          setOutgoing(prev => prev.map(r => (r.id === updated.id ? updated : r)));
        }}
      />
    );
  }

  const list = filter === 'action' ? needsAction : filter === 'received' ? incoming : outgoing;

  return (
    <div className="dd-patient-dir">
      <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>🔄 Referrals</h3>

      <div className="rf-filters">
        <button className={`rf-filter ${filter === 'action' ? 'active' : ''}`} onClick={() => setFilter('action')}>
          Needs your action ({needsAction.length})
        </button>
        <button className={`rf-filter ${filter === 'received' ? 'active' : ''}`} onClick={() => setFilter('received')}>
          Received ({incoming.length})
        </button>
        <button className={`rf-filter ${filter === 'sent' ? 'active' : ''}`} onClick={() => setFilter('sent')}>
          Sent ({outgoing.length})
        </button>
      </div>

      {loading && <div className="dd-loading">⏳ Loading referrals...</div>}

      {!loading && list.length === 0 && (
        <div className="dd-empty-state">
          <div className="dd-empty-icon">📋</div>
          <h3>{filter === 'sent' ? 'No referrals sent' : filter === 'action' ? 'Nothing waiting on you' : 'No referrals yet'}</h3>
          <p>
            {filter === 'sent'
              ? 'Refer a case from an appointment’s Referrals tab.'
              : 'When another doctor refers a patient to you, it will appear here.'}
          </p>
        </div>
      )}

      <div className="rf-grid">
        {list.map(r => (
          <ReferralCard
            key={r.id}
            referral={r}
            perspective={filter === 'sent' ? 'from' : 'to'}
            onClick={() => setSelected(r)}
          />
        ))}
      </div>
    </div>
  );
};

// ─── Main DoctorDashboard ──────────────────────────────────────────────────

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ doctorId }) => {
  const { user, logout } = useAuth();
  const activeDoctorId = doctorId || user?.doctorId || 1;

  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'patients' | 'appointments' | 'referrals'>('patients');
  const [imgError, setImgError] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  const loadDoctorProfile = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/api/doctors/${activeDoctorId}`);
      if (!res.ok) throw new Error('Doctor profile not found');
      setDoctor(await res.json());
    } catch (err: any) {
      setError(err.message || 'Failed to load doctor profile');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadDoctorProfile(); }, [activeDoctorId]);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleProfileSaved = (updated: DoctorProfile) => {
    setDoctor(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  if (loading) return (
    <div className="doctor-dashboard-container">
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--color-primary)' }}>⏳ Loading doctor portal...</div>
    </div>
  );

  if (error || !doctor) return (
    <div className="doctor-dashboard-container">
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <h2 style={{ color: '#dc3545' }}>Error Loading Profile</h2>
        <p>{error}</p>
        <button className="doc-btn-primary" onClick={loadDoctorProfile} style={{ marginTop: 16 }}>Retry</button>
      </div>
    </div>
  );

  return (
    <div className="doctor-dashboard-container">
      {/* ─── TOP NAV BAR ───────────────────────────────────────────────── */}
      <header className="doctor-nav-bar">
        {/* Brand */}
        <div className="doctor-brand">
          <img src="/logo.png" alt="Logo" className="doctor-brand-logo" />
          <span className="doctor-portal-pill">🩺 Doctor Portal</span>
        </div>

        {/* Center Nav Tabs */}
        <nav className="dd-nav-tabs">
          <button
            className={`dd-nav-tab ${activeTab === 'patients' ? 'active' : ''}`}
            onClick={() => setActiveTab('patients')}
          >
            👥 Patient Directory
          </button>
          <button
            className={`dd-nav-tab ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointments')}
          >
            📅 Appointments
          </button>
          <button
            className={`dd-nav-tab ${activeTab === 'referrals' ? 'active' : ''}`}
            onClick={() => setActiveTab('referrals')}
          >
            🔄 Referrals
          </button>
        </nav>

        {/* Right: Profile Avatar Dropdown */}
        <div className="dd-profile-menu-wrap" ref={profileMenuRef}>
          <button
            className="dd-profile-avatar-btn"
            onClick={() => setProfileMenuOpen(o => !o)}
            title={user?.fullName || doctor?.name || 'Profile'}
          >
            <div className="dd-profile-avatar">
              {doctor?.photoUrl && !imgError ? (
                <img src={doctor.photoUrl} alt="profile" onError={() => setImgError(true)} />
              ) : (
                <span>{getInitials(doctor?.name || user?.fullName || 'DR')}</span>
              )}
            </div>
            <span className="dd-profile-avatar-name">{(user?.fullName || doctor?.name || '').split(' ')[0]}</span>
            <span className="dd-profile-avatar-caret">{profileMenuOpen ? '▲' : '▼'}</span>
          </button>

          {profileMenuOpen && (
            <div className="dd-profile-dropdown">
              <div
                className="dd-profile-dropdown-header"
                style={{ cursor: 'pointer' }}
                onClick={() => { setShowEditPanel(true); setProfileMenuOpen(false); }}
                title="View Doctor Profile"
              >
                <div className="dd-profile-dropdown-avatar">
                  {doctor?.photoUrl && !imgError ? (
                    <img src={doctor.photoUrl} alt="profile" onError={() => setImgError(true)} />
                  ) : (
                    <span>{getInitials(doctor?.name || 'DR')}</span>
                  )}
                </div>
                <div>
                  <div className="dd-dropdown-name">{doctor?.name}</div>
                  <div className="dd-dropdown-role">{doctor?.departmentName} · {doctor?.hospitalName}</div>
                </div>
              </div>
              <div className="dd-profile-dropdown-divider" />
              <button
                className="dd-dropdown-item"
                onClick={() => { setShowEditPanel(true); setProfileMenuOpen(false); }}
              >
                ✏️ Edit Profile
              </button>
              <button
                className="dd-dropdown-item danger"
                onClick={() => { logout(); setProfileMenuOpen(false); }}
              >
                🚪 Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ─── EDIT PROFILE OVERLAY ─────────────────────────────────────── */}
      {showEditPanel && (
        <EditProfilePanel
          doctor={doctor}
          onClose={() => setShowEditPanel(false)}
          onSaved={handleProfileSaved}
        />
      )}

      {/* ─── SAVE SUCCESS BANNER ──────────────────────────────────────── */}
      {saveSuccess && (
        <div className="dd-save-banner">
          ✅ Profile updated successfully! Changes are now live.
          <button onClick={() => setSaveSuccess(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8 }}>✕</button>
        </div>
      )}

      {/* ─── MAIN CONTENT ─────────────────────────────────────────────── */}
      <div className="dd-main-content">
        {/* Tab Content — no tab bar here anymore, it's in the nav */}
        <div className="dd-tab-content">
          {activeTab === 'patients' && <DoctorPatientDirectory doctorId={Number(activeDoctorId)} />}
          {activeTab === 'appointments' && <DoctorAppointmentsTab doctorId={Number(activeDoctorId)} />}
          {activeTab === 'referrals' && (
            <DoctorReferralsTab doctorId={Number(activeDoctorId)} />
          )}
        </div>
      </div>
    </div>
  );
};
