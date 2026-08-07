import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { patientAPI, doctorAPI } from '../api';
import { User, Mail, Shield, Check, Save } from 'lucide-react';
import Toast from '../components/Toast';

const Profile = () => {
  const { user, updateUserProfile } = useAuth();
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  // Patient Fields
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [historySummary, setHistorySummary] = useState('');

  // Doctor Fields
  const [specialization, setSpecialization] = useState('');
  const [location, setLocation] = useState('');
  const [experience, setExperience] = useState('');
  const [qualification, setQualification] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [mapsLink, setMapsLink] = useState('');

  useEffect(() => {
    if (user) {
      if (user.role === 'Patient' && user.profile) {
        setDob(user.profile.date_of_birth || '');
        setGender(user.profile.gender || 'Male');
        setBloodGroup(user.profile.blood_group || 'O+');
        setEmergencyContact(user.profile.emergency_contact || '');
        setHistorySummary(user.profile.medical_history_summary || '');
      } else if (user.role === 'Doctor' && user.profile) {
        setSpecialization(user.profile.specialization || '');
        setLocation(user.profile.location || '');
        setExperience(user.profile.experience || '');
        setQualification(user.profile.qualification || '');
        setClinicAddress(user.profile.clinic_address || '');
        setContactNumber(user.profile.contact_number || '');
        setMapsLink(user.profile.google_maps_link || '');
      }
    }
  }, [user]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (user.role === 'Patient') {
        const res = await patientAPI.updateProfile(user.profile.id, {
          date_of_birth: dob || null,
          gender,
          blood_group: bloodGroup,
          emergency_contact: emergencyContact,
          medical_history_summary: historySummary
        });
        updateUserProfile(res.data);
        showToast('Patient profile updated successfully!', 'success');
      } else if (user.role === 'Doctor') {
        const res = await doctorAPI.updateProfile(user.profile.id, {
          specialization,
          location,
          experience: parseInt(experience) || 0,
          qualification,
          clinic_address: clinicAddress,
          contact_number: contactNumber,
          google_maps_link: mapsLink
        });
        updateUserProfile(res.data);
        showToast('Doctor profile updated successfully!', 'success');
      }
    } catch (err) {
      showToast('Failed to update profile info', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-6 overflow-y-auto max-h-screen">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              Manage Profile
            </h2>
            <p className="text-slate-400 dark:text-slate-500 text-xs">Update your credentials and clinical details</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
            <div className="flex items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-800 mb-6">
              <div className="w-16 h-16 rounded-3xl bg-primary-100 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-2xl uppercase">
                {user.username.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-850 dark:text-slate-200 flex items-center gap-1.5">
                  {user.username}
                  <span className="px-2 py-0.5 bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 text-[10px] rounded-full uppercase font-bold">
                    {user.role}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Patient Fields */}
              {user.role === 'Patient' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Date of Birth</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent dark:bg-slate-900 focus:outline-none"
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Blood Group</label>
                    <input
                      type="text"
                      placeholder="e.g. O+"
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Emergency Contact</label>
                    <input
                      type="text"
                      placeholder="+1 555-0199"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Medical History Summary</label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Hypertension diagnosed in 2021, allergic to penicillin."
                      value={historySummary}
                      onChange={(e) => setHistorySummary(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Doctor Fields */}
              {user.role === 'Doctor' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Specialization</label>
                    <input
                      type="text"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Location</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Experience (Years)</label>
                    <input
                      type="number"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Qualification</label>
                    <input
                      type="text"
                      value={qualification}
                      onChange={(e) => setQualification(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Contact Number</label>
                    <input
                      type="text"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Google Maps link</label>
                    <input
                      type="url"
                      placeholder="https://maps.google.com/..."
                      value={mapsLink}
                      onChange={(e) => setMapsLink(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Clinic Address</label>
                    <textarea
                      rows={2}
                      value={clinicAddress}
                      onChange={(e) => setClinicAddress(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none resize-none"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="py-3 px-6 bg-gradient-to-r from-primary-600 to-indigo-600 text-white font-bold text-xs uppercase rounded-xl flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" /> Save Profile Details
              </button>
            </form>
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Profile;
