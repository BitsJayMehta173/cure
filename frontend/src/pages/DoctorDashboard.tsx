import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import './DoctorDashboard.css';
import type { DoctorProfile } from '../booking/types/booking.types';
import { PatientProfileView } from '../components/PatientProfileView';
import { ReferralModal } from '../components/ReferralModal';

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

// ─── Sub-component: Appointment Detail (Status/Prescriptions/General Advice) ─

interface DoctorAptDetailProps {
  appointment: DoctorAppointment;
  doctorId: number;
  onBack: () => void;
}

const STEPS = ['Scheduled', 'Confirmed', 'Completed'] as const;

const DoctorAptDetail: React.FC<DoctorAptDetailProps> = ({ appointment, doctorId, onBack }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'status' | 'reports' | 'prescriptions' | 'advice' | 'refer' | 'finalize'>('status');
  const [advice, setAdvice] = useState(appointment.generalAdvice || '');
  const [savingAdvice, setSavingAdvice] = useState(false);
  const [adviceSaved, setAdviceSaved] = useState(false);
  
  const [medicines, setMedicines] = useState<any[]>([]);
  const [medsLoading, setMedsLoading] = useState(false);
  const [newMed, setNewMed] = useState({ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' });

  const [reports, setReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [newReport, setNewReport] = useState({ title: '', textContent: '', reportType: 'text' });

  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeMessage, setFinalizeMessage] = useState('');
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  const isCancelled = appointment.status === 'cancelled';
  const isPastVisit = !isCancelled && new Date(appointment.dateStr) < new Date(new Date().toDateString());
  const isCompleted = appointment.status === 'completed' || isPastVisit;
  const activeStepIndex = isCompleted ? 2 : 1;
  const badgeLabel = isCancelled ? 'CANCELLED' : isCompleted ? 'COMPLETED' : 'CONFIRMED';
  const badgeClass = isCancelled ? 'dd-status-badge cancelled' : isCompleted ? 'dd-status-badge completed' : 'dd-status-badge confirmed';

  useEffect(() => {
    if (tab === 'prescriptions') {
      loadMedicines();
    } else if (tab === 'reports') {
      loadReports();
    }
  }, [tab, appointment.id]);

  const loadMedicines = () => {
    setMedsLoading(true);
    fetch(`${API_BASE}/api/records/medicines?appointmentId=${appointment.id}&userId=0`)
      .then(r => r.ok ? r.json() : []).then(setMedicines).catch(() => setMedicines([]))
      .finally(() => setMedsLoading(false));
  };

  const loadReports = () => {
    setReportsLoading(true);
    fetch(`${API_BASE}/api/records/reports?appointmentId=${appointment.id}&userId=0`)
      .then(r => r.ok ? r.json() : []).then(setReports).catch(() => setReports([]))
      .finally(() => setReportsLoading(false));
  };

  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMed.medicineName) return;
    try {
      await fetch(`${API_BASE}/api/records/medicines`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newMed, appointmentId: appointment.id, authorName: user?.fullName || 'Doctor' })
      });
      setNewMed({ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' });
      loadMedicines();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReport.title) return;
    try {
      await fetch(`${API_BASE}/api/records/reports`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newReport, appointmentId: appointment.id, authorName: user?.fullName || 'Doctor' })
      });
      setNewReport({ title: '', textContent: '', reportType: 'text' });
      loadReports();
    } catch (err) {
      console.error(err);
    }
  };

  const saveAdvice = async () => {
    setSavingAdvice(true);
    try {
      await fetch(`${API_BASE}/api/doctor-portal/appointments/${appointment.id}/advice`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advice })
      });
      setAdviceSaved(true);
      setTimeout(() => setAdviceSaved(false), 3000);
    } finally { setSavingAdvice(false); }
  };

  const handleCompleteAppointment = async () => {
    setFinalizing(true);
    try {
      await fetch(`${API_BASE}/api/doctor-portal/appointments/${appointment.id}/complete`, { method: 'POST' });
      setFinalizeMessage('✅ Appointment marked as completed.');
      setTimeout(() => setFinalizeMessage(''), 3000);
      onBack();
    } catch (e) {
      console.error(e);
      setFinalizeMessage('❌ Error completing appointment.');
    } finally {
      setFinalizing(false);
    }
  };

  const handleScheduleFollowup = async () => {
    setFinalizing(true);
    try {
      // Create a self-referral so the patient sees the follow-up in their portal
      const res = await fetch(`${API_BASE}/api/doctor-portal/referrals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: appointment.patientFk,
          referredByDoctorId: doctorId,
          referredToDoctorId: doctorId,
          appointmentId: appointment.id,
          referralType: 'SINGLE_CASE',
          notes: 'Follow-up requested by doctor.'
        })
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (!(data.error && data.error.includes("already been referred"))) {
          throw new Error(data.error);
        }
      }
      
      // If the doctor picked a follow-up date, book it directly
      if (followUpDate) {
        const bookRes = await fetch(`${API_BASE}/api/booking/confirm?profileId=${appointment.patientFk}&hospitalId=${appointment.hospitalId || 1}&deptId=${appointment.departmentId || 1}&date=${followUpDate}&doctorId=${doctorId}`, {
          method: 'POST'
        });
        if (!bookRes.ok) throw new Error('Failed to book follow-up appointment.');
      }
      // If no date, the patient can pick a date from their portal

      await fetch(`${API_BASE}/api/doctor-portal/appointments/${appointment.id}/complete`, { method: 'POST' });
      setFinalizeMessage('✅ Follow-up requested and appointment completed.');
      setTimeout(() => {
        setFinalizeMessage('');
        onBack();
      }, 2000);
    } catch (e: any) {
      console.error(e);
      setFinalizeMessage('❌ ' + (e.message || 'Error scheduling follow-up.'));
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
            { key: 'refer', label: 'Refer Case', icon: '🔄' },
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
                <span className={badgeClass}>{badgeLabel}</span>
              </div>

              {!isCancelled ? (
                <div className="dd-status-stepper">
                  {STEPS.map((step, i) => (
                    <React.Fragment key={step}>
                      <div className={`dd-status-step ${i <= activeStepIndex ? 'done' : ''}`}>
                        <span className="dd-status-dot" />
                        <span className="dd-status-label">{step}</span>
                      </div>
                      {i < STEPS.length - 1 && <div className={`dd-status-line ${i < activeStepIndex ? 'done' : ''}`} />}
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <div className="dd-cancelled-note">This appointment was cancelled.</div>
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

          {tab === 'reports' && (
            <div>
              <div className="dd-advice-panel" style={{ marginBottom: '20px' }}>
                <h3>📄 Add Medical Report</h3>
                <form onSubmit={handleAddReport} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input type="text" placeholder="Report Title (e.g., Blood Test Results)" value={newReport.title} onChange={e => setNewReport({...newReport, title: e.target.value})} className="dd-advice-textarea" style={{ minHeight: '40px' }} required />
                  <textarea placeholder="Report Details / Content" value={newReport.textContent} onChange={e => setNewReport({...newReport, textContent: e.target.value})} className="dd-advice-textarea" rows={4} required />
                  <button type="submit" className="doc-btn-primary" style={{ alignSelf: 'flex-start' }}>Upload Report</button>
                </form>
              </div>

              {reportsLoading && <p className="dd-loading">Loading reports...</p>}
              {!reportsLoading && reports.length === 0 && (
                <div className="dd-empty-state" style={{ padding: '40px 20px' }}>
                  <div className="dd-empty-icon">📄</div>
                  <h3>No reports yet</h3>
                  <p>Medical reports for this appointment will appear here.</p>
                </div>
              )}
              <div className="dd-medicine-list">
                {reports.map((r: any) => (
                  <div key={r.id} className="dd-medicine-card">
                    <div className="dd-medicine-top">
                      <h4>📄 {r.title}</h4>
                      <span className="dd-dosage">{r.reportDate}</span>
                    </div>
                    <p className="dd-medicine-note">{r.textContent}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'prescriptions' && (
            <div>
              <div className="dd-advice-panel" style={{ marginBottom: '20px' }}>
                <h3>💊 Add Prescription</h3>
                <form onSubmit={handleAddMedicine} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input type="text" placeholder="Medicine Name" value={newMed.medicineName} onChange={e => setNewMed({...newMed, medicineName: e.target.value})} className="dd-advice-textarea" style={{ minHeight: '40px' }} required />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" placeholder="Dosage (e.g., 500mg)" value={newMed.dosage} onChange={e => setNewMed({...newMed, dosage: e.target.value})} className="dd-advice-textarea" style={{ minHeight: '40px', flex: 1 }} />
                    <input type="text" placeholder="Frequency (e.g., Twice daily)" value={newMed.frequency} onChange={e => setNewMed({...newMed, frequency: e.target.value})} className="dd-advice-textarea" style={{ minHeight: '40px', flex: 1 }} />
                  </div>
                  <input type="text" placeholder="Duration (e.g., 5 days)" value={newMed.duration} onChange={e => setNewMed({...newMed, duration: e.target.value})} className="dd-advice-textarea" style={{ minHeight: '40px' }} />
                  <textarea placeholder="Instructions" value={newMed.instructions} onChange={e => setNewMed({...newMed, instructions: e.target.value})} className="dd-advice-textarea" rows={2} />
                  <button type="submit" className="doc-btn-primary" style={{ alignSelf: 'flex-start' }}>Add Medicine</button>
                </form>
              </div>

              {medsLoading && <p className="dd-loading">Loading prescriptions...</p>}
              {!medsLoading && medicines.length === 0 && (
                <div className="dd-empty-state" style={{ padding: '40px 20px' }}>
                  <div className="dd-empty-icon">💊</div>
                  <h3>No prescriptions yet</h3>
                  <p>Medicines prescribed for this appointment will appear here.</p>
                </div>
              )}
              <div className="dd-medicine-list">
                {medicines.map((m: any) => (
                  <div key={m.id} className="dd-medicine-card">
                    <div className="dd-medicine-top">
                      <h4>💊 {m.medicineName}</h4>
                      {m.dosage && <span className="dd-dosage">{m.dosage}</span>}
                    </div>
                    <div className="dd-medicine-meta">
                      {m.frequency && <div className="dd-meta-box"><span className="label">Frequency</span><span className="value">{m.frequency}</span></div>}
                      {m.duration && <div className="dd-meta-box"><span className="label">Duration</span><span className="value">{m.duration}</span></div>}
                    </div>
                    {m.instructions && <p className="dd-medicine-note">📝 {m.instructions}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'advice' && (
            <div className="dd-advice-panel">
              <h3>📝 General Advice</h3>
              <p className="dd-advice-subtitle">Add clinical notes, lifestyle recommendations, or follow-up instructions for this patient's visit.</p>
              <textarea
                className="dd-advice-textarea"
                rows={8}
                value={advice}
                onChange={e => setAdvice(e.target.value)}
                placeholder="e.g. Take rest for 3 days. Avoid spicy food. Follow up in 2 weeks. Drink plenty of water..."
              />
              <div className="dd-advice-actions">
                {adviceSaved && <span className="dd-advice-saved">✅ Saved successfully!</span>}
                <button className="doc-btn-primary" onClick={saveAdvice} disabled={savingAdvice}>
                  {savingAdvice ? 'Saving...' : '💾 Save Advice'}
                </button>
              </div>
            </div>
          )}

          {tab === 'refer' && (
            <div className="dd-advice-panel">
              <h3>🔄 Refer this Case</h3>
              <p className="dd-advice-subtitle">
                Send this patient's medical history and case details to another doctor in the network.
              </p>
              <div style={{ marginTop: '20px' }}>
                <button className="doc-btn-primary" onClick={() => setIsReferralOpen(true)}>
                  Search & Refer Doctor
                </button>
              </div>

              {isReferralOpen && (
                <ReferralModal 
                  patientId={appointment.patientFk!}
                  patientName={appointment.patientName}
                  currentDoctorId={doctorId}
                  appointmentId={appointment.id}
                  onClose={() => setIsReferralOpen(false)}
                />
              )}
            </div>
          )}

          {tab === 'finalize' && (
            <div className="dd-advice-panel">
              <h3>✅ Finalize Appointment</h3>
              <p className="dd-advice-subtitle">
                Mark this appointment as completed and optionally schedule a follow-up.
              </p>

              <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                <div style={{ flex: 1, padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                  <h4>Complete Only</h4>
                  <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                    Mark this appointment as complete. No follow-up needed.
                  </p>
                  <button className="doc-btn-primary" onClick={handleCompleteAppointment} disabled={finalizing} style={{ width: '100%', background: '#4caf50' }}>
                    {finalizing ? 'Processing...' : 'Complete Appointment'}
                  </button>
                </div>

                <div style={{ flex: 1, padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                  <h4>Complete & Request Follow-up</h4>
                  <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                    Request a follow-up for this patient.
                  </p>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Follow-up Date (Optional)</label>
                    <input 
                      type="date" 
                      min={new Date().toISOString().split('T')[0]}
                      value={followUpDate} 
                      onChange={e => setFollowUpDate(e.target.value)}
                      className="dd-advice-textarea" 
                      style={{ minHeight: '40px', padding: '8px' }}
                    />
                    <p style={{ fontSize: '12px', color: '#999', marginTop: '6px' }}>
                      If left blank, the patient can choose a date from their portal.
                    </p>
                  </div>

                  <button className="doc-btn-primary" onClick={handleScheduleFollowup} disabled={finalizing} style={{ width: '100%' }}>
                    {finalizing ? 'Processing...' : (followUpDate ? 'Book Follow-up' : 'Request Follow-up')}
                  </button>
                </div>
              </div>

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
  }, [doctorId, selectedDate]);

  if (selectedApt) {
    return <DoctorAptDetail appointment={selectedApt} doctorId={doctorId} onBack={() => setSelectedApt(null)} />;
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
              <span className={`dd-apt-status ${apt.status}`}>{apt.status}</span>
              <span className="dd-apt-arrow">›</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Sub-component: Doctor Referrals Tab ────────────────────────────────────

interface ReferralItem {
  id: number;
  patientId: number;
  patientName: string;
  patientAge: number;
  patientGender: string;
  patientBloodGroup: string;
  patientLocation: string;
  referredByDoctorId: number;
  referredByDoctorName: string;
  referredByHospital: string;
  referredByDepartment: string;
  notes: string;
  createdAt: string;
  appointmentId?: number;
  appointmentDate?: string;
}

interface DoctorReferralsTabProps {
  doctorId: number;
}

const DoctorReferralsTab: React.FC<DoctorReferralsTabProps> = ({ doctorId }) => {
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReferral, setSelectedReferral] = useState<ReferralItem | null>(null);
  const [openedApt, setOpenedApt] = useState<any>(null); // For DoctorAptDetail
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/doctor-portal/referrals?doctorId=${doctorId}`)
      .then(r => r.json())
      .then(setReferrals)
      .catch(() => setReferrals([]))
      .finally(() => setLoading(false));
  }, [doctorId]);

  const handleOpenAppointment = (appointmentId: number) => {
    fetch(`${API_BASE}/api/doctor-portal/appointments/${appointmentId}`)
      .then(r => r.ok ? r.json() : null)
      .then(apt => {
        if (apt) setOpenedApt(apt);
      })
      .catch(e => console.error(e));
  };

  if (openedApt) {
    return <DoctorAptDetail appointment={openedApt} doctorId={doctorId} onBack={() => setOpenedApt(null)} />;
  }

  const handleCompleteAnalysis = async (referralId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/doctor-portal/referrals/${referralId}/complete-analysis`, {
        method: 'POST'
      });
      if (res.ok) {
        setReferrals(prev => prev.map(r => r.id === referralId ? { ...r, referralStatus: 'analysed' } : r));
        setSelectedReferral(prev => prev && prev.id === referralId ? { ...prev, referralStatus: 'analysed' } : prev);
      }
    } catch (e) {
      console.error('Failed to complete analysis', e);
    }
  };

  if (selectedReferral) {
    const isSingleCase = selectedReferral.appointmentId != null;
    return (
      <PatientProfileView 
        patientId={selectedReferral.patientId} 
        doctorId={doctorId} 
        onClose={() => setSelectedReferral(null)}
        restrictedAppointmentId={isSingleCase ? selectedReferral.appointmentId : null}
        onOpenAppointment={handleOpenAppointment}
        referralId={selectedReferral.id}
        referralStatus={(selectedReferral as any).referralStatus}
        onAnalysisComplete={handleCompleteAnalysis}
      />
    );
  }

  return (
    <div className="dd-patient-dir">
      <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>🔄 Referred Cases</h3>

      {loading && <div className="dd-loading">⏳ Loading referrals...</div>}

      {!loading && referrals.length === 0 && (
        <div className="dd-empty-state">
          <div className="dd-empty-icon">📋</div>
          <h3>No referrals yet</h3>
          <p>When another doctor refers a patient to you, it will appear here.</p>
        </div>
      )}

      <div className="dd-patient-grid">
        {referrals.map(ref => (
          <div
            key={ref.id}
            className="dd-patient-card"
            style={{ cursor: 'pointer' }}
            onClick={() => setSelectedReferral(ref)}
          >
            <div className="dd-patient-avatar">{ref.patientName?.charAt(0).toUpperCase() || '?'}</div>
            <div className="dd-patient-info">
              <div className="dd-patient-name">{ref.patientName}</div>
              <div className="dd-patient-meta">
                {ref.patientAge && <span>{ref.patientAge}y</span>}
                {ref.patientGender && <span>· {ref.patientGender}</span>}
                {ref.patientBloodGroup && <span className="dd-blood-group">🩸 {ref.patientBloodGroup}</span>}
              </div>
              {ref.patientLocation && (
                <div className="dd-patient-mobile">📍 {ref.patientLocation}</div>
              )}
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                <strong>Referred by:</strong> {ref.referredByDoctorName}
              </div>
              <div style={{ fontSize: '11px', color: '#888' }}>
                {ref.referredByDepartment}{ref.referredByHospital ? `, ${ref.referredByHospital}` : ''}
              </div>
              {ref.notes && (
                <div style={{ fontSize: '11px', color: '#555', marginTop: '4px', fontStyle: 'italic', borderLeft: '2px solid var(--color-primary, #00766c)', paddingLeft: '6px' }}>
                  "{ref.notes}"
                </div>
              )}
              {ref.createdAt && (
                <div style={{ fontSize: '10px', color: '#aaa', marginTop: '4px' }}>
                  Referred on: {new Date(ref.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              )}
            </div>
          </div>
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
          {activeTab === 'referrals' && <DoctorReferralsTab doctorId={Number(activeDoctorId)} />}
        </div>
      </div>
    </div>
  );
};
