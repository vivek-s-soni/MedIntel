import React, { useState, useEffect } from 'react';
import { adminAPI, doctorAPI, appointmentAPI, authAPI } from '../api';
import { 
  Users, CheckSquare, Calendar, DollarSign, ShieldAlert, Trash, Check, X,
  Plus, Edit3
} from 'lucide-react';
import Toast from '../components/Toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie } from 'recharts';

export const AdminDashboard = ({ tab }) => {
  const [toast, setToast] = useState(null);

  // Data States
  const [users, setUsers] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);

  // Search & Filter state for appointments
  const [filterDoc, setFilterDoc] = useState('');
  const [filterPat, setFilterPat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Doctor CRUD Modal state
  const [doctorModal, setDoctorModal] = useState(false);
  const [selectedDocProfile, setSelectedDocProfile] = useState(null);
  const [docUsername, setDocUsername] = useState('');
  const [docEmail, setDocEmail] = useState('');
  const [docPassword, setDocPassword] = useState('');
  const [docSpecialization, setDocSpecialization] = useState('General Medicine');
  const [docLocation, setDocLocation] = useState('Mumbai');
  const [docExperience, setDocExperience] = useState('');
  const [docQualification, setDocQualification] = useState('MBBS');
  const [docContact, setDocContact] = useState('');
  const [docAddress, setDocAddress] = useState('');
  const [docMaps, setDocMaps] = useState('');

  // Patient CRUD Modal state
  const [patientModal, _setPatientModal] = useState(false);
  const [_selectedPatProfile, _setSelectedPatProfile] = useState(null);
  const [patDOB, _setPatDOB] = useState('');
  const [patGender, _setPatGender] = useState('Male');
  const [patBloodGroup, _setPatBloodGroup] = useState('O+');
  const [patEmergencyContact, _setPatEmergencyContact] = useState('');


  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    loadAllData();
  }, [tab]);

  const loadAllData = async () => {
    try {
      const uRes = await adminAPI.getUsers();
      setUsers(uRes.data);

      const dRes = await doctorAPI.getAllDoctors();
      setDoctors(dRes.data);

      const aRes = await appointmentAPI.getAppointments();
      setAppointments(aRes.data);

      const pRes = await adminAPI.getUsers(); // Get patients lists via user filtering
      setPatients(pRes.data.filter(u => u.role === 'Patient'));
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    }
  };

  // Add/Edit Doctor submit
  const handleDoctorSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedDocProfile) {
        // Edit doctor profile
        await doctorAPI.updateProfile(selectedDocProfile.id, {
          specialization: docSpecialization,
          location: docLocation,
          experience: parseInt(docExperience) || 0,
          qualification: docQualification,
          contact_number: docContact,
          clinic_address: docAddress,
          google_maps_link: docMaps
        });
        showToast('Doctor credentials edited successfully!', 'success');
      } else {
        // Add doctor (register custom endpoint calls register)
        await authAPI.register({
          username: docUsername,
          email: docEmail,
          password: docPassword,
          role: 'Doctor',
          specialization: docSpecialization,
          location: docLocation,
          experience: parseInt(docExperience) || 0,
          qualification: docQualification,
          contact_number: docContact,
          clinic_address: docAddress,
          google_maps_link: docMaps
        });
        showToast('Doctor profile created successfully! Please verify their email.', 'success');
      }
      setDoctorModal(false);
      resetDoctorForm();
      loadAllData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save doctor details', 'error');
    }
  };

  // Edit Patient submit
  const handlePatientSubmit = async (e) => {
    e.preventDefault();
    try {
      // Find patient profile first
      const patsRes = await doctorAPI.getAllDoctors(); // Helper query patient
      // Actually edit patient profile using Admin endpoint mapping in node
      // Retrieve patient profile ID
      const userPatientProfile = selectedPatProfile.profile || {};
      const patProfileId = userPatientProfile.id;
      
      if (patProfileId) {
        await adminAPI.updateUser(selectedPatProfile.id, {
          patient_profile: {
            date_of_birth: patDOB || null,
            gender: patGender,
            blood_group: patBloodGroup,
            emergency_contact: patEmergencyContact
          }
        });
        showToast('Patient profile fields saved!', 'success');
      }
      setPatientModal(false);
      loadAllData();
    } catch (err) {
      showToast('Failed to save patient profile', 'error');
    }
  };

  const resetDoctorForm = () => {
    setSelectedDocProfile(null);
    setDocUsername('');
    setDocEmail('');
    setDocPassword('');
    setDocSpecialization('General Medicine');
    setDocLocation('Mumbai');
    setDocExperience('');
    setDocQualification('MBBS');
    setDocContact('');
    setDocAddress('');
    setDocMaps('');
  };

  // Verify/Deactivate Doctor Profile
  const handleToggleVerifyDoctor = async (docProfileId, isVerified) => {
    try {
      await doctorAPI.updateProfile(docProfileId, { is_verified: !isVerified });
      showToast(`Doctor verification status updated successfully!`, 'success');
      loadAllData();
    } catch (err) {
      showToast('Failed to update doctor verification status', 'error');
    }
  };

  // Suspend/Un-suspend (toggle is_verified on User model)
  const handleToggleSuspendUser = async (userId, isVerified) => {
    try {
      await adminAPI.updateUser(userId, { is_verified: !isVerified });
      showToast(`User status updated successfully!`, 'success');
      loadAllData();
    } catch (err) {
      showToast('Failed to update user status', 'error');
    }
  };

  // Delete User
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this account permanently?')) return;
    try {
      await adminAPI.deleteUser(userId);
      showToast('Account deleted successfully', 'warning');
      loadAllData();
    } catch (err) {
      showToast('Failed to delete user account', 'error');
    }
  };

  // Filtering appointments list
  const filteredAppointments = appointments.filter(a => {
    const matchesDoc = filterDoc ? a.doctor_name.toLowerCase().includes(filterDoc.toLowerCase()) : true;
    const matchesPat = filterPat ? a.patient_name.toLowerCase().includes(filterPat.toLowerCase()) : true;
    const matchesStatus = filterStatus ? a.status === filterStatus : true;
    return matchesDoc && matchesPat && matchesStatus;
  });

  // Recharts Charts Generators
  const totalPaidRevenue = appointments.filter(a => a.payment_status === 'Paid').length * 250;

  // Pie chart distro
  const userDistro = [
    { name: 'Patients', value: users.filter(u => u.role === 'Patient').length },
    { name: 'Doctors', value: users.filter(u => u.role === 'Doctor').length },
    { name: 'Admins', value: users.filter(u => u.role === 'Admin').length }
  ];
  const COLORS = ['#0ea5e9', '#6366f1', '#f59e0b'];

  // Bar charts distro
  const monthlyAppointmentsDistro = [
    { name: 'Jan', appointments: 12 },
    { name: 'Feb', appointments: 19 },
    { name: 'Mar', appointments: 25 },
    { name: 'Apr', appointments: 15 },
    { name: 'May', appointments: 32 },
    { name: 'Jun', appointments: 40 },
    { name: 'Jul', appointments: 36 },
    { name: 'Aug', appointments: appointments.length }
  ];

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-6 overflow-y-auto max-h-screen">
      
      {/* ----------------- PAGE HEADER ----------------- */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200/50 dark:border-slate-800/50">
        <div>
          <h2 className="text-xl font-bold text-slate-850 dark:text-slate-100 uppercase tracking-wide">
            {tab === 'overview' ? 'Welcome, Administrator!' : `Admin Console - ${tab}`}
          </h2>
          <p className="text-slate-400 dark:text-slate-500 text-xs">System Administration Dashboard</p>
        </div>
      </div>

      {/* ----------------- OVERVIEW TAB ----------------- */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl flex items-center justify-between shadow-sm backdrop-blur-md">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase">Total Patients</span>
                <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-slate-100">
                  {users.filter(u => u.role === 'Patient').length}
                </h3>
              </div>
              <div className="p-3 rounded-2xl bg-sky-100 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl flex items-center justify-between shadow-sm backdrop-blur-md">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase">Total Doctors</span>
                <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-slate-100">
                  {users.filter(u => u.role === 'Doctor').length}
                </h3>
              </div>
              <div className="p-3 rounded-2xl bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl flex items-center justify-between shadow-sm backdrop-blur-md">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase">System Appointments</span>
                <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-slate-100">{appointments.length}</h3>
              </div>
              <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                <Calendar className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl flex items-center justify-between shadow-sm backdrop-blur-md">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase">gross revenue</span>
                <h3 className="text-2xl font-bold mt-1 text-emerald-500">₹{totalPaidRevenue}</h3>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Graphical Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl shadow-sm lg:col-span-2 space-y-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-indigo-500" /> Monthly Appointments Trend
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyAppointmentsDistro}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Bar dataKey="appointments" fill="#6366f1" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-500" /> Platform Users Distro
              </h3>
              <div className="h-64 flex justify-center items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={userDistro}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label
                    >
                      {userDistro.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- DOCTOR CRUD PORTAL ----------------- */}
      {tab === 'doctors' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-4 rounded-3xl shadow-sm">
            <h3 className="text-lg font-bold text-slate-850 dark:text-slate-100">Certified Doctors Directory</h3>
            <button
              onClick={() => {
                resetDoctorForm();
                setDoctorModal(true);
              }}
              className="py-2.5 px-5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl text-xs font-bold uppercase flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Doctor
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="p-4">Doctor Name</th>
                  <th className="p-4">Specialization</th>
                  <th className="p-4">City Location</th>
                  <th className="p-4">Credentials</th>
                  <th className="p-4">Status Toggle</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {doctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                    <td className="p-4 font-bold text-slate-800 dark:text-slate-200">Dr. {doc.username || doc.user_name}</td>
                    <td className="p-4 text-slate-500">{doc.specialization}</td>
                    <td className="p-4 text-slate-500">{doc.location}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        doc.is_verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {doc.is_verified ? 'Verified Practitioner' : 'Under Review'}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleVerifyDoctor(doc.id, doc.is_verified)}
                        className={`py-1 px-3 text-xs font-bold rounded-xl uppercase transition-colors ${
                          doc.is_verified 
                            ? 'border border-red-200 text-red-600 hover:bg-red-50' 
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {doc.is_verified ? 'Deactivate' : 'Verify'}
                      </button>
                    </td>
                    <td className="p-4 flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedDocProfile(doc);
                          setDocSpecialization(doc.specialization);
                          setDocLocation(doc.location);
                          setDocExperience(doc.experience);
                          setDocQualification(doc.qualification);
                          setDocContact(doc.contact_number);
                          setDocAddress(doc.clinic_address);
                          setDocMaps(doc.google_maps_link);
                          setDoctorModal(true);
                        }}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-xl"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(doc.user)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-xl"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------- PATIENT MANAGEMENT PORTAL ----------------- */}
      {tab === 'users' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="p-4">Patient Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Account status</th>
                <th className="p-4">Suspension toggle</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {patients.map((pat) => (
                <tr key={pat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                  <td className="p-4 font-bold text-slate-850 dark:text-slate-200">{pat.username}</td>
                  <td className="p-4 text-slate-500">{pat.email}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      pat.is_verified ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {pat.is_verified ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleToggleSuspendUser(pat.id, pat.is_verified)}
                      className={`py-1 px-3 text-xs font-bold rounded-xl uppercase transition-colors ${
                        pat.is_verified 
                          ? 'border border-red-200 text-red-650 hover:bg-red-50' 
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {pat.is_verified ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleDeleteUser(pat.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-xl"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ----------------- APPOINTMENTS PORTAL ----------------- */}
      {tab === 'appointments' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-4 rounded-3xl shadow-sm flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Filter by Doctor..."
              value={filterDoc}
              onChange={(e) => setFilterDoc(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none"
            />
            <input
              type="text"
              placeholder="Filter by Patient..."
              value={filterPat}
              onChange={(e) => setFilterPat(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent dark:bg-slate-900 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="p-4">Patient</th>
                  <th className="p-4">Doctor</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Time Slot</th>
                  <th className="p-4">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filteredAppointments.map((appt) => (
                  <tr key={appt.id}>
                    <td className="p-4 font-bold text-slate-850 dark:text-slate-250">{appt.patient_name}</td>
                    <td className="p-4 text-slate-700 dark:text-slate-300">Dr. {appt.doctor_name}</td>
                    <td className="p-4 text-slate-500">{appt.date}</td>
                    <td className="p-4 text-slate-500">{appt.time_slot.substring(0, 5)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        appt.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                        appt.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                        appt.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {appt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------- DOCTOR ADD/EDIT MODAL ----------------- */}
      {doctorModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {selectedDocProfile ? 'Edit Doctor Profile' : 'Add New Doctor Registry'}
              </h3>
              <p className="text-xs text-slate-450">Certified practitioner details</p>
            </div>

            <form onSubmit={handleDoctorSubmit} className="space-y-4">
              {!selectedDocProfile && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-450 mb-1">Doctor Name</label>
                    <input type="text" required value={docUsername} onChange={(e) => setDocUsername(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-455 mb-1">Email</label>
                    <input type="email" required value={docEmail} onChange={(e) => setDocEmail(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-450 mb-1">Password</label>
                    <input type="password" required value={docPassword} onChange={(e) => setDocPassword(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-450 mb-1">Specialization</label>
                  <input type="text" required value={docSpecialization} onChange={(e) => setDocSpecialization(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-450 mb-1">City Location</label>
                  <input type="text" required value={docLocation} onChange={(e) => setDocLocation(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-450 mb-1">Experience (Years)</label>
                  <input type="number" required value={docExperience} onChange={(e) => setDocExperience(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-450 mb-1">Qualification</label>
                  <input type="text" required value={docQualification} onChange={(e) => setDocQualification(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-450 mb-1">Contact Number</label>
                  <input type="text" required value={docContact} onChange={(e) => setDocContact(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-450 mb-1">Clinic Address</label>
                  <textarea rows={2} required value={docAddress} onChange={(e) => setDocAddress(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none resize-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-450 mb-1">Google Maps Link</label>
                  <input type="url" value={docMaps} onChange={(e) => setDocMaps(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none" />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setDoctorModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-2xl text-xs font-bold uppercase hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-705 text-white rounded-2xl text-xs font-bold uppercase"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
export default AdminDashboard;
