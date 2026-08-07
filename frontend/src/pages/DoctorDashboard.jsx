import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { appointmentAPI, prescriptionAPI, patientAPI, doctorAPI, medicationAPI, notificationAPI, healthMetricAPI, chatAPI } from '../api';
import { 
  Calendar, Check, X, FileText, Plus, Trash, Clock, 
  Clipboard, ClipboardList, AlertTriangle, Activity,
  MessageSquare, TrendingUp, Send, Paperclip, User, RefreshCw
} from 'lucide-react';
import Toast from '../components/Toast';

export const DoctorDashboard = ({ tab }) => {
  const { user, updateUserProfile } = useAuth();
  const [toast, setToast] = useState(null);

  // Data States
  const [appointments, setAppointments] = useState([]);
  const [_patients, setPatients] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedPatientHistory, setSelectedPatientHistory] = useState([]);


  // Availability / Working Hours
  const [startTime, setStartTime] = useState(user?.profile?.working_hours_start || '09:00');
  const [endTime, setEndTime] = useState(user?.profile?.working_hours_end || '17:00');
  
  // Leaves List
  const [leavesList, setLeavesList] = useState(user?.profile?.leaves || []);
  const [newLeaveDate, setNewLeaveDate] = useState('');

  // Prescription builder state
  const [activePrescAppt, setActivePrescAppt] = useState(null);
  const [tabPrescApptId, setTabPrescApptId] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [medicines, setMedicines] = useState([
    { name: '', strength: '500mg', dosage: '1 tablet', frequency: 'Once Daily', duration: '7 Days', instructions: '', meal_timing: 'After Food' }
  ]);

  // Follow-up appointment state
  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('10:00');
  const [followUpNote, setFollowUpNote] = useState('');

  // Doctor Chat & Clinical Alerts States
  const [alerts, setAlerts] = useState([]);
  const [patientMetrics, setPatientMetrics] = useState([]);
  const [selectedPatientTimeframe, setSelectedPatientTimeframe] = useState('weekly');
  const [chatPartner, setChatPartner] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInputText, setChatInputText] = useState('');
  const [chatAttachmentUrl, setChatAttachmentUrl] = useState('');
  const [isUploadingChatFile, setIsUploadingChatFile] = useState(false);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    loadAllData();
  }, [tab]);

  const renderSVGChart = (title, dataKey, colorClass, minVal, maxVal) => {
    if (patientMetrics.length === 0) {
      return (
        <div className="h-24 flex items-center justify-center text-[10px] text-slate-400 italic bg-slate-50/20 dark:bg-slate-950/10 border border-slate-100 dark:border-slate-800 rounded-xl">
          No metrics trends logged yet.
        </div>
      );
    }
    
    const sorted = [...patientMetrics].sort((a, b) => a.date.localeCompare(b.date));
    const padding = 12;
    const chartHeight = 60;
    const chartWidth = 260;
    
    let vals = sorted.map(d => d[dataKey] || minVal);
    let min = Math.min(...vals) - 3;
    let max = Math.max(...vals) + 3;
    if (min < 0) min = 0;
    const range = max - min || 1;
    
    const points = sorted.map((d, index) => {
      const val = d[dataKey] || minVal;
      const x = padding + (index * (chartWidth - (padding * 2))) / (sorted.length - 1 || 1);
      const y = padding + chartHeight - ((val - min) * (chartHeight - (padding * 2))) / range;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="space-y-1">
        <div className="flex justify-between items-center text-[9px] text-slate-450 font-bold px-1 uppercase tracking-wider">
          <span>Min: {Math.round(min + 3)}</span>
          <span className="text-slate-500">{title}</span>
          <span>Max: {Math.round(max - 3)}</span>
        </div>
        <div className="relative p-2 bg-slate-50/30 dark:bg-slate-955/10 border border-slate-150/40 dark:border-slate-800 rounded-2xl">
          <svg className="w-full h-16 overflow-visible" viewBox="0 0 300 100">
            <line x1="10" y1="15" x2="290" y2="15" stroke="currentColor" className="text-slate-100 dark:text-slate-800/40" strokeWidth="1" strokeDasharray="3" />
            <line x1="10" y1="50" x2="290" y2="50" stroke="currentColor" className="text-slate-100 dark:text-slate-800/40" strokeWidth="1" strokeDasharray="3" />
            <line x1="10" y1="85" x2="290" y2="85" stroke="currentColor" className="text-slate-100 dark:text-slate-800/40" strokeWidth="1" strokeDasharray="3" />
            
            <polyline
              fill="none"
              stroke="currentColor"
              className={colorClass}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
            
            {sorted.map((d, index) => {
              const val = d[dataKey] || minVal;
              const x = padding + (index * (chartWidth - (padding * 2))) / (sorted.length - 1 || 1);
              const y = padding + chartHeight - ((val - min) * (chartHeight - (padding * 2))) / range;
              return (
                <g key={index} className="group">
                  <circle
                    cx={x}
                    cy={y}
                    r="4"
                    fill="currentColor"
                    className={`${colorClass} hover:r-6 cursor-pointer transition-all`}
                  />
                  <title>{`${d.date}: ${val}`}</title>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  const loadAllData = async () => {
    try {
      const appts = await appointmentAPI.getAppointments();
      setAppointments(apptSort(appts.data));

      const pats = await patientAPI.getPatients();
      setPatients(pats.data);

      const prescs = await prescriptionAPI.getPrescriptions();
      setPrescriptions(prescs.data);

      const notifs = await notificationAPI.getNotifications();
      setAlerts(notifs.data.filter(n => n.type === 'clinical_alert'));
    } catch (err) {
      console.error('Failed to load doctor dashboard data:', err);
    }
  };

  // Chat messaging functions
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInputText.trim() && !chatAttachmentUrl) return;
    try {
      await chatAPI.sendMessage(chatPartner.user, chatInputText.trim(), chatAttachmentUrl);
      setChatInputText('');
      setChatAttachmentUrl('');
      const res = await chatAPI.getMessages(chatPartner.user);
      setChatMessages(res.data);
    } catch (err) {
      showToast('Failed to send message', 'error');
    }
  };

  const handleChatFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setIsUploadingChatFile(true);
    try {
      const res = await chatAPI.uploadAttachment(formData);
      setChatAttachmentUrl(res.data.url);
      showToast('Image attached successfully!', 'success');
    } catch (err) {
      showToast('Failed to upload image', 'error');
    } finally {
      setIsUploadingChatFile(false);
    }
  };

  // Real-time chat polling
  useEffect(() => {
    let interval;
    if (tab === 'chat' && chatPartner) {
      const fetchChat = () => {
        chatAPI.getMessages(chatPartner.user).then(res => {
          setChatMessages(res.data);
        }).catch(err => console.error(err));
      };
      fetchChat();
      interval = setInterval(fetchChat, 4000);
    }
    return () => clearInterval(interval);
  }, [tab, chatPartner]);

  // Mark read
  useEffect(() => {
    if (tab === 'chat' && chatPartner && chatMessages.length > 0) {
      chatAPI.markRead(chatPartner.user).catch(err => console.error(err));
    }
  }, [tab, chatPartner, chatMessages.length]);

  const [selectedPatientMeds, setSelectedPatientMeds] = useState([]);
  const [selectedPatientAdherence, setSelectedPatientAdherence] = useState(null);

  useEffect(() => {
    const selectedAppt = activePrescAppt || appointments.find(a => String(a.id) === String(tabPrescApptId));
    if (selectedAppt) {
      const patientId = selectedAppt.patient;
      const patientApptIds = appointments.filter(a => String(a.patient) === String(patientId)).map(a => a.id);
      const patientPrescs = prescriptions.filter(p => patientApptIds.includes(p.appointment) || p.patient_name === selectedAppt.patient_name);
      setSelectedPatientHistory(patientPrescs);
      
      medicationAPI.getMedicines({ patient: patientId }).then(res => {
        setSelectedPatientMeds(res.data);
      }).catch(() => setSelectedPatientMeds([]));

      medicationAPI.getAdherence(patientId).then(res => {
        setSelectedPatientAdherence(res.data);
      }).catch(() => setSelectedPatientAdherence(null));

      healthMetricAPI.getMetrics(patientId).then(res => {
        setPatientMetrics(res.data);
      }).catch(() => setPatientMetrics([]));
    } else {
      setSelectedPatientHistory([]);
      setSelectedPatientMeds([]);
      setSelectedPatientAdherence(null);
      setPatientMetrics([]);
    }
  }, [tabPrescApptId, activePrescAppt, prescriptions, appointments]);





  const apptSort = (data) => {
    return data.sort((a, b) => new Date(`${a.date}T${a.time_slot}`) - new Date(`${b.date}T${b.time_slot}`));
  };

  // Approve / Reject / Complete Appointments
  const handleUpdateStatus = async (id, status, extra = {}) => {
    const appt = appointments.find(a => a.id === id);
    if (status === 'Completed') {
      // Validate date & time
      const now = new Date();
      const apptDateTime = new Date(`${appt.date}T${appt.time_slot}`);
      if (now < apptDateTime) {
        showToast('You cannot complete an appointment before its scheduled date and time.', 'warning');
        return;
      }
    }

    try {
      await appointmentAPI.updateAppointment(id, { status, ...extra });
      showToast(`Appointment marked as ${status}!`, 'success');
      loadAllData();
    } catch (err) {
      showToast('Status update failed', 'error');
    }
  };

  // Availability submit
  const handleSaveAvailability = async (e) => {
    e.preventDefault();
    try {
      const res = await doctorAPI.updateProfile(user.profile.id, {
        working_hours_start: startTime.includes(':') && startTime.split(':').length === 2 ? startTime + ':00' : startTime,
        working_hours_end: endTime.includes(':') && endTime.split(':').length === 2 ? endTime + ':00' : endTime,
        leaves: leavesList
      });
      updateUserProfile(res.data);
      showToast('Working schedule details saved!', 'success');
    } catch (err) {
      showToast('Failed to update working hours', 'error');
    }
  };

  // Add Leave Date
  const handleAddLeave = () => {
    if (!newLeaveDate) return;
    if (leavesList.includes(newLeaveDate)) {
      showToast('Date already added to leaves list', 'warning');
      return;
    }
    const updatedLeaves = [...leavesList, newLeaveDate];
    setLeavesList(updatedLeaves);
    setNewLeaveDate('');
    showToast('Leave date added! Save to confirm schedule.');
  };

  // Remove Leave Date
  const handleRemoveLeave = (date) => {
    const updatedLeaves = leavesList.filter(d => d !== date);
    setLeavesList(updatedLeaves);
    showToast('Leave date removed! Save to confirm schedule.');
  };

  const handleStopMedicine = async (medId) => {
    try {
      await medicationAPI.stopMedicine(medId);
      showToast('Medication stopped successfully', 'warning');
      const selectedAppt = activePrescAppt || appointments.find(a => String(a.id) === String(tabPrescApptId));
      if (selectedAppt) {
        const medsRes = await medicationAPI.getMedicines({ patient: selectedAppt.patient });
        setSelectedPatientMeds(medsRes.data);
        const adherenceRes = await medicationAPI.getAdherence(selectedAppt.patient);
        setSelectedPatientAdherence(adherenceRes.data);
      }
    } catch (e) {
      showToast('Failed to stop medication', 'error');
    }
  };

  const handleExtendMedicine = async (medId, days) => {
    try {
      await medicationAPI.extendMedicine(medId, days);
      showToast(`Medication course extended by ${days} days!`, 'success');
      const selectedAppt = activePrescAppt || appointments.find(a => String(a.id) === String(tabPrescApptId));
      if (selectedAppt) {
        const medsRes = await medicationAPI.getMedicines({ patient: selectedAppt.patient });
        setSelectedPatientMeds(medsRes.data);
        const adherenceRes = await medicationAPI.getAdherence(selectedAppt.patient);
        setSelectedPatientAdherence(adherenceRes.data);
      }
    } catch (e) {
      showToast('Failed to extend medication duration', 'error');
    }
  };

  // Medicine Builder Helpers
  const addMedicineRow = () => {
    setMedicines([...medicines, { name: '', strength: '500mg', dosage: '1 tablet', frequency: 'Once Daily', duration: '7 Days', instructions: '', meal_timing: 'After Food' }]);
  };
  const removeMedicineRow = (idx) => {
    setMedicines(medicines.filter((_, i) => i !== idx));
  };
  const handleMedicineChange = (idx, field, value) => {
    const updated = [...medicines];
    updated[idx][field] = value;
    setMedicines(updated);
  };

  // Submit Prescription
  const handleSavePrescription = async (e) => {
    e.preventDefault();
    const apptId = activePrescAppt ? activePrescAppt.id : tabPrescApptId;
    if (!apptId) {
      showToast('Please select a patient appointment', 'warning');
      return;
    }
    if (!symptoms || medicines.some(m => !m.name || !m.name.trim())) {
      showToast('Please specify symptoms and at least one medicine name', 'warning');
      return;
    }

    // Format structured medicine data for database
    const formattedMedicines = medicines.map(m => {
      return {
        name: m.name.trim(),
        strength: m.strength || '500mg',
        dosage: m.dosage || '1 tablet',
        frequency: m.frequency || 'Once Daily',
        duration: m.duration || '7 Days',
        instructions: m.instructions.trim(),
        meal_timing: m.meal_timing || 'After Food'
      };
    });

    try {
      await prescriptionAPI.createPrescription({
        appointment: apptId,
        symptoms,
        medicines: formattedMedicines
      });

      // Book follow-up appointment if enabled
      if (followUpEnabled && followUpDate) {
        try {
          const currentAppt = activePrescAppt || appointments.find(a => String(a.id) === String(apptId));
          if (currentAppt) {
            await appointmentAPI.bookFollowUp({
              doctor: currentAppt.doctor,
              patient: currentAppt.patient,
              date: followUpDate,
              time_slot: followUpTime.length === 5 ? followUpTime + ':00' : followUpTime,
              note: followUpNote || 'Follow-up visit as advised by doctor'
            });
            showToast('Prescription saved & follow-up appointment booked!', 'success');
          }
        } catch (fuErr) {
          showToast('Prescription saved, but follow-up booking failed. Please book manually.', 'warning');
        }
      } else {
        showToast('Prescription saved & patient notified!', 'success');
      }
      setActivePrescAppt(null);
      setSymptoms('');
      setMedicines([{ name: '', strength: '500mg', dosage: '1 tablet', frequency: 'Once Daily', duration: '7 Days', instructions: '', meal_timing: 'After Food' }]);
      setFollowUpEnabled(false);
      setFollowUpDate('');
      setFollowUpTime('10:00');
      setFollowUpNote('');
      loadAllData();
    } catch (err) {
      console.error('Prescription Save Error:', err);
      const errObj = err.response?.data?.error || err.response?.data;
      let msg = 'Failed to submit prescription';
      if (typeof errObj === 'string') {
        msg = errObj;
      } else if (typeof errObj === 'object' && errObj !== null) {
        msg = Object.values(errObj).flat().join(', ');
      }
      showToast(msg, 'error');
    }
  };



  // Filter schedules
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(a => a.date === todayStr);
  const _upcomingAppointments = appointments.filter(a => a.date !== todayStr);
  const notVisitedList = appointments.filter(a => a.not_visited);


  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-6 overflow-y-auto max-h-screen">
      
      {/* ----------------- PAGE HEADER ----------------- */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200/50 dark:border-slate-800/50">
        <div>
          <h2 className="text-xl font-bold text-slate-850 dark:text-slate-100 uppercase tracking-wide">
            {tab === 'overview' ? `Welcome, Dr. ${user.username}!` : `Dr. Portal - ${tab}`}
          </h2>
          <p className="text-slate-400 dark:text-slate-500 text-xs">Medical Practitioner Workspace</p>
        </div>
      </div>

      {/* ----------------- OVERVIEW TAB ----------------- */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl flex items-center justify-between shadow-sm backdrop-blur-md">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase">Today's Schedule</span>
                <h3 className="text-2xl font-bold mt-1 text-slate-850 dark:text-slate-100">{todayAppointments.length}</h3>
              </div>
              <div className="p-3 rounded-2xl bg-sky-100 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl flex items-center justify-between shadow-sm backdrop-blur-md">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase">Pending Confirmation</span>
                <h3 className="text-2xl font-bold mt-1 text-amber-500 font-bold">
                  {appointments.filter(a => a.status === 'Pending').length}
                </h3>
              </div>
              <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                <Clipboard className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl flex items-center justify-between shadow-sm backdrop-blur-md">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase">Patient No-Shows</span>
                <h3 className="text-2xl font-bold mt-1 text-red-500">{notVisitedList.length}</h3>
              </div>
              <div className="p-3 rounded-2xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Today's appointments list */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl shadow-sm lg:col-span-2">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary-500" /> Today's Schedule ({todayAppointments.length})
              </h3>

              <div className="space-y-3">
                {todayAppointments.map((appt) => (
                  <div key={appt.id} className="p-4 border border-slate-100 dark:border-slate-800 rounded-2xl flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/40">
                    <div>
                      <p className="font-bold text-slate-850 dark:text-slate-200">{appt.patient_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{appt.time_slot.substring(0, 5)} &bull; {appt.status}</p>
                      {appt.chief_complaint && (
                        <p className="text-[11px] text-slate-500 mt-1 italic">
                          💬 {appt.chief_complaint.length > 60 ? appt.chief_complaint.substring(0, 60) + '…' : appt.chief_complaint}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          appt.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>{appt.payment_status}</span>
                        {appt.payment_method && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            {appt.payment_method === 'UPI' ? '📱' : appt.payment_method === 'Card' ? '💳' : '🏥'} {appt.payment_method}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {appt.status === 'Pending' && (
                        <>
                          <button onClick={() => handleUpdateStatus(appt.id, 'Approved')} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100" title="Approve"><Check className="w-4 h-4" /></button>
                          <button onClick={() => handleUpdateStatus(appt.id, 'Rejected')} className="p-2 bg-red-50 text-red-650 rounded-xl hover:bg-red-100" title="Reject"><X className="w-4 h-4" /></button>
                        </>
                      )}
                      {appt.status === 'Approved' && (
                        <>
                          <button onClick={() => handleUpdateStatus(appt.id, 'Completed')} className="py-1 px-3 bg-primary-600 text-white font-bold text-xs rounded-xl uppercase">Complete Visit</button>
                          <button onClick={() => handleUpdateStatus(appt.id, 'Cancelled', { not_visited: true })} className="py-1 px-3 border border-red-200 text-red-650 text-xs rounded-xl font-bold uppercase">No Show</button>
                        </>
                      )}
                      {appt.status === 'Completed' && !prescriptions.find(p => p.appointment === appt.id) && (
                        <button onClick={() => {
                          setActivePrescAppt(appt);
                        }} className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl uppercase flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" /> Prescribe
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {todayAppointments.length === 0 && (
                  <p className="text-slate-400 text-center py-12 text-sm">No scheduled appointments for today.</p>
                )}
              </div>
            </div>

            {/* Sidebar Column: Clinical Alerts & No-Shows */}
            <div className="space-y-6">
              {/* 1. Clinical Alerts Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
                <h3 className="text-base font-bold text-red-650 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" /> Clinical Alerts &amp; Insights
                </h3>
                
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {alerts.map((a) => (
                    <div key={a.id} className="p-3 border border-red-100 dark:border-red-950/20 bg-red-50/10 rounded-2xl space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[8px] font-black rounded-lg uppercase">Concern</span>
                        <span className="text-[9px] text-slate-400 font-bold">{new Date(a.created_at).toLocaleDateString(undefined, { dateStyle: 'short' })}</span>
                      </div>
                      <p className="text-slate-650 dark:text-slate-350 leading-relaxed font-semibold">{a.message}</p>
                      <button
                        type="button"
                        onClick={() => navigate('/doctor/chat')}
                        className="text-[9px] text-primary-600 font-bold hover:underline uppercase block pt-1"
                      >
                        Open Follow-up Chat →
                      </button>
                    </div>
                  ))}
                  {alerts.length === 0 && (
                    <p className="text-slate-400 text-center py-10 text-xs italic">All monitored patients are stable.</p>
                  )}
                </div>
              </div>

              {/* 2. Patients Not Visited List */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
                <h3 className="text-base font-bold text-slate-850 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-slate-400" /> Patient No-Shows List
                </h3>
                
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {notVisitedList.map((appt) => (
                    <div key={appt.id} className="p-3 border border-slate-150/40 dark:border-slate-800 rounded-2xl text-xs bg-slate-50/50 dark:bg-slate-950/40">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{appt.patient_name}</p>
                      <p className="text-[10px] text-slate-450 mt-0.5">Missed appointment on {appt.date} @ {appt.time_slot.substring(0, 5)}</p>
                    </div>
                  ))}
                  {notVisitedList.length === 0 && (
                    <p className="text-slate-400 text-center py-8 text-xs italic">All scheduled patients attended visits.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- APPOINTMENTS MANAGER TAB ----------------- */}
      {tab === 'appointments' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="p-4">Patient Name</th>
                <th className="p-4">Date</th>
                <th className="p-4">Time Slot</th>
                <th className="p-4">Chief Complaint</th>
                <th className="p-4">Status</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Action Options</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {appointments.map((appt) => (
                <tr key={appt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                  <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{appt.patient_name}</td>
                  <td className="p-4 text-slate-500">{appt.date}</td>
                  <td className="p-4 text-slate-500">{appt.time_slot.substring(0, 5)}</td>
                  <td className="p-4 max-w-[200px]">
                    {appt.chief_complaint ? (
                      <p className="text-xs text-slate-600 dark:text-slate-300 italic leading-snug">
                        {appt.chief_complaint}
                      </p>
                    ) : (
                      <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      appt.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' :
                      appt.status === 'Pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' :
                      appt.status === 'Rejected' ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {appt.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase self-start ${
                        appt.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>{appt.payment_status}</span>
                      {appt.payment_method && (
                        <span className="text-[11px] text-slate-400 font-medium">
                          {appt.payment_method === 'UPI' ? '📱' : appt.payment_method === 'Card' ? '💳' : '🏥'} {appt.payment_method}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      {appt.status === 'Pending' && (
                        <>
                          <button onClick={() => handleUpdateStatus(appt.id, 'Approved')} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400" title="Approve"><Check className="w-4 h-4" /></button>
                          <button onClick={() => handleUpdateStatus(appt.id, 'Rejected')} className="p-1.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400" title="Reject"><X className="w-4 h-4" /></button>
                        </>
                      )}
                      {appt.status === 'Approved' && (
                        <button onClick={() => handleUpdateStatus(appt.id, 'Completed')} className="py-1 px-3 bg-primary-600 text-white text-xs font-bold rounded-xl uppercase hover:bg-primary-700">Complete Visit</button>
                      )}
                      {appt.status === 'Completed' && !prescriptions.find(p => p.appointment === appt.id) && (
                        <button onClick={() => setActivePrescAppt(appt)} className="py-1 px-3 bg-indigo-600 text-white text-xs font-bold rounded-xl uppercase hover:bg-indigo-700 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Prescribe</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {appointments.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-slate-400 text-xs italic">
                    No appointments found in the system.
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>
      )}
      {/* ----------------- PRESCRIPTION BUILDING TAB ----------------- */}
      {tab === 'prescriptions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Prescription Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-5 lg:col-span-2">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" /> Create & Add Medicines
                </h3>
                <p className="text-xs text-slate-400 mt-1">Select patient visit and build multi-medicine prescription</p>
              </div>
              
              <form onSubmit={handleSavePrescription} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Select Patient Visit</label>
                  <select
                    required
                    value={tabPrescApptId}
                    onChange={(e) => setTabPrescApptId(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none text-slate-800 dark:text-slate-100 font-semibold"
                  >
                    <option value="" className="text-slate-800 dark:text-slate-100">Choose Patient Visit...</option>
                    {appointments.map(a => {
                      const hasPrescribed = prescriptions.some(p => String(p.appointment) === String(a.id));
                      return (
                        <option key={a.id} value={a.id} className="text-slate-800 dark:text-slate-100">
                          {a.patient_name} — {a.date} ({a.time_slot.substring(0, 5)}) [{hasPrescribed ? 'Prescription Issued' : a.status}]
                        </option>
                      );
                    })}
                  </select>

                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Patient Symptoms Summary</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="e.g. Dry cough, low grade fever, mild headache..."
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none resize-none"
                  />
                </div>

                {/* 3 Section Medicine Builder */}
                <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-400 uppercase">Prescribed Medicines</label>
                  </div>


                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {medicines.map((med, idx) => (
                      <div key={idx} className="p-3 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/30 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Medicine #{idx + 1}</span>
                          {medicines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeMedicineRow(idx)}
                              className="text-[11px] text-red-500 hover:text-red-700 font-bold flex items-center gap-1"
                            >
                              <Trash className="w-3 h-3" /> Remove
                            </button>
                          )}
                        </div>

                        {/* Section 1: Medicine Name, Strength & Dosage */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-1">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Medicine Name</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Paracetamol"
                              value={med.name}
                              onChange={(e) => handleMedicineChange(idx, 'name', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none text-slate-800 dark:text-slate-100 font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Strength</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. 500mg"
                              value={med.strength || ''}
                              onChange={(e) => handleMedicineChange(idx, 'strength', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none text-slate-800 dark:text-slate-100 font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Dosage</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. 1 tablet"
                              value={med.dosage || ''}
                              onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none text-slate-800 dark:text-slate-100 font-semibold"
                            />
                          </div>
                        </div>

                        {/* Section 2: Frequency & Meal Timing */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Frequency</label>
                            <select
                              value={med.frequency || 'Once Daily'}
                              onChange={(e) => handleMedicineChange(idx, 'frequency', e.target.value)}
                              className="w-full px-2 py-1.5 text-[11px] font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none text-slate-800 dark:text-slate-100"
                            >
                              <option value="Once Daily">Once Daily</option>
                              <option value="Twice Daily">Twice Daily</option>
                              <option value="Three Times Daily">Three Times Daily</option>
                              <option value="Every 6 Hours">Every 6 Hours</option>
                              <option value="Every 8 Hours">Every 8 Hours</option>
                              <option value="Every 12 Hours">Every 12 Hours</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Meal Timing</label>
                            <select
                              value={med.meal_timing || 'After Food'}
                              onChange={(e) => handleMedicineChange(idx, 'meal_timing', e.target.value)}
                              className="w-full px-2 py-1.5 text-[11px] font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none text-slate-800 dark:text-slate-100"
                            >
                              <option value="After Food">After Food</option>
                              <option value="Before Food">Before Food</option>
                              <option value="Any Time">Any Time</option>
                            </select>
                          </div>
                        </div>

                        {/* Section 3: Duration */}
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Duration</label>
                          <div className="flex flex-wrap gap-1.5">
                            {['3 Days', '5 Days', '7 Days', '10 Days', '14 Days', '21 Days', '1 Month', 'Ongoing'].map(d => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => handleMedicineChange(idx, 'duration', d)}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                                  (med.duration || '7 Days') === d
                                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950/30 dark:text-primary-300'
                                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-350'
                                }`}
                              >
                                {d}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <input
                            type="text"
                            placeholder="Optional instructions..."
                            value={med.instructions}
                            onChange={(e) => handleMedicineChange(idx, 'instructions', e.target.value)}
                            className="w-full px-2.5 py-1 text-xs rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none text-slate-800 dark:text-slate-100 font-semibold"
                          />
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addMedicineRow}
                      className="w-full py-2 border-2 border-dashed border-slate-200 dark:border-slate-800 text-primary-600 hover:bg-primary-50/50 text-xs font-bold rounded-xl flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Another Medicine
                    </button>
                  </div>
                </div>

                {/* ---- FOLLOW-UP APPOINTMENT SECTION ---- */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setFollowUpEnabled(!followUpEnabled)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold uppercase transition-colors ${
                      followUpEnabled
                        ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300'
                        : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      Schedule Follow-Up Appointment for Patient
                    </span>
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      followUpEnabled ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                    }`}>
                      {followUpEnabled && <div className="w-2 h-2 rounded-full bg-white" />}
                    </span>
                  </button>

                  {followUpEnabled && (
                    <div className="p-4 space-y-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <p className="text-[11px] text-slate-400">This will automatically book a follow-up appointment in the patient's dashboard.</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Follow-Up Date <span className="text-red-500">*</span></label>
                          <input
                            type="date"
                            value={followUpDate}
                            min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                            onChange={(e) => setFollowUpDate(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Time Slot <span className="text-red-500">*</span></label>
                          <input
                            type="time"
                            value={followUpTime}
                            onChange={(e) => setFollowUpTime(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Follow-Up Note (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. Blood test review, wound dressing check..."
                          value={followUpNote}
                          onChange={(e) => setFollowUpNote(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </div>
                      <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl text-[11px] text-indigo-700 dark:text-indigo-400">
                        📅 The patient will see this follow-up in their appointments dashboard as a pending visit.
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-bold text-xs uppercase shadow-md shadow-primary-500/10"
                >
                  Save & Issue Prescription{followUpEnabled && followUpDate ? ' + Book Follow-Up' : ''}
                </button>
              </form>
            </div>

            {/* Patient Medical History Panel (Derived from Past Prescriptions) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-500" /> Patient Medical History
                  </h3>
                  <p className="text-[11px] text-slate-400">Past prescription & diagnosis records</p>
                </div>
                {selectedPatientHistory.length > 0 && (
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-full text-xs font-bold border border-emerald-100 dark:border-emerald-900/40">
                    {selectedPatientHistory.length} Past Visits
                  </span>
                )}
              </div>

              {tabPrescApptId ? (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {/* Patient Adherence Card */}
                  {selectedPatientAdherence && (
                    <div className="p-3.5 bg-slate-50/60 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800 rounded-2xl flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-slate-850 dark:text-slate-205">Medication Adherence Score</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Doses Taken: {selectedPatientAdherence.taken_doses} / {selectedPatientAdherence.total_scheduled_doses - selectedPatientAdherence.pending_doses}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                        selectedPatientAdherence.adherence_label === 'Excellent' ? 'bg-emerald-100 text-emerald-700' :
                        selectedPatientAdherence.adherence_label === 'Good' ? 'bg-indigo-100 text-indigo-750' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {selectedPatientAdherence.adherence_percentage}%
                      </span>
                    </div>
                  )}

                  {/* Active Medications with Stop/Extend */}
                  {selectedPatientMeds.filter(m => m.status === 'Active').length > 0 && (
                    <div className="p-4 border border-slate-150 dark:border-slate-850 rounded-2xl space-y-3 bg-slate-50/40">
                      <p className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Active Medications ({selectedPatientMeds.filter(m => m.status === 'Active').length})</p>
                      <div className="space-y-2">
                        {selectedPatientMeds.filter(m => m.status === 'Active').map(med => (
                          <div key={med.id} className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 flex justify-between items-center gap-3">
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">{med.name} <span className="text-[10px] text-slate-400 font-semibold">({med.strength || 'N/A'})</span></p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{med.dosage} · {med.frequency} · {med.duration} Days</p>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const days = prompt('Enter number of days to extend medication course:', '7');
                                  if (days && !isNaN(days) && parseInt(days) > 0) {
                                    handleExtendMedicine(med.id, parseInt(days));
                                  }
                                }}
                                className="py-1 px-2.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-bold text-[9px] rounded-lg uppercase hover:bg-indigo-100"
                              >
                                Extend
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm('Are you sure you want to stop this medication?')) {
                                    handleStopMedicine(med.id);
                                  }
                                }}
                                className="py-1 px-2.5 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 font-bold text-[9px] rounded-lg uppercase hover:bg-red-100"
                              >
                                Stop
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Patient Health Metric Trends */}
                  <div className="p-4 border border-slate-150 dark:border-slate-850 rounded-2xl bg-slate-50/45 space-y-4">
                    <p className="font-bold text-slate-450 uppercase text-[9px] tracking-wider">Patient Health Metric Trends</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {renderSVGChart('Systolic BP (mmHg)', 'systolic', 'text-indigo-500', 90, 160)}
                      {renderSVGChart('Blood Glucose (mg/dL)', 'blood_sugar', 'text-amber-500', 70, 180)}
                    </div>
                  </div>

                  <p className="font-bold text-slate-400 uppercase text-[9px] tracking-wider pt-2 border-t border-slate-100 dark:border-slate-800">Prescription &amp; Diagnosis History</p>
                  
                  <div className="space-y-3">
                  {selectedPatientHistory.map((item) => (
                    <div key={item.id} className="p-3.5 border border-slate-150 dark:border-slate-800 rounded-2xl bg-slate-50/60 dark:bg-slate-950/40 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-slate-850 dark:text-slate-100 text-xs">Dr. {item.doctor_name}</span>
                          <p className="text-[10px] text-slate-400">{new Date(item.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 text-[9px] font-extrabold rounded-full uppercase">
                          Prescription #{item.id}
                        </span>
                      </div>

                      <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/60 text-xs">
                        <p className="font-bold text-slate-400 uppercase text-[9px]">Diagnosed Symptoms</p>
                        <p className="text-slate-700 dark:text-slate-300 font-medium text-xs mt-0.5">{item.symptoms}</p>
                      </div>

                      <div>
                        <p className="font-bold text-slate-400 uppercase text-[9px] mb-1">Prescribed Medicines</p>
                        <div className="flex flex-wrap gap-1">
                          {item.medicines.map((m, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-medium rounded-lg">
                              💊 {m.name} <span className="text-primary-600 dark:text-primary-400 font-bold">({m.dosage})</span>
                              {m.duration && <span className="ml-1 text-[9px] text-slate-450 font-bold">[{m.duration}]</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                  {selectedPatientHistory.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                      No previous prescription history found for this patient.
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 text-xs italic border border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                  Select a patient visit from the dropdown to view their prescription history.
                </div>
              )}
            </div>

          </div>

          {/* Treatment Chart History */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary-500" /> Treatment Chart History ({prescriptions.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {prescriptions.map((presc) => (
                <div key={presc.id} className="p-4 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-2 bg-slate-50/30 dark:bg-slate-950/20">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-slate-850 dark:text-slate-200">{presc.patient_name}</p>
                    <span className="text-[10px] text-slate-400">{new Date(presc.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-slate-500"><b>Symptoms:</b> {presc.symptoms}</p>
                  <div className="flex flex-wrap gap-1 border-t border-slate-100 dark:border-slate-800 pt-2">
                    {presc.medicines.map((m, i) => (
                      <span key={i} className="px-2 py-0.5 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 rounded-full text-[10px] font-semibold border border-primary-100 dark:border-primary-900/40">
                        💊 {m.name} — {m.dosage} {m.duration && `[${m.duration}]`}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {prescriptions.length === 0 && (
                <div className="col-span-3 text-center text-slate-400 text-sm py-12">No prescriptions recorded yet.</div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* ----------------- WORKING SCHEDULE & LEAVES TAB ----------------- */}
      {tab === 'availability' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Work Hours Settings */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-500" /> Working Hours Schedule
            </h3>

            <form onSubmit={handleSaveAvailability} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Start Time</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">End Time</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="py-2.5 px-6 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-xs uppercase shadow-md shadow-primary-500/10"
              >
                Save Hours
              </button>
            </form>
          </div>

          {/* Leave Management Settings */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" /> Leave Management Blockouts
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Block Leave Date</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={newLeaveDate}
                    onChange={(e) => setNewLeaveDate(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddLeave}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl uppercase"
                  >
                    Block Date
                  </button>
                </div>
              </div>

              <div className="border border-slate-100 dark:border-slate-850 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Blocked Dates</label>
                <div className="flex flex-wrap gap-2">
                  {leavesList.map(date => (
                    <span key={date} className="px-3 py-1 bg-red-50 text-red-650 rounded-full text-xs font-bold flex items-center gap-1.5 border border-red-200/50">
                      {date}
                      <button onClick={() => handleRemoveLeave(date)} className="hover:text-red-800 font-bold">×</button>
                    </span>
                  ))}
                  {leavesList.length === 0 && (
                    <p className="text-slate-400 text-xs italic py-2">No leave blockouts set. You are available for scheduling.</p>
                  )}
                </div>
              </div>

              <button
                onClick={handleSaveAvailability}
                className="w-full py-2.5 bg-slate-800 text-white text-xs font-bold rounded-xl uppercase hover:bg-slate-900"
              >
                Save Schedule Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- PRESCRIPTION WRITER MODAL ----------------- */}
      {activePrescAppt && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Write Prescription</h3>
              <p className="text-xs text-primary-600">Patient: {activePrescAppt.patient_name}</p>
            </div>

            <form onSubmit={handleSavePrescription} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Patient Symptoms Summary</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Dry cough, low grade fever, mild headache"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none resize-none"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase">Prescribed Medicines</label>
                  <button
                    type="button"
                    onClick={addMedicineRow}
                    className="py-1 px-3 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 hover:bg-primary-100 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Medicine
                  </button>
                </div>

                <div className="space-y-4">
                  {medicines.map((med, idx) => (
                    <div key={idx} className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Medicine #{idx + 1}</span>
                        {medicines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMedicineRow(idx)}
                            className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          >
                            <Trash className="w-3.5 h-3.5" /> Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Section 1: Medicine Name & Category */}
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">1. Medicine Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Paracetamol 500mg, Betnovate Cream..."
                            value={med.name}
                            onChange={(e) => handleMedicineChange(idx, 'name', e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Category</label>
                          <select
                            value={med.type || 'Eatable'}
                            onChange={(e) => handleMedicineChange(idx, 'type', e.target.value)}
                            className="w-full px-2.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
                          >
                            <option value="Eatable">💊 Oral / Eatable</option>
                            <option value="Cream">🧴 External / Cream</option>
                          </select>
                        </div>

                        {/* Section 2: Dosage & Timing */}
                        <div className="md:col-span-3">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">2. Dosage & Timing</label>
                          
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Morning / Evening / Night Checkboxes */}
                            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5">
                              <label className="flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={med.morning}
                                  onChange={(e) => handleMedicineChange(idx, 'morning', e.target.checked)}
                                  className="rounded text-primary-600 focus:ring-0"
                                />
                                Morning
                              </label>

                              <label className="flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 cursor-pointer border-l border-slate-200 dark:border-slate-800 pl-1.5">
                                <input
                                  type="checkbox"
                                  checked={med.evening}
                                  onChange={(e) => handleMedicineChange(idx, 'evening', e.target.checked)}
                                  className="rounded text-primary-600 focus:ring-0"
                                />
                                Evening
                              </label>

                              <label className="flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 cursor-pointer border-l border-slate-200 dark:border-slate-800 pl-1.5">
                                <input
                                  type="checkbox"
                                  checked={med.night}
                                  onChange={(e) => handleMedicineChange(idx, 'night', e.target.checked)}
                                  className="rounded text-primary-600 focus:ring-0"
                                />
                                Night
                              </label>
                            </div>

                            {/* Meal Timing Select or Cream Badge */}
                            {med.type === 'Cream' ? (
                              <span className="px-3 py-1.5 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-xs font-bold rounded-xl border border-amber-200/60 dark:border-amber-900/40">
                                🧴 External Application
                              </span>
                            ) : (
                              <select
                                value={med.meal}
                                onChange={(e) => handleMedicineChange(idx, 'meal', e.target.value)}
                                className="px-2.5 py-1.5 text-[11px] font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none"
                              >
                                <option value="After Meal">After Meal</option>
                                <option value="Before Meal">Before Meal</option>
                              </select>
                            )}
                          </div>
                        </div>
                      </div>


                      <div>
                        <input
                          type="text"
                          placeholder="Instructions (e.g. 5 days, take with warm water...)"
                          value={med.instructions}
                          onChange={(e) => handleMedicineChange(idx, 'instructions', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}

                  {/* Section 3: Add Medicine Action Button */}
                  <button
                    type="button"
                    onClick={addMedicineRow}
                    className="w-full py-2.5 border-2 border-dashed border-slate-200 dark:border-slate-800 text-primary-600 dark:text-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-950/20 text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Another Medicine
                  </button>
                </div>
              </div>


              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setActivePrescAppt(null)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold uppercase hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-705 text-white rounded-2xl text-xs font-bold uppercase"
                >
                  Complete & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* ----------------- PATIENT FOLLOW-UP CHAT TAB ----------------- */}
      {tab === 'chat' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex h-[580px]">
          {/* Patient Conversations Sidebar (Left Column) */}
          <div className="w-1/3 border-r border-slate-100 dark:border-slate-800 flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Consulted Patients</h3>
              <p className="text-[10px] text-slate-405 mt-0.5">Select a patient to start follow-up conversation</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {appointments.filter((v, i, a) => a.findIndex(t => t.patient === v.patient) === i).map(appt => {
                const isSelected = chatPartner && chatPartner.id === appt.patient;
                return (
                  <button
                    key={appt.patient}
                    type="button"
                    onClick={() => {
                      setChatPartner({
                        id: appt.patient,
                        user: appt.patient_user_id || appt.patient,
                        name: appt.patient_name
                      });
                    }}
                    className={`w-full p-3 rounded-2xl flex items-center gap-3 text-left transition-all ${
                      isSelected
                        ? 'bg-primary-50 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900/40 text-primary-950 dark:text-primary-400'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-950/40 text-slate-700 dark:text-slate-350 border border-transparent'
                    }`}
                  >
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs">{appt.patient_name}</h4>
                      <p className="text-[9px] text-slate-400 mt-0.5">EHR Profile #{appt.patient}</p>
                    </div>
                  </button>
                );
              })}
              {appointments.length === 0 && (
                <p className="text-[11px] text-slate-400 italic text-center py-12">No consulted patients found.</p>
              )}
            </div>
          </div>

          {/* Active Chat Conversation Panel (Right Column) */}
          <div className="flex-1 flex flex-col justify-between bg-slate-50/20 dark:bg-slate-950/10">
            {chatPartner ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-850 dark:text-slate-100 text-sm">{chatPartner.name}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">EHR Follow-up Channel</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      chatAPI.getMessages(chatPartner.user).then(res => setChatMessages(res.data));
                      showToast('Conversation reloaded', 'success');
                    }}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"
                    title="Refresh Chat"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {/* Messages Panel */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                  {chatMessages.map((msg) => {
                    const isMe = String(msg.sender) === String(user.id);
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] p-3.5 rounded-2xl space-y-1.5 border shadow-sm ${
                          isMe
                            ? 'bg-primary-600 text-white border-primary-500 dark:bg-primary-950/80 dark:border-primary-900/60'
                            : 'bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-200 border-slate-200/50 dark:border-slate-800'
                        }`}>
                          <p className="text-xs leading-relaxed font-medium break-words">{msg.message}</p>
                          {msg.image_url && (
                            <img
                              src={msg.image_url}
                              alt="attachment"
                              className="rounded-xl max-h-48 w-full object-cover cursor-pointer border dark:border-slate-800 mt-1"
                              onClick={() => window.open(msg.image_url, '_blank')}
                            />
                          )}
                          <div className="flex justify-between items-center text-[8px] opacity-75 font-semibold">
                            <span>{new Date(msg.created_at || msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isMe && (
                              <span className="ml-2">
                                {msg.is_read ? '✓✓ Read' : '✓ Sent'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {chatMessages.length === 0 && (
                    <div className="text-center py-20 text-slate-400 italic text-xs">
                      No follow-up messages yet with patient {chatPartner.name}.
                    </div>
                  )}
                </div>

                {/* Footer Form */}
                <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
                  <label className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 rounded-xl cursor-pointer transition-colors flex items-center justify-center">
                    <Paperclip className="w-4 h-4" />
                    <input type="file" onChange={handleChatFileUpload} className="hidden" accept="image/*" />
                  </label>
                  
                  <input
                    type="text"
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    placeholder="Type follow-up details..."
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:ring-0 focus:outline-none text-slate-800 dark:text-slate-200"
                  />
                  
                  {chatAttachmentUrl && (
                    <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 py-1.5 px-2.5 rounded-xl text-[9px] font-bold">
                      <span>Attached</span>
                      <button type="button" onClick={() => setChatAttachmentUrl('')} className="text-red-500">✕</button>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
                <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-800 mb-3" />
                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">No Chat Channel Selected</h4>
                <p className="text-[11px] mt-1 text-slate-400 text-center max-w-xs">Select your patient from the left panel to begin follow-up consultation.</p>
              </div>
            )}
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
export default DoctorDashboard;
