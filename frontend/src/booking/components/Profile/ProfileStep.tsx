import React, { useState, useEffect } from 'react';
import './ProfileStep.css';
import { bookingApi } from '../../api/bookingApi';
import type { PatientProfile } from '../../types/booking.types';

interface ProfileStepProps {
  onSelect: (profileId: number) => void;
  onViewAppointments: () => void;
}

export const ProfileStep: React.FC<ProfileStepProps> = ({ onSelect, onViewAppointments }) => {
  const [profiles, setProfiles] = useState<PatientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [bloodGroup, setBloodGroup] = useState('');
  const [mobile, setMobile] = useState('');
  const [relation, setRelation] = useState('self');

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const data = await bookingApi.getProfiles();
      setProfiles(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newProfile = await bookingApi.createProfile({
        fullName,
        age: parseInt(age, 10),
        gender,
        bloodGroup,
        mobile,
        relation
      });
      setProfiles([newProfile, ...profiles]);
      setShowForm(false);
      resetForm();
    } catch (e) {
      alert('Failed to create profile');
    }
  };

  const resetForm = () => {
    setFullName('');
    setAge('');
    setGender('male');
    setBloodGroup('');
    setMobile('');
    setRelation('self');
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!window.confirm('Delete this profile?')) return;
    try {
      await bookingApi.deleteProfile(id);
      setProfiles(profiles.filter(p => p.id !== id));
    } catch (e) {
      alert('Failed to delete');
    }
  };

  return (
    <div className="profile-step">
      <div className="profile-left">
        <div className="info-card">
          <h2>Secure Health Profiles</h2>
          <p>
            Manage profiles for yourself and your family members. All data is securely encrypted and stored centrally in MedRoute. 
          </p>
          <ul className="benefits-list">
            <li>✅ One-click booking access</li>
            <li>✅ Zero local storage tracking</li>
            <li>✅ Centralized medical history</li>
          </ul>
        </div>

        <div className="left-follow-up-card">
          <div className="left-follow-up-icon">📋</div>
          <h3>Follow-up / Previous</h3>
          <p>View your past or upcoming<br/>appointments.</p>
          <button className="view-appointments-btn" onClick={onViewAppointments}>
            View Appointments →
          </button>
        </div>
      </div>

      <div className="profile-right">
        <div className="right-header">
          <h2>Select Patient</h2>
          <button className="new-profile-btn" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ New Profile'}
          </button>
        </div>

        {showForm ? (
          <form className="profile-form" onSubmit={handleCreate}>
            <div className="form-grid">
              <label>
                Full Name *
                <input required type="text" value={fullName} onChange={e => setFullName(e.target.value)} />
              </label>
              <label>
                Age *
                <input required type="number" min="1" max="120" value={age} onChange={e => setAge(e.target.value)} />
              </label>
              <label>
                Gender *
                <select value={gender} onChange={e => setGender(e.target.value)}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                Relation *
                <select value={relation} onChange={e => setRelation(e.target.value)}>
                  <option value="self">Self</option>
                  <option value="spouse">Spouse</option>
                  <option value="child">Child</option>
                  <option value="parent">Parent</option>
                  <option value="sibling">Sibling</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                Mobile *
                <input required type="text" pattern="[0-9]{10}" placeholder="10 digits" value={mobile} onChange={e => setMobile(e.target.value)} />
              </label>
              <label>
                Blood Group
                <input type="text" placeholder="e.g. O+" value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} />
              </label>
            </div>
            <button type="submit" className="submit-btn">Save & Continue</button>
          </form>
        ) : (
          <div className="profiles-list">
            {loading ? (
              <p>Loading profiles...</p>
            ) : profiles.length === 0 ? (
              <div className="empty-state">
                No profiles found. Create one to get started.
              </div>
            ) : (
              <>
                {profiles.map(p => (
                  <div key={p.id} className="profile-card" onClick={() => onSelect(p.id)}>
                    <div className="profile-avatar">
                      {p.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="profile-details">
                      <h3>{p.fullName}</h3>
                      <span className="profile-meta">{p.age} yrs • {p.gender} • {p.relation}</span>
                    </div>
                    <button className="delete-btn" onClick={(e) => handleDelete(e, p.id)}>🗑️</button>
                  </div>
                ))}
                

              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
