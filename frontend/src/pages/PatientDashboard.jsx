import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  doctorAPI, appointmentAPI, reportAPI, prescriptionAPI, 
  paymentAPI, symptomAPI, medicationAPI, healthMetricAPI, chatAPI
} from '../api';
import { 
  Search, Calendar, FileText, Upload, Brain,
  MapPin, Check, Plus, AlertCircle, Sparkles, User, Info, DollarSign, Download, RefreshCw, Activity,
  MessageSquare, TrendingUp, ChevronRight, AlertTriangle, Send, Heart, Paperclip, Clock
} from 'lucide-react';

import Toast from '../components/Toast';

export const PatientDashboard = ({ tab }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  
  // Data States
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [reports, setReports] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);

  // Search Doctor Form (Instant Search)
  const [specQuery, setSpecQuery] = useState('');
  const [locQuery, setLocQuery] = useState('');

  // Book/Reschedule Appointment Modal
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookingModal, setBookingModal] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingStep, setBookingStep] = useState(1); // 1=date/time/complaint, 2=payment
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [bookingPaymentMethod, setBookingPaymentMethod] = useState('UPI');

  const [rescheduleTargetAppt, setRescheduleTargetAppt] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [rescheduleSelectedSlot, setRescheduleSelectedSlot] = useState('');
  const [rescheduleModal, setRescheduleModal] = useState(false);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // Symptom log & ML prediction
  const [symptomsInput, setSymptomsInput] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [age, setAge] = useState(30);
  const [gender, setGender] = useState('Male');
  const [bp, setBp] = useState('Normal');
  const [sugar, setSugar] = useState('Normal');
  const [bmi, _setBmi] = useState(22.5);
  const [familyHistory, _setFamilyHistory] = useState('No');
  const [lifestyle, _setLifestyle] = useState('Active');
  const [predictionResult, setPredictionResult] = useState(null);

  // OCR Upload state
  const [reportTitle, setReportTitle] = useState('');
  const [reportFile, setReportFile] = useState(null);
  const [uploadingReport, setUploadingReport] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // Payment checkout state
  const [pendingPaymentAppt, setPendingPaymentAppt] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('UPI');

  // Medication Tracking States
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [activeMedicines, setActiveMedicines] = useState([]);
  const [adherenceReport, setAdherenceReport] = useState(null);
  const [medsSubTab, setMedsSubTab] = useState('schedule');
  const [selectedMedicineDetails, setSelectedMedicineDetails] = useState(null);

  // Health Metrics & Trend States
  const [healthMetrics, setHealthMetrics] = useState([]);
  const [metricsTimeframe, setMetricsTimeframe] = useState('weekly');
  const [isLogMetricModalOpen, setIsLogMetricModalOpen] = useState(false);
  const [newHealthWeight, setNewHealthWeight] = useState('');
  const [newHealthSystolic, setNewHealthSystolic] = useState('');
  const [newHealthDiastolic, setNewHealthDiastolic] = useState('');
  const [newHealthSugar, setNewHealthSugar] = useState('');
  const [newHealthHeart, setNewHealthHeart] = useState('');

  // Emergency Info Profile State
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [emergencyPhone, setEmergencyPhone] = useState(user?.profile?.emergency_contact || '');
  const [emergencyBlood, setEmergencyBlood] = useState(user?.profile?.blood_group || 'A+');
  const [emergencyAllergies, setEmergencyAllergies] = useState(user?.profile?.allergies || 'None');

  // Follow-up Chat States
  const [chatPartner, setChatPartner] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInputText, setChatInputText] = useState('');
  const [chatAttachmentUrl, setChatAttachmentUrl] = useState('');
  const [isUploadingChatFile, setIsUploadingChatFile] = useState(false);




  const SYMPTOMS_LIST = [
    'fever', 'fatigue', 'chills', 'weight_loss', 'weight_gain', 'sweating', 'weakness', 'cough',
    'shortness_of_breath', 'sore_throat', 'runny_nose', 'sneezing', 'wheezing', 'chest_congestion',
    'chest_pain', 'palpitations', 'high_blood_pressure', 'nausea', 'vomiting', 'diarrhea',
    'abdominal_pain', 'indigestion', 'loss_of_appetite', 'constipation', 'headache', 'dizziness',
    'blurred_vision', 'numbness_or_tingling', 'difficulty_concentrating', 'joint_pain', 'muscle_pain',
    'stiff_neck', 'back_pain', 'swollen_joints', 'skin_rash', 'itching', 'dry_skin',
    'yellowing_skin_eyes', 'frequent_urination', 'burning_urination', 'excessive_thirst',
    'persistent_sadness', 'anxiety', 'sleep_disturbance'
  ];


  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const renderSVGChart = (title, dataKey, colorClass, minVal, maxVal) => {
    if (healthMetrics.length === 0) {
      return (
        <div className="h-28 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 italic bg-slate-50/30 dark:bg-slate-950/10 border border-slate-100 dark:border-slate-800 rounded-xl">
          No metrics logged yet.
        </div>
      );
    }
    
    const sorted = [...healthMetrics].sort((a, b) => a.date.localeCompare(b.date));
    const padding = 15;
    const chartHeight = 70;
    const chartWidth = 270;
    
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
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold px-1 uppercase tracking-wider">
          <span>Min: {Math.round(min + 3)}</span>
          <span className="text-slate-500 dark:text-slate-450">{title}</span>
          <span>Max: {Math.round(max - 3)}</span>
        </div>
        <div className="relative p-2.5 bg-slate-50/30 dark:bg-slate-950/10 border border-slate-100 dark:border-slate-850 rounded-2xl">
          <svg className="w-full h-20 overflow-visible" viewBox="0 0 300 100">
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

  // Instant filter triggers on specQuery/locQuery change
  useEffect(() => {
    if (tab === 'search' || tab === 'overview') {
      const delayDebounceFn = setTimeout(() => {
        runDoctorSearch();
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [specQuery, locQuery, tab]);

  useEffect(() => {
    loadAllData();
  }, [tab]);

  const [availableSymptomsList, setAvailableSymptomsList] = useState(SYMPTOMS_LIST);

  const loadAllData = async () => {
    try {
      if (tab === 'overview' || tab === 'appointments' || tab === 'history' || tab === 'chat') {
        const appts = await appointmentAPI.getAppointments();
        setAppointments(appts.data);
      }
      if (tab === 'predict-disease') {
        try {
          const symsRes = await symptomAPI.getSymptoms();
          if (Array.isArray(symsRes.data) && symsRes.data.length > 0) {
            setAvailableSymptomsList(symsRes.data);
          }
        } catch (e) {
          console.warn('Using default fallback symptoms list');
        }
      }
      if (tab === 'search' || tab === 'overview') {
        runDoctorSearch();
      }
      if (tab === 'reports') {
        const reps = await reportAPI.getReports();
        setReports(reps.data);
      }
      if (tab === 'prescriptions' || tab === 'overview' || tab === 'history') {
        const prescs = await prescriptionAPI.getPrescriptions();
        setPrescriptions(prescs.data);
      }
      if (tab === 'overview' || tab === 'medications') {
        try {
          const todayStr = new Date().toISOString().split('T')[0];
          const schedulesRes = await medicationAPI.getSchedules({ date: todayStr });
          setTodaySchedules(schedulesRes.data);
          
          const medsRes = await medicationAPI.getMedicines();
          setActiveMedicines(medsRes.data);
          
          const adherenceRes = await medicationAPI.getAdherence();
          setAdherenceReport(adherenceRes.data);
        } catch (e) {
          console.warn('Failed to load medication schedules:', e.message);
        }
      }
      if (tab === 'overview') {
        try {
          const metricsRes = await healthMetricAPI.getMetrics();
          setHealthMetrics(metricsRes.data);
        } catch (e) {
          console.warn('Failed to load health metrics:', e.message);
        }
      }

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };



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

  useEffect(() => {
    if (tab === 'chat' && chatPartner && chatMessages.length > 0) {
      chatAPI.markRead(chatPartner.user).catch(err => console.error(err));
    }
  }, [tab, chatPartner, chatMessages.length]);

  const handleLogMetric = async (e) => {
    e.preventDefault();
    if (!newHealthWeight && !newHealthSystolic && !newHealthSugar && !newHealthHeart) {
      showToast('Please fill in at least one health metric', 'warning');
      return;
    }
    try {
      await healthMetricAPI.logMetric({
        weight: newHealthWeight ? parseFloat(newHealthWeight) : null,
        systolic: newHealthSystolic ? parseInt(newHealthSystolic) : null,
        diastolic: newHealthDiastolic ? parseInt(newHealthDiastolic) : null,
        blood_sugar: newHealthSugar ? parseInt(newHealthSugar) : null,
        heart_rate: newHealthHeart ? parseInt(newHealthHeart) : null,
      });
      showToast('Health metric logged successfully & doctor notified of changes!', 'success');
      setIsLogMetricModalOpen(false);
      setNewHealthWeight('');
      setNewHealthSystolic('');
      setNewHealthDiastolic('');
      setNewHealthSugar('');
      setNewHealthHeart('');
      const metricsRes = await healthMetricAPI.getMetrics();
      setHealthMetrics(metricsRes.data);
    } catch (err) {
      showToast('Failed to log health metric', 'error');
    }
  };

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

  const handleSaveEmergencyInfo = async (e) => {
    e.preventDefault();
    try {
      await patientAPI.updateProfile(user.profile.id, {
        emergency_contact: emergencyPhone,
        blood_group: emergencyBlood,
        allergies: emergencyAllergies
      });
      showToast('Emergency Information updated & doctor notified!', 'success');
      setIsEmergencyModalOpen(false);
      loadAllData();
    } catch (err) {
      showToast('Failed to update emergency info', 'error');
    }
  };

  const runDoctorSearch = async () => {
    try {
      const res = await doctorAPI.getDoctors(specQuery, locQuery);
      setDoctors(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Availability slots check for booking
  const checkSlots = async (date) => {
    if (!selectedDoctor || !date) return;
    try {
      const res = await appointmentAPI.getSlots(selectedDoctor.id, date);
      
      // Clear the previously selected slot whenever date changes
      setSelectedSlot('');

      // Check leaves from API response
      if (res.data.is_leave) {
        setAvailableSlots([]);
        return;
      }

      const allSlots = [];
      let current = new Date(`2026-01-01T${selectedDoctor.working_hours_start}`);
      const end = new Date(`2026-01-01T${selectedDoctor.working_hours_end}`);
      while (current < end) {
        const timeStr = current.toTimeString().substring(0, 5);
        if (!res.data.booked_slots.includes(timeStr)) {
          allSlots.push(timeStr);
        }
        current.setMinutes(current.getMinutes() + 30);
      }
      setAvailableSlots(allSlots);
    } catch (err) {
      showToast('Failed to check available slots', 'error');
    }
  };

  // Availability slots check for rescheduling
  const checkRescheduleSlots = async (date) => {
    if (!rescheduleTargetAppt || !date) return;
    try {
      const res = await appointmentAPI.getSlots(rescheduleTargetAppt.doctor, date);
      
      // Clear the previously selected slot
      setRescheduleSelectedSlot('');

      // Check leaves from API response
      if (res.data.is_leave) {
        setRescheduleSlots([]);
        return;
      }

      // Fetch doctor info to get working hours
      const docRes = await doctorAPI.getAllDoctors();
      const doctorObj = docRes.data.find(d => d.id === rescheduleTargetAppt.doctor);

      const allSlots = [];
      let current = new Date(`2026-01-01T${doctorObj.working_hours_start}`);
      const end = new Date(`2026-01-01T${doctorObj.working_hours_end}`);
      while (current < end) {
        const timeStr = current.toTimeString().substring(0, 5);
        if (!res.data.booked_slots.includes(timeStr)) {
          allSlots.push(timeStr);
        }
        current.setMinutes(current.getMinutes() + 30);
      }
      setRescheduleSlots(allSlots);
    } catch (err) {
      showToast('Failed to check available reschedule slots', 'error');
    }
  };

  const handleBookAppt = async (e) => {
    e.preventDefault();
    if (bookingLoading) return;
    setBookingLoading(true);
    try {
      const apptRes = await appointmentAPI.bookAppointment({
        doctor: selectedDoctor.id,
        date: bookingDate,
        time_slot: selectedSlot.length === 5 ? selectedSlot + ':00' : selectedSlot,
        chief_complaint: chiefComplaint
      });
      // Process payment immediately at booking time
      if (bookingPaymentMethod !== 'Hospital') {
        try {
          await paymentAPI.checkout({
            appointment_id: apptRes.data?.id,
            amount: 250.00,
            method: bookingPaymentMethod
          });
        } catch (_) { /* payment can be retried later */ }
      }
      showToast(
        bookingPaymentMethod === 'Hospital'
          ? 'Appointment booked! Pay at hospital during visit.'
          : 'Appointment booked & payment processed!',
        'success'
      );
      setBookingModal(false);
      setBookingStep(1);
      setChiefComplaint('');
      setBookingDate('');
      setSelectedSlot('');
      loadAllData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Booking failed', 'error');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleRescheduleAppt = async (e) => {
    e.preventDefault();
    if (rescheduleLoading) return;
    setRescheduleLoading(true);
    try {
      await appointmentAPI.updateAppointment(rescheduleTargetAppt.id, {
        date: rescheduleDate,
        time_slot: rescheduleSelectedSlot.length === 5 ? rescheduleSelectedSlot + ':00' : rescheduleSelectedSlot,
        status: 'Pending' // Reset to pending confirmation
      });
      showToast('Appointment rescheduled! Pending doctor approval.', 'success');
      setRescheduleModal(false);
      loadAllData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Rescheduling failed', 'error');
    } finally {
      setRescheduleLoading(false);
    }
  };



  // ML Predict Disease
  const handleDiseasePrediction = async () => {
    if (selectedSymptoms.length === 0) {
      showToast('Please select at least one symptom', 'warning');
      return;
    }
    try {
      const res = await symptomAPI.predictDisease({
        symptoms: selectedSymptoms,
        age,
        gender,
        bp,
        sugar,
        bmi,
        family_history: familyHistory,
        lifestyle
      });
      setPredictionResult(res.data);
      showToast('Disease prediction generated!', 'success');
    } catch (err) {
      showToast('Prediction model failed', 'error');
    }
  };

  // ML Predict Health Risk trend
  const handleRiskTrendPrediction = async () => {
    try {
      const res = await symptomAPI.predictHealthRisk({ history: healthMetricsHistory });
      setTrendResult(res.data);
      showToast('Health risk trends forecast successful!', 'success');
    } catch (err) {
      showToast('Trend model failed', 'error');
    }
  };

  const addMetricHistory = (day, value) => {
    setHealthMetricsHistory([...healthMetricsHistory, { day: parseInt(day), metric_value: parseFloat(value) }]);
  };

  // OCR Upload Report
  const handleReportUpload = async (e) => {
    e.preventDefault();
    if (!reportFile || !reportTitle) {
      showToast('Please specify title and choose file', 'warning');
      return;
    }
    setUploadingReport(true);
    try {
      const formData = new FormData();
      formData.append('title', reportTitle);
      formData.append('patient_id', user.profile.id);
      formData.append('reportFile', reportFile);
      
      const res = await reportAPI.uploadReport(formData);
      showToast('Report uploaded & parsed via OCR successfully!', 'success');
      setSelectedReport(res.data);
      setReportTitle('');
      setReportFile(null);
      loadAllData();
    } catch (err) {
      showToast('OCR Analysis failed. Check file format.', 'error');
    } finally {
      setUploadingReport(false);
    }
  };

  const handleTakeDose = async (doseId) => {
    try {
      await medicationAPI.takeDose(doseId);
      showToast('Dose marked as taken!', 'success');
      loadAllData();
    } catch (e) {
      showToast('Failed to mark dose taken', 'error');
    }
  };

  const handleUndoDose = async (doseId) => {
    try {
      await medicationAPI.undoDose(doseId);
      showToast('Dose marked as pending.', 'info');
      loadAllData();
    } catch (e) {
      showToast('Failed to undo dose action', 'error');
    }
  };

  // Checkout Payment
  const handleCheckoutPayment = async () => {
    try {
      await paymentAPI.checkout({
        appointment_id: pendingPaymentAppt.id,
        amount: 250.00,
        method: paymentMethod
      });
      showToast('Payment completed successfully!', 'success');
      setPendingPaymentAppt(null);
      loadAllData();
    } catch (err) {
      showToast('Payment transaction failed', 'error');
    }
  };

  // PDF Prescription downloader
  const downloadPrescriptionPDF = (presc) => {
    const docText = `
MEDINTEL DIGITAL PRESCRIPTION
-----------------------------
Prescription ID: PRSC-${presc.id}
Date: ${new Date(presc.created_at).toLocaleDateString()}
Doctor: ${presc.doctor_name || 'Doctor'}
Patient: ${presc.patient_name || 'Patient'}
Symptoms: ${presc.symptoms || 'N/A'}

Medicines Prescribed:
${(presc.medicines || []).map((m, i) => `${i+1}. ${m.name} - Dosage: ${m.dosage} - Duration: ${m.duration || 'N/A'} - Instructions: ${m.instructions}`).join('\n')}

Disclaimer: This is a system-generated prescription verified by Dr. ${presc.doctor_name || 'Doctor'}.
    `;
    const element = document.createElement("a");
    const file = new Blob([docText], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `Prescription_PRSC-${presc.id}.txt`;
    document.body.appendChild(element);
    element.click();
    showToast('Prescription text receipt downloaded successfully!');
  };

  const downloadBillPDF = (appt) => {
    const docText = `
--------------------------------------------------
                  MEDINTEL CLINICS
              CONSULTATION INVOICE / RECEIPT
--------------------------------------------------
Receipt ID: INV-${appt.id}
Date: ${new Date().toLocaleDateString()}
Transaction Status: PAID

PATIENT DETAILS:
Patient Name: ${user?.username || 'Patient'}
Role: Patient

CLINIC & DOCTOR DETAILS:
Doctor Name: Dr. ${appt.doctor_name}
Department: ${appt.specialization || 'General'}
Consultation Date: ${appt.date}
Consultation Time: ${appt.time_slot.substring(0, 5)}

BILLING SUMMARY:
--------------------------------------------------
Description                       Amount
--------------------------------------------------
Doctor Consultation Fee           ₹250.00
Platform & Booking Fees           ₹0.00
Tax / GST (Included)              ₹0.00
--------------------------------------------------
TOTAL PAID:                       ₹250.00
--------------------------------------------------
Payment Method: ${appt.payment_method || 'UPI'}
Transaction Reference: TXN-${Math.floor(100000 + Math.random() * 900000)}

Thank you for choosing MedIntel. 
For support: support@medintel.com
--------------------------------------------------
`;

    const element = document.createElement("a");
    const file = new Blob([docText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Invoice_INV-${appt.id}.txt`;
    document.body.appendChild(element);
    element.click();
    showToast('Invoice receipt downloaded successfully!', 'success');
  };

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-6 overflow-y-auto max-h-screen">
      
      {/* ----------------- PAGE HEADER ----------------- */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200/50 dark:border-slate-800/50">
        <div>
          <h2 className="text-xl font-bold text-slate-850 dark:text-slate-100 uppercase tracking-wide">
            {tab === 'overview' && 'Dashboard Overview'}
            {tab === 'search' && 'Book Appointments'}
            {tab === 'appointments' && 'Manage Appointments'}
            {tab === 'history' && 'Appointment History'}
            {tab === 'predict-disease' && 'AI Disease Prediction'}
            {tab === 'prescriptions' && 'My Prescriptions'}
            {tab === 'reports' && 'Medical Reports'}

          </h2>
          <p className="text-slate-400 dark:text-slate-500 text-xs">Patient Dashboard Workspace</p>
        </div>

      </div>

      {/* ----------------- OVERVIEW TAB ----------------- */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* 1. WELCOME SECTION */}
          <div className="p-6 bg-gradient-to-r from-primary-600/90 to-indigo-600/90 dark:from-primary-950/60 dark:to-indigo-950/60 text-white rounded-3xl shadow-md border border-primary-500/20 backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-black">
                Welcome, {user?.username || 'Patient'}! 👋
              </h2>
              <p className="text-xs text-primary-100/95 font-medium mt-1">
                Stay healthy! You're making great progress.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-primary-200">Current Date</span>
              <p className="text-sm font-bold mt-0.5">{new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
            </div>
          </div>

          {/* 2. HEALTH SUMMARY CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: 'Upcoming Visits',
                count: appointments.filter(a => a.status === 'Approved' || a.status === 'Pending').length,
                desc: 'Scheduled consultations',
                icon: Calendar,
                color: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-450 dark:border-blue-900/40',
                path: '/patient/appointments'
              },
              {
                title: 'Active Prescriptions',
                count: prescriptions.length,
                desc: 'Digital courses issued',
                icon: FileText,
                color: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-450 dark:border-indigo-900/40',
                path: '/patient/prescriptions'
              },
              {
                title: 'Medical Reports',
                count: reports.length,
                desc: 'Lab analyses processed',
                icon: Upload,
                color: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-450 dark:border-amber-900/40',
                path: '/patient/reports'
              },
              {
                title: 'Health Score',
                count: (() => {
                  let score = 85;
                  if (adherenceReport && adherenceReport.adherence_percentage) {
                    score = Math.round((score + parseInt(adherenceReport.adherence_percentage)) / 2);
                  }
                  const abnormalReports = reports.filter(r => {
                    if (r.ocr_results) {
                      return Object.values(r.ocr_results).some(m => m.status !== 'Normal');
                    }
                    return false;
                  });
                  score = Math.max(45, score - (abnormalReports.length * 5));
                  return `${score}`;
                })(),
                desc: 'Calculated health score',
                icon: Heart,
                color: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/40',
                path: '/dashboard'
              }
            ].map((card, idx) => (
              <div
                key={idx}
                onClick={() => navigate(card.path)}
                className={`p-4 border rounded-3xl shadow-sm bg-white dark:bg-slate-900 flex justify-between items-center cursor-pointer transition-all duration-300 hover:scale-[1.02] ${card.color}`}
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{card.title}</span>
                  <h3 className="text-xl font-black mt-1">{card.count}</h3>
                  <p className="text-[9px] mt-0.5 opacity-70 font-medium">{card.desc}</p>
                </div>
                <div className="p-3 rounded-2xl bg-white/40 dark:bg-black/20">
                  <card.icon className="w-5 h-5" />
                </div>
              </div>
            ))}
          </div>

          {/* 7. QUICK ACTIONS GRID */}
          <div className="bg-white/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800 p-5 rounded-3xl shadow-sm backdrop-blur-md">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Quick Actions Portal</h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {[
                { name: 'Book Consult', icon: Calendar, path: '/patient/search', color: 'text-blue-600 bg-blue-50/50 hover:bg-blue-100/50 dark:bg-blue-950/20 dark:text-blue-450' },
                { name: 'Upload Report', icon: Upload, path: '/patient/reports', color: 'text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100/50 dark:bg-indigo-950/20 dark:text-indigo-450' },
                { name: 'Symptom Checker', icon: Brain, path: '/patient/predict-disease', color: 'text-rose-600 bg-rose-50/50 hover:bg-rose-100/50 dark:bg-rose-950/20 dark:text-rose-450' },
                { name: 'Prescriptions', icon: FileText, path: '/patient/prescriptions', color: 'text-amber-600 bg-amber-50/50 hover:bg-amber-100/50 dark:bg-amber-950/20 dark:text-amber-450' },
                { name: 'Meds Tracker', icon: Activity, path: '/patient/medications', color: 'text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100/50 dark:bg-emerald-950/20 dark:text-emerald-400' },
                { name: 'Chat Follow-up', icon: MessageSquare, path: '/patient/chat', color: 'text-sky-600 bg-sky-50/50 hover:bg-sky-100/50 dark:bg-sky-950/20 dark:text-sky-400' }
              ].map(action => (
                <button
                  key={action.name}
                  type="button"
                  onClick={() => navigate(action.path)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-300 transform hover:-translate-y-1 ${action.color}`}
                >
                  <action.icon className="w-5 h-5 mb-1.5" />
                  <span className="text-[10px] font-bold uppercase text-center leading-tight tracking-wider">{action.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 3. TODAY'S SCHEDULE (CHRONOLOGICAL) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl shadow-sm lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary-500" /> Today's Schedule
                </h3>
                <span className="px-2.5 py-0.5 bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400 rounded-full text-xs font-bold border border-primary-100 dark:border-primary-900/40">
                  {(() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const apptsCount = appointments.filter(a => a.date === todayStr).length;
                    const medsCount = todaySchedules.filter(s => s.status === 'Pending').length;
                    return apptsCount + medsCount;
                  })()} Pending
                </span>
              </div>

              <div className="relative border-l-2 border-slate-100 dark:border-slate-800 pl-4 ml-2 space-y-4 max-h-[360px] overflow-y-auto pr-1">
                {(() => {
                  const schedule = [];
                  const todayStr = new Date().toISOString().split('T')[0];
                  
                  // Add appointments today
                  appointments.filter(a => a.date === todayStr).forEach(appt => {
                    schedule.push({
                      time: appt.time_slot.substring(0, 5),
                      title: `Consult with Dr. ${appt.doctor_name}`,
                      subtitle: `${appt.specialization} appointment`,
                      type: 'appt',
                      status: appt.status,
                      actionPath: '/patient/appointments'
                    });
                  });

                  // Add today's medicines
                  todaySchedules.forEach(dose => {
                    schedule.push({
                      time: dose.scheduled_time.substring(0, 5),
                      title: `Take Dose: ${dose.medicine_name}`,
                      subtitle: `Status: ${dose.status}`,
                      type: 'medicine',
                      status: dose.status,
                      actionPath: '/patient/medications'
                    });
                  });

                  // If empty
                  if (schedule.length === 0) {
                    return <p className="text-slate-400 text-center py-12 text-sm italic">Your schedule is empty for today.</p>;
                  }

                  // Sort chronologically
                  return schedule.sort((a, b) => a.time.localeCompare(b.time)).map((item, idx) => (
                    <div key={idx} className="relative group">
                      {/* Timeline dot */}
                      <span className="absolute -left-[21px] top-1.5 w-3.5 h-3.5 bg-primary-500 rounded-full border-2 border-white dark:border-slate-900 group-hover:scale-125 transition-transform"></span>
                      
                      <div className="p-3 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 flex justify-between items-center gap-3">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 px-2 py-0.5 rounded-lg">{item.time}</span>
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-1.5">{item.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{item.subtitle}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(item.actionPath)}
                          className="py-1 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-650 dark:text-slate-300 font-bold text-[10px] rounded-lg uppercase tracking-wider"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* 4. MEDICINE TRACKER */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-500" /> Medicine Tracker
                  </h3>
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-450 rounded-full text-xs font-bold">
                    {todaySchedules.filter(s => s.status === 'Pending').length} Left Today
                  </span>
                </div>

                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {todaySchedules.map(dose => (
                    <div key={dose.id} className="p-3 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 flex justify-between items-center gap-2 text-xs">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-250">{dose.medicine_name}</p>
                        <p className="text-[10px] text-slate-450 mt-0.5">Time: {dose.scheduled_time.substring(0, 5)}</p>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full uppercase ${
                          dose.status === 'Taken' ? 'bg-emerald-100 text-emerald-700' :
                          dose.status === 'Missed' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>{dose.status}</span>
                        {dose.status === 'Pending' && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await medicationAPI.takeDose(dose.id);
                                showToast('Dose recorded as Taken!', 'success');
                                loadAllData();
                              } catch (e) {
                                showToast('Failed to record dose', 'error');
                              }
                            }}
                            className="p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg"
                            title="Mark Taken"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {todaySchedules.length === 0 && (
                    <p className="text-slate-400 text-center py-8 text-xs italic">No medicines scheduled for today.</p>
                  )}
                </div>
              </div>

              {/* Progress bars & compliance ratings */}
              <div className="border-t border-slate-150 dark:border-slate-800 pt-4 mt-4 space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-450">
                  <span>Weekly compliance</span>
                  <span className="text-primary-500 font-extrabold">{adherenceReport ? adherenceReport.adherence_percentage : 100}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary-500 h-1.5 rounded-full"
                    style={{ width: `${adherenceReport ? adherenceReport.adherence_percentage : 100}%` }}
                  ></div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/patient/medications')}
                  className="w-full mt-2 py-2 bg-primary-600 hover:bg-primary-700 text-white text-[10px] font-bold rounded-xl uppercase transition-colors"
                >
                  Configure Schedule
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 5. AI HEALTH INSIGHTS */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl shadow-sm lg:col-span-2 space-y-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-500" /> AI-Generated Health Insights
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(() => {
                  const insights = [];
                  
                  // Low compliance alert
                  if (adherenceReport && parseFloat(adherenceReport.adherence_percentage) < 80) {
                    insights.push({
                      title: 'Medication Non-Compliance',
                      desc: `Your compliance rating is ${adherenceReport.adherence_percentage}%. Missing doses regularly increases clinical risks. Your assigned doctor has been notified.`,
                      severity: 'High Warning',
                      color: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/40'
                    });
                  } else {
                    insights.push({
                      title: 'Medication Adherence Stable',
                      desc: 'Great job! Your current course adherence remains above the required clinical thresholds. Continue taking all medicines as prescribed.',
                      severity: 'Low',
                      color: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40'
                    });
                  }

                  // High sugar insights from metrics
                  const recentSugar = healthMetrics.length > 0 ? healthMetrics[healthMetrics.length - 1].blood_sugar : null;
                  if (recentSugar && recentSugar > 140) {
                    insights.push({
                      title: 'Abnormal Glucose Warning',
                      desc: `Your recent sugar metric is ${recentSugar} mg/dL, which is elevated. Limit simple carbohydrates and consult with your consultant doctor.`,
                      severity: 'Medium',
                      color: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40'
                    });
                  } else {
                    insights.push({
                      title: 'Metabolic Balance Optimal',
                      desc: 'Recent health metrics show blood sugar and glucose indicators within normal ranges. Suggest maintaining your current balanced dietary patterns.',
                      severity: 'Low',
                      color: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40'
                    });
                  }

                  return insights.map((ins, idx) => (
                    <div key={idx} className={`p-4 border rounded-2xl flex flex-col justify-between ${ins.color}`}>
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-xs">{ins.title}</span>
                          <span className="px-2 py-0.5 bg-white/40 dark:bg-black/20 text-[9px] uppercase font-black rounded-lg">{ins.severity}</span>
                        </div>
                        <p className="text-[10px] mt-2 leading-relaxed font-medium opacity-90">{ins.desc}</p>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* 10. EMERGENCY INFORMATION CARD */}
            <div className="bg-gradient-to-br from-red-500/10 to-rose-600/10 dark:from-red-950/30 dark:to-rose-950/30 border border-red-200/50 dark:border-red-900/40 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-red-700 dark:text-red-400 flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 animate-pulse" /> Emergency Information Card
                </h3>

                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between border-b border-red-200/30 dark:border-red-900/30 pb-2">
                    <span className="text-slate-400 dark:text-slate-500 font-semibold">Blood Group</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{user?.profile?.blood_group || 'A+'}</span>
                  </div>
                  <div className="flex justify-between border-b border-red-200/30 dark:border-red-900/30 pb-2">
                    <span className="text-slate-400 dark:text-slate-500 font-semibold">Emergency Helpline</span>
                    <span className="font-bold text-red-650 dark:text-red-400">+91 99999 88800</span>
                  </div>
                  <div className="flex justify-between border-b border-red-200/30 dark:border-red-900/30 pb-2">
                    <span className="text-slate-400 dark:text-slate-500 font-semibold">Primary Contact</span>
                    <span className="font-bold text-slate-850 dark:text-slate-200">{user?.profile?.emergency_contact || '+91 98765 43210'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 font-semibold block mb-1">Known Allergies</span>
                    <p className="text-[11px] font-bold text-red-600 dark:text-red-300 leading-snug">{user?.profile?.allergies || 'None reported'}</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEmergencyModalOpen(true)}
                className="w-full mt-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-xl uppercase tracking-wider transition-colors"
              >
                Update Details
              </button>
            </div>
          </div>

          {/* 8. HEALTH TREND CHARTS & 6. RECENT MEDICAL REPORTS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Health Trend Charts */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl shadow-sm lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary-500" /> Health Trends
                </h3>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsLogMetricModalOpen(true)}
                    className="py-1 px-3 bg-primary-600 hover:bg-primary-700 text-white text-[10px] font-bold rounded-xl uppercase tracking-wider mr-2"
                  >
                    Log Metric
                  </button>
                  <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-[9px] font-bold">
                    {['weekly', 'monthly', 'yearly'].map(tf => (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => setMetricsTimeframe(tf)}
                        className={`px-2.5 py-1 rounded-md uppercase transition-all ${
                          metricsTimeframe === tf
                            ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-800 dark:text-slate-100'
                            : 'text-slate-400 hover:text-slate-650'
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Render custom line charts dynamically */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderSVGChart('Systolic BP (mmHg)', 'systolic', 'text-indigo-500', 90, 160)}
                {renderSVGChart('Blood Glucose (mg/dL)', 'blood_sugar', 'text-amber-500', 70, 180)}
                {renderSVGChart('Heart Rate (bpm)', 'heart_rate', 'text-rose-500', 60, 100)}
                {renderSVGChart('Body Weight (kg)', 'weight', 'text-emerald-500', 50, 120)}
              </div>
            </div>

            {/* Recent Medical Reports */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <FileText className="w-5 h-5 text-indigo-500" /> Recent Reports
                </h3>

                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {reports.slice(0, 3).map(rep => (
                    <div key={rep.id} className="p-3 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-slate-800 dark:text-slate-200 text-xs leading-snug">{rep.title}</p>
                        <span className="text-[9px] text-slate-450 font-bold whitespace-nowrap">{new Date(rep.created_at).toLocaleDateString(undefined, { dateStyle: 'short' })}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-[9px] font-bold">
                        <span className="text-slate-400 uppercase">Analysis:</span>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-lg uppercase">Completed</span>
                      </div>

                      <div className="flex justify-end gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-850">
                        <button
                          type="button"
                          onClick={() => setSelectedReport(rep)}
                          className="py-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 text-indigo-650 dark:text-indigo-400 font-bold text-[9px] rounded-lg uppercase"
                        >
                          View Report
                        </button>
                      </div>
                    </div>
                  ))}
                  {reports.length === 0 && (
                    <p className="text-slate-400 text-center py-12 text-xs italic">No reports uploaded yet.</p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/patient/reports')}
                className="w-full mt-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-xl uppercase transition-colors"
              >
                Manage Reports
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- SEARCH DOCTORS TAB ----------------- */}
      {tab === 'search' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-4 rounded-3xl shadow-sm flex flex-col md:flex-row gap-3">
            <div className="flex-1 flex items-center gap-2 px-3 border-r border-slate-100 dark:border-slate-800">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by specialization (e.g. Cardiology, Pediatrics)..."
                value={specQuery}
                onChange={(e) => setSpecQuery(e.target.value)}
                className="w-full bg-transparent border-none text-sm focus:ring-0 focus:outline-none text-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="flex-1 flex items-center gap-2 px-3">
              <MapPin className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by city (e.g. Mumbai, Pune)..."
                value={locQuery}
                onChange={(e) => setLocQuery(e.target.value)}
                className="w-full bg-transparent border-none text-sm focus:ring-0 focus:outline-none text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {doctors.map((doc) => (
              <div key={doc.id} className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-lg">
                      Dr
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
                        Dr. {doc.username}
                        {doc.is_verified && (
                          <span className="p-0.5 bg-emerald-500 text-white rounded-full text-[6px]" title="Verified Specialist">
                            ✓
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-primary-500 font-semibold">{doc.specialization}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4">
                    <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {doc.location}</p>
                    <p className="flex items-center gap-2"><Info className="w-3.5 h-3.5 text-slate-400" /> {doc.experience} Years Experience</p>
                    <p className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-slate-400" /> {doc.qualification}</p>
                    {doc.google_maps_link && (
                      <a 
                        href={doc.google_maps_link} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-primary-600 hover:underline block font-semibold mt-1"
                      >
                        🗺️ View Clinic Location Map
                      </a>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedDoctor(doc);
                    setBookingStep(1);
                    setChiefComplaint('');
                    setBookingDate('');
                    setSelectedSlot('');
                    setBookingModal(true);
                  }}
                  className="w-full mt-6 py-2.5 bg-primary-600 hover:bg-primary-705 text-white text-xs font-bold rounded-2xl uppercase transition-colors"
                >
                  Book Slot
                </button>


              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------- APPOINTMENTS PORTAL ----------------- */}
      {tab === 'appointments' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="p-4">Doctor</th>
                <th className="p-4">Date</th>
                <th className="p-4">Time</th>
                <th className="p-4">Status</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {appointments.map((appt) => (
                <tr key={appt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                  <td className="p-4 font-bold text-slate-800 dark:text-slate-200">Dr. {appt.doctor_name}</td>
                  <td className="p-4 text-slate-500">{appt.date}</td>
                  <td className="p-4 text-slate-500">{appt.time_slot.substring(0, 5)}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      appt.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                      appt.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                      appt.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {appt.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      appt.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {appt.payment_status}
                    </span>
                  </td>
                  <td className="p-4 flex gap-2">
                    {appt.payment_status === 'Paid' && (
                      <button
                        onClick={() => downloadBillPDF(appt)}
                        className="py-1 px-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-xl uppercase hover:bg-emerald-100 flex items-center gap-1 border border-emerald-100 dark:border-emerald-900/40"
                        title="Download Bill Receipt"
                      >
                        🧾 Bill
                      </button>
                    )}
                    {appt.status === 'Approved' && (
                      <button
                        onClick={() => {
                          setRescheduleTargetAppt(appt);
                          setRescheduleModal(true);
                        }}
                        className="py-1 px-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl uppercase hover:bg-indigo-100"
                      >
                        Reschedule
                      </button>
                    )}
                    {appt.status === 'Pending' && (
                      <button
                        onClick={async () => {
                          try {
                            await appointmentAPI.updateAppointment(appt.id, { status: 'Cancelled' });
                            showToast('Appointment cancelled successfully', 'warning');
                            loadAllData();
                          } catch (e) {
                            showToast('Cancellation failed', 'error');
                          }
                        }}
                        className="py-1 px-3 border border-red-200 text-red-650 text-xs font-bold rounded-xl uppercase hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {appointments.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-400 text-sm">No scheduled appointments.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ----------------- AI DISEASE PREDICTION TAB ----------------- */}

      {tab === 'predict-disease' && (
        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-8 rounded-3xl shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary-500" /> AI Symptoms Diagnostics
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Search & Add Symptoms</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. cough, high fever, stomach pain..."
                  value={symptomsInput}
                  onChange={(e) => setSymptomsInput(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              {symptomsInput && (
                <div className="mt-2 max-h-40 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl divide-y bg-white dark:bg-slate-900 text-sm">
                  {availableSymptomsList.filter(s => s.toLowerCase().includes(symptomsInput.toLowerCase()) && !selectedSymptoms.includes(s)).map(s => (
                    <button
                      key={s}
                      onClick={() => {
                        setSelectedSymptoms([...selectedSymptoms, s]);
                        setSymptomsInput('');
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      + {s.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              )}

            </div>

            {selectedSymptoms.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedSymptoms.map(s => (
                  <span key={s} className="px-3 py-1 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-primary-200/50">
                    {s.replace(/_/g, ' ')}
                    <button onClick={() => setSelectedSymptoms(selectedSymptoms.filter(item => item !== s))} className="hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Age</label>
                <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Gender</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent dark:bg-slate-900 focus:outline-none">
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Blood Pressure</label>
                <select value={bp} onChange={(e) => setBp(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent dark:bg-slate-900 focus:outline-none">
                  <option>Normal</option>
                  <option>Low</option>
                  <option>High</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sugar Levels</label>
                <select value={sugar} onChange={(e) => setSugar(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent dark:bg-slate-900 focus:outline-none">
                  <option>Normal</option>
                  <option>Pre-Diabetic</option>
                  <option>High</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleDiseasePrediction}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-xs uppercase"
            >
              Analyze symptoms
            </button>

            {predictionResult && (
              <div className="border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl bg-slate-50/50 dark:bg-slate-900/60 space-y-5 mt-6 shadow-sm">
                
                {/* 1. Header & Confidence */}
                <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Diagnostic Diagnosis</span>
                    <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg">{predictionResult.disease}</h4>
                  </div>
                  <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/60 text-primary-700 dark:text-primary-300 text-xs font-extrabold rounded-full border border-primary-200 dark:border-primary-800">
                    {predictionResult.confidence}% confidence
                  </span>
                </div>

                {/* 2. Risk Level & Urgency Badge */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Risk Level & Urgency Assessment</p>
                  <div className="flex items-center gap-2">
                    {predictionResult.urgency === 'high' && (
                      <div className="w-full p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-2xl flex items-center justify-between text-xs text-red-700 dark:text-red-300 font-bold">
                        <span className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
                          Risk Score: <span className="underline decoration-2">{predictionResult.risk_level}</span>
                        </span>
                        <span className="px-2.5 py-0.5 bg-red-600 text-white rounded-full text-[10px] uppercase font-black">Emergency Attention Required</span>
                      </div>
                    )}
                    {predictionResult.urgency === 'moderate' && (
                      <div className="w-full p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 font-bold">
                        <span className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                          Risk Score: <span className="underline decoration-2">{predictionResult.risk_level}</span>
                        </span>
                        <span className="px-2.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px] uppercase font-black">Urgent Care Advised</span>
                      </div>
                    )}
                    {predictionResult.urgency === 'low' && (
                      <div className="w-full p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                        <span className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-500" />
                          Risk Score: <span className="underline decoration-2">{predictionResult.risk_level}</span>
                        </span>
                        <span className="px-2.5 py-0.5 bg-emerald-600 text-white rounded-full text-[10px] uppercase font-black">Routine Care</span>
                      </div>
                    )}
                    {(predictionResult.urgency === 'varies' || !['high', 'moderate', 'low'].includes(predictionResult.urgency)) && (
                      <div className="w-full p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-2xl flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 font-bold">
                        <span className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-blue-500" />
                          Risk Score: <span className="underline decoration-2">{predictionResult.risk_level}</span>
                        </span>
                        <span className="px-2.5 py-0.5 bg-blue-600 text-white rounded-full text-[10px] uppercase font-black">Variable Risk</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Recommended Specialist / Department */}
                <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 rounded-2xl flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Recommended Specialist / Department</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                      {predictionResult.doctor || predictionResult.specialist || 'General Medicine'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSpecQuery(predictionResult.doctor || predictionResult.specialist || '');
                      navigate('/patient/search');
                    }}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <Search className="w-3.5 h-3.5" /> Consult Doctor
                  </button>
                </div>

                {/* 4. Actionable Care & Home Remedies */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Actionable Care & Home Remedies</p>
                  <ul className="space-y-2">
                    {predictionResult.cures && predictionResult.cures.map((cure, idx) => (
                      <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5 bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-2xs">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="font-medium">{cure}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {/* 4b. Matched & Missing Symptoms */}
                {predictionResult.matched_symptoms && predictionResult.matched_symptoms.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-2xl">
                      <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">✓ Matched Symptoms</p>
                      <div className="flex flex-wrap gap-1.5">
                        {predictionResult.matched_symptoms.map((s, i) => (
                          <span key={i} className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-200 dark:border-emerald-800/40">{s}</span>
                        ))}
                      </div>
                    </div>
                    {predictionResult.missing_symptoms && predictionResult.missing_symptoms.length > 0 && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800 rounded-2xl">
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">○ Also Associated With</p>
                        <div className="flex flex-wrap gap-1.5">
                          {predictionResult.missing_symptoms.map((s, i) => (
                            <span key={i} className="px-2 py-0.5 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-semibold rounded-full border border-slate-200 dark:border-slate-700">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4c. Top 5 Differential Diagnoses */}
                {predictionResult.predictions && predictionResult.predictions.length > 1 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Top Differential Diagnoses</p>
                    <div className="space-y-2">
                      {predictionResult.predictions.map((pred, idx) => (
                        <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border text-xs ${idx === 0 ? 'bg-primary-50 dark:bg-primary-950/30 border-primary-100 dark:border-primary-900/40' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[9px] font-black flex-shrink-0 ${idx === 0 ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{idx + 1}</span>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{pred.disease}</p>
                              <p className="text-[9px] text-slate-400 font-medium">{pred.doctor} · {pred.urgency} risk</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-primary-500 dark:bg-primary-400 rounded-full" style={{width: `${Math.min(pred.confidence, 100)}%`}}></div>
                            </div>
                            <span className={`font-black text-[11px] ${idx === 0 ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500'}`}>{pred.confidence}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Disclaimer Notice */}
                <div className="p-3 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-xl text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
                  <span>{predictionResult.disclaimer}</span>
                </div>

              </div>
            )}

          </div>
        </div>
      )}



      {/* ----------------- PRESCRIPTION VIEWER TAB ----------------- */}
      {tab === 'prescriptions' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" /> Digital Prescription Locker
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">View and download your digital prescriptions from verified doctors</p>
            </div>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300 text-xs font-bold rounded-xl border border-indigo-100 dark:border-indigo-900/40">
              {prescriptions.length} Prescriptions
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prescriptions.map((presc) => (
              <div key={presc.id} className="p-5 border border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/40 dark:bg-slate-950/30 space-y-3 flex flex-col justify-between shadow-2xs hover:shadow-sm transition-all">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-850 dark:text-slate-100 text-base">Dr. {presc.doctor_name}</h4>
                      <p className="text-[11px] font-medium text-slate-400">Issued on {new Date(presc.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                    </div>
                    <button 
                      onClick={() => downloadPrescriptionPDF(presc)}
                      className="p-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/50 rounded-2xl transition-colors border border-indigo-100 dark:border-indigo-900/40 flex items-center gap-1 text-xs font-bold"
                      title="Download Prescription Receipt"
                    >
                      <Download className="w-4 h-4" /> Download
                    </button>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 text-xs">
                    <p className="font-bold text-slate-400 uppercase text-[9px]">Diagnosed Symptoms</p>
                    <p className="text-slate-700 dark:text-slate-300 font-medium mt-0.5">{presc.symptoms}</p>
                  </div>

                  <div>
                    <p className="font-bold text-slate-400 uppercase text-[9px] mb-1.5">Prescribed Medicines ({presc.medicines.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {presc.medicines.map((m, idx) => (
                        <span key={idx} className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl shadow-2xs">
                          💊 {m.name} <span className="text-indigo-600 dark:text-indigo-400 font-bold ml-1">({m.dosage})</span>
                          {m.duration && (
                            <span className="ml-1.5 px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-400 rounded-md text-[10px]">
                              ⏱️ {m.duration}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {prescriptions.length === 0 && (
              <div className="col-span-2 text-slate-400 text-center py-16 text-sm border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                No prescriptions found in your digital locker yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- LAB REPORTS OCR TAB ----------------- */}
      {tab === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary-500" /> Upload Report
              </h3>
              
              <form onSubmit={handleReportUpload} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hemoglobin Blood Scan"
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">File</label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setReportFile(e.target.files[0])}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary-50 file:text-primary-700"
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploadingReport}
                  className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-xs uppercase"
                >
                  {uploadingReport ? 'Running OCR Scan...' : 'Analyze Report'}
                </button>
              </form>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl shadow-sm col-span-2 space-y-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Medical Reports & Analytics</h3>

              <div className="grid grid-cols-2 gap-4">
                {reports.map((rep) => (
                  <div
                    key={rep.id}
                    onClick={() => setSelectedReport(rep)}
                    className={`p-4 border rounded-2xl cursor-pointer transition-all ${
                      selectedReport?.id === rep.id
                        ? 'border-primary-500 bg-primary-50/10'
                        : 'border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <p className="font-bold text-slate-800 dark:text-slate-200">{rep.title}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">Uploaded {new Date(rep.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>

              {selectedReport && (
                <div className="border-t border-slate-100 pt-6 mt-6 space-y-4 text-xs">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Extracted Metrics Analysis</h4>
                  {selectedReport.ocr_results && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(selectedReport.ocr_results).map(([key, info]) => (
                        <div key={key} className="p-3 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20">
                          <p className="text-[9px] uppercase text-slate-400">{key.replace(/_/g, ' ')}</p>
                          <p className="text-base font-bold text-slate-850 dark:text-slate-100 mt-1">{info.value}</p>
                          <span className={`inline-block px-1.5 py-0.5 text-[8px] font-bold rounded-full uppercase mt-1 ${
                            info.status === 'Normal' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-650'
                          }`}>
                            {info.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2 border-t border-slate-100 pt-4 leading-relaxed">
                    <p><b>Summary:</b> {selectedReport.explanation}</p>
                    <p><b>Recommendations:</b> {selectedReport.recommendations}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}



      {/* ----------------- MEDICATIONS TAB ----------------- */}
      {tab === 'medications' && (
        <div className="space-y-6">
          {/* Sub-tabs Navigation */}
          <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            {[
              { id: 'schedule', label: '📅 Today\'s Schedule' },
              { id: 'active', label: '💊 Current Medicines' },
              { id: 'history', label: '⏳ Medication History' },
              { id: 'adherence', label: '📊 Adherence Report' }
            ].map(subTab => (
              <button
                key={subTab.id}
                onClick={() => setMedsSubTab(subTab.id)}
                className={`px-4 py-2 text-xs font-bold uppercase rounded-xl transition-all ${
                  medsSubTab === subTab.id
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                {subTab.label}
              </button>
            ))}
          </div>

          {/* Today's Schedule View */}
          {medsSubTab === 'schedule' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Today's Dose Schedule</h3>
                  <p className="text-xs text-slate-400">Record and track your medicine doses for today</p>
                </div>
                <span className="px-3 py-1 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 text-xs font-bold rounded-xl">
                  {todaySchedules.filter(s => s.status === 'Pending').length} Pending Doses
                </span>
              </div>

              {todaySchedules.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {todaySchedules.sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time)).map(dose => (
                    <div key={dose.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-250">{dose.medicine_name}</span>
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            dose.status === 'Taken' ? 'bg-emerald-100 text-emerald-750' :
                            dose.status === 'Missed' ? 'bg-red-100 text-red-750' :
                            dose.status === 'Skipped' ? 'bg-slate-100 text-slate-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>{dose.status}</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          ⏱️ Scheduled Time: <b>{dose.scheduled_time.substring(0, 5)}</b>
                          {dose.taken_at && ` · Taken at: ${new Date(dose.taken_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        {dose.status === 'Pending' && (
                          <button
                            onClick={() => handleTakeDose(dose.id)}
                            className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl uppercase transition-colors"
                          >
                            Take Now
                          </button>
                        )}
                        {dose.status === 'Taken' && (
                          <button
                            onClick={() => handleUndoDose(dose.id)}
                            className="py-1.5 px-4 border border-slate-200 dark:border-slate-700 text-slate-650 dark:text-slate-400 font-bold text-xs rounded-xl uppercase hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            Undo
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 italic">No doses scheduled for today. Check your prescriptions.</div>
              )}
            </div>
          )}

          {/* Current Medicines View */}
          {medsSubTab === 'active' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Current Medications</h3>
                <p className="text-xs text-slate-400">All your active medication courses prescribed by verified doctors</p>
              </div>

              {activeMedicines.filter(m => m.status === 'Active').length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeMedicines.filter(m => m.status === 'Active').map(med => {
                    const start = new Date(med.start_date);
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    start.setHours(0,0,0,0);
                    const diffTime = Math.abs(today - start);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
                    const passedDays = Math.max(1, Math.min(diffDays, med.duration));
                    const progressPercent = Math.round((passedDays / med.duration) * 100);

                    return (
                      <div key={med.id} className="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 space-y-4 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{med.name}</h4>
                              <p className="text-[10px] text-slate-400">Strength: {med.strength || 'N/A'} · {med.frequency}</p>
                            </div>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 text-[9px] font-extrabold rounded-full uppercase">
                              Active
                            </span>
                          </div>

                          <div className="text-xs text-slate-650 dark:text-slate-400 space-y-1">
                            <p>👨‍⚕️ Prescribed by: <b>Dr. {med.doctor_name}</b></p>
                            <p>📅 Course: <b>{med.start_date}</b> to <b>{med.end_date}</b></p>
                            <p>📝 Instructions: <span className="italic">{med.instructions || 'Take as advised'}</span></p>
                          </div>

                          {/* Progress bar */}
                          <div className="space-y-1 pt-2">
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                              <span>Day {passedDays} of {med.duration}</span>
                              <span>{progressPercent}% Complete</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div className="bg-primary-600 h-full rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => setSelectedMedicineDetails(med)}
                            className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl uppercase transition-colors"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 italic">No active medications.</div>
              )}
            </div>
          )}

          {/* History View */}
          {medsSubTab === 'history' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Past &amp; Completed Medications</h3>
                <p className="text-xs text-slate-400">View details of your past and expired medicine courses</p>
              </div>

              {activeMedicines.filter(m => m.status !== 'Active').length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeMedicines.filter(m => m.status !== 'Active').map(med => (
                    <div key={med.id} className="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-955/40 space-y-4 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{med.name}</h4>
                            <p className="text-[10px] text-slate-400">Strength: {med.strength || 'N/A'} · {med.frequency}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                            med.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                            med.status === 'Expired' ? 'bg-slate-105 text-slate-700' :
                            'bg-red-100 text-red-700'
                          }`}>{med.status}</span>
                        </div>

                        <div className="text-xs text-slate-650 dark:text-slate-400 space-y-1">
                          <p>👨‍⚕️ Prescribed by: <b>Dr. {med.doctor_name}</b></p>
                          <p>📅 Course: <b>{med.start_date}</b> to <b>{med.end_date}</b></p>
                          <p>🎯 Adherence Rate: <b>{med.adherence_percentage}%</b></p>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={() => setSelectedMedicineDetails(med)}
                          className="w-full py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl uppercase hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 italic">No medication history found.</div>
              )}
            </div>
          )}

          {/* Adherence Report View */}
          {medsSubTab === 'adherence' && adherenceReport && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Score card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col justify-between items-center text-center">
                <div className="w-full">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Overall Adherence Score</h3>
                  <p className="text-xs text-slate-400 mb-6">Percentage of successfully taken medication doses</p>
                </div>

                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="8" fill="transparent" />
                    <circle cx="50" cy="50" r="42" stroke="currentColor" className="text-primary-600" strokeWidth="8" fill="transparent"
                      strokeDasharray="264"
                      strokeDashoffset={264 - (264 * adherenceReport.adherence_percentage) / 100}
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-3xl font-black text-slate-800 dark:text-white">{adherenceReport.adherence_percentage}%</span>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
                      adherenceReport.adherence_label === 'Excellent' ? 'text-emerald-600' :
                      adherenceReport.adherence_label === 'Good' ? 'text-indigo-650' :
                      'text-red-500'
                    }`}>{adherenceReport.adherence_label}</p>
                  </div>
                </div>

                <div className="w-full mt-6 p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl text-[11px] text-slate-500 dark:text-slate-400">
                  Adherence is rated <b>{adherenceReport.adherence_label}</b> based on your records.
                </div>
              </div>

              {/* Statistics Breakdown */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl shadow-sm col-span-2 space-y-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-800">Dose Statistics Breakdown</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-150/40 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Total Scheduled Doses</span>
                    <h4 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{adherenceReport.total_scheduled_doses}</h4>
                  </div>
                  <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">Taken Doses</span>
                    <h4 className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">{adherenceReport.taken_doses}</h4>
                  </div>
                  <div className="p-4 bg-red-50/40 dark:bg-red-950/10 rounded-2xl border border-red-100 dark:border-red-900/40">
                    <span className="text-[10px] font-bold text-red-550 uppercase">Missed Doses</span>
                    <h4 className="text-2xl font-black text-red-650 dark:text-red-450 mt-1">{adherenceReport.missed_doses}</h4>
                  </div>
                  <div className="p-4 bg-slate-100/60 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Skipped Doses</span>
                    <h4 className="text-2xl font-black text-slate-600 dark:text-slate-450 mt-1">{adherenceReport.skipped_doses}</h4>
                  </div>
                </div>

                <div className="p-4 bg-primary-50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/40 rounded-2xl text-xs text-primary-700 dark:text-primary-400">
                  💡 <b>Tip:</b> Keep logging your medication intake daily to maintain an accurate health log.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ----------------- MEDICATION DETAILS MODAL ----------------- */}
      {selectedMedicineDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2.5 py-0.5 bg-primary-50 text-primary-650 dark:bg-primary-950/40 dark:text-primary-400 rounded-full text-[10px] font-extrabold uppercase border border-primary-150/50">
                  {selectedMedicineDetails.status}
                </span>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1.5">{selectedMedicineDetails.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Medication Course Details</p>
              </div>
              <button
                onClick={() => setSelectedMedicineDetails(null)}
                className="p-1.5 hover:bg-slate-105 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-650"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-955/40 border border-slate-150/40 dark:border-slate-800 rounded-2xl">
                <span className="block text-[9px] font-bold text-slate-400 uppercase">Strength</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedMedicineDetails.strength || 'N/A'}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-955/40 border border-slate-150/40 dark:border-slate-800 rounded-2xl">
                <span className="block text-[9px] font-bold text-slate-400 uppercase">Dosage</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedMedicineDetails.dosage}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-955/40 border border-slate-150/40 dark:border-slate-800 rounded-2xl">
                <span className="block text-[9px] font-bold text-slate-400 uppercase">Frequency</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedMedicineDetails.frequency}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-955/40 border border-slate-150/40 dark:border-slate-800 rounded-2xl">
                <span className="block text-[9px] font-bold text-slate-400 uppercase">Duration</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedMedicineDetails.duration} Days</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-955/40 border border-slate-150/40 dark:border-slate-800 rounded-2xl">
                <span className="block text-[9px] font-bold text-slate-400 uppercase">Start Date</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedMedicineDetails.start_date}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-955/40 border border-slate-150/40 dark:border-slate-800 rounded-2xl">
                <span className="block text-[9px] font-bold text-slate-400 uppercase">End Date</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedMedicineDetails.end_date}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-955/40 border border-slate-150/40 dark:border-slate-800 rounded-2xl">
                <span className="block text-[9px] font-bold text-slate-400 uppercase">Meal Timing</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedMedicineDetails.meal_timing || 'Any Time'}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-955/40 border border-slate-150/40 dark:border-slate-800 rounded-2xl">
                <span className="block text-[9px] font-bold text-slate-400 uppercase">Prescribing Doctor</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">Dr. {selectedMedicineDetails.doctor_name}</p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Doctor Instructions</span>
              <div className="p-4 bg-slate-50/50 dark:bg-slate-950 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 text-xs italic text-slate-700 dark:text-slate-300">
                "{selectedMedicineDetails.instructions || 'Take as advised'}"
              </div>
            </div>

            <button
              onClick={() => setSelectedMedicineDetails(null)}
              className="w-full py-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl text-xs font-bold uppercase transition-colors"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* ----------------- BOOKING MODAL (2-step) ----------------- */}
      {bookingModal && selectedDoctor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">

            {/* Modal header with step indicator */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {bookingStep === 1 ? 'Schedule Consultation' : 'Choose Payment Method'}
                </h3>
                <p className="text-xs text-primary-600 mt-0.5">Dr. {selectedDoctor.username} · {selectedDoctor.specialization}</p>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${bookingStep === 1 ? 'bg-primary-600 text-white' : 'bg-emerald-100 text-emerald-700'}`}>1</span>
                <div className="w-5 h-0.5 bg-slate-200 dark:bg-slate-700" />
                <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${bookingStep === 2 ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>2</span>
              </div>
            </div>

            {/* STEP 1 */}
            {bookingStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Select Date</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={bookingDate}
                    onChange={(e) => { setBookingDate(e.target.value); checkSlots(e.target.value); }}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>

                {bookingDate && (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Available Slots</label>
                    <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto border border-slate-100 dark:border-slate-800 p-2 rounded-xl">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-2 text-xs font-bold rounded-xl transition-all ${
                            selectedSlot === slot
                              ? 'bg-primary-600 text-white shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                      {availableSlots.length === 0 && (
                        <p className="col-span-3 text-center text-red-500 font-bold text-xs py-4">No available timeslots.</p>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Chief Complaint <span className="text-red-500">*</span></label>
                  <textarea
                    rows={3}
                    placeholder="Briefly describe your main symptoms or reason for visit…"
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setBookingModal(false); setBookingStep(1); setChiefComplaint(''); setBookingDate(''); setSelectedSlot(''); }}
                    className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold uppercase hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!selectedSlot || !chiefComplaint.trim()}
                    onClick={() => setBookingStep(2)}
                    className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl text-xs font-bold uppercase disabled:opacity-40 transition-all"
                  >
                    Next: Payment →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {bookingStep === 2 && (
              <div className="space-y-5">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Date &amp; Time</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{bookingDate} · {selectedSlot}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 gap-2">
                    <span className="shrink-0">Chief Complaint</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-right">{chiefComplaint}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-700 pt-2 mt-1">
                    <span className="text-slate-500">Consultation Fee</span>
                    <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">₹250.00</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-3">Select Payment Method</label>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { id: 'UPI', icon: '📱', label: 'UPI / QR Code', desc: 'PhonePe, GPay, Paytm, BHIM' },
                      { id: 'Card', icon: '💳', label: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay' },
                      { id: 'Hospital', icon: '🏥', label: 'Pay at Hospital', desc: 'Cash or card at the reception' },
                    ].map(({ id, icon, label, desc }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setBookingPaymentMethod(id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-all ${
                          bookingPaymentMethod === id
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-2xl">{icon}</span>
                        <div className="flex-1">
                          <p className={`text-sm font-bold ${bookingPaymentMethod === id ? 'text-primary-700 dark:text-primary-300' : 'text-slate-800 dark:text-slate-200'}`}>{label}</p>
                          <p className="text-[11px] text-slate-400">{desc}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          bookingPaymentMethod === id ? 'border-primary-600 bg-primary-600' : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {bookingPaymentMethod === id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setBookingStep(1)}
                    className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold uppercase hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    disabled={bookingLoading}
                    onClick={() => handleBookAppt({ preventDefault: () => {} })}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold uppercase disabled:opacity-50 transition-all"
                  >
                    {bookingLoading ? 'Confirming...' : bookingPaymentMethod === 'Hospital' ? 'Confirm Booking' : 'Confirm & Pay ₹250'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ----------------- RESCHEDULE MODAL ----------------- */}
      {rescheduleModal && rescheduleTargetAppt && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Reschedule Appointment</h3>
              <p className="text-xs text-primary-600">Updating visit with Dr. {rescheduleTargetAppt.doctor_name}</p>
            </div>

            <form onSubmit={handleRescheduleAppt} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">New Date</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={rescheduleDate}
                  onChange={(e) => {
                    setRescheduleDate(e.target.value);
                    checkRescheduleSlots(e.target.value);
                  }}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none"
                />
              </div>

              {rescheduleDate && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Available Slots</label>
                  <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto border border-slate-100 dark:border-slate-800 p-2 rounded-xl">
                    {rescheduleSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setRescheduleSelectedSlot(slot)}
                        className={`py-2 text-xs font-bold rounded-xl transition-all ${
                          rescheduleSelectedSlot === slot
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-650'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                    {rescheduleSlots.length === 0 && (
                      <p className="col-span-3 text-center text-red-500 font-bold text-xs py-4">No available timeslots.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setRescheduleModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold uppercase hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!rescheduleSelectedSlot || rescheduleLoading}
                  className="flex-1 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold uppercase disabled:opacity-50 transition-opacity"
                >
                  {rescheduleLoading ? 'Rescheduling...' : 'Reschedule Slot'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ----------------- PAYMENT MODAL ----------------- */}
      {pendingPaymentAppt && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Consultation Fee Checkout</h3>
              <p className="text-xs text-slate-400">Dr. {pendingPaymentAppt.doctor_name}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center border border-slate-100">
              <span className="text-sm text-slate-500">Consultation Fee</span>
              <span className="text-lg font-bold text-slate-900">₹250.00</span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {['UPI', 'Card', 'Cash'].map(method => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 text-xs font-bold rounded-xl transition-all border ${
                      paymentMethod === method
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-600'
                        : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => setPendingPaymentAppt(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-2xl text-xs font-bold uppercase hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckoutPayment}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold uppercase"
              >
                Pay Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- FOLLOW-UP CHAT TAB ----------------- */}
      {tab === 'chat' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex h-[580px]">
          {/* Doctors List Panel (Left Side) */}
          <div className="w-1/3 border-r border-slate-100 dark:border-slate-800 flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Consulted Doctors</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Select a doctor to start follow-up chat</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {appointments.filter((v, i, a) => a.findIndex(t => t.doctor === v.doctor) === i).map(appt => {
                const isSelected = chatPartner && chatPartner.id === appt.doctor;
                return (
                  <button
                    key={appt.doctor}
                    type="button"
                    onClick={() => {
                      setChatPartner({
                        id: appt.doctor,
                        user: appt.doctor_user_id || appt.doctor,
                        name: appt.doctor_name,
                        specialization: appt.specialization
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
                      <h4 className="font-bold text-xs">Dr. {appt.doctor_name}</h4>
                      <p className="text-[9px] text-slate-400 mt-0.5">{appt.specialization}</p>
                    </div>
                  </button>
                );
              })}
              {appointments.length === 0 && (
                <p className="text-[11px] text-slate-400 italic text-center py-12">No consulted doctors found.</p>
              )}
            </div>
          </div>

          {/* Active Chat Conversation Panel (Right Side) */}
          <div className="flex-1 flex flex-col justify-between bg-slate-50/20 dark:bg-slate-950/10">
            {chatPartner ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Dr. {chatPartner.name}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">{chatPartner.specialization} · Secure Channel</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      chatAPI.getMessages(chatPartner.user).then(res => setChatMessages(res.data));
                      showToast('Chat history reloaded', 'success');
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
                    <div className="text-center py-20 text-slate-450 italic text-xs">
                      No messages yet. Start follow-up consultation with Dr. {chatPartner.name}.
                    </div>
                  )}
                </div>

                {/* Input Footer */}
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
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:ring-0 focus:outline-none text-slate-800 dark:text-slate-205"
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
                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">No Chat Selected</h4>
                <p className="text-[11px] mt-1 text-slate-400 text-center max-w-xs">Select your consultant specialist from the left panel to begin.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- LOG MEDICAL METRIC MODAL ----------------- */}
      {isLogMetricModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleLogMetric} className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Log Daily Health Metrics</h3>
              <p className="text-xs text-slate-400">Track weight, blood pressure, sugar &amp; heart rate trends</p>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-450 font-bold mb-1 uppercase text-[9px]">Body Weight (kg)</label>
                <input
                  type="number" step="0.1" value={newHealthWeight} onChange={e => setNewHealthWeight(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-xl p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none"
                  placeholder="e.g. 70.2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-455 font-bold mb-1 uppercase text-[9px]">Systolic BP (mmHg)</label>
                  <input
                    type="number" value={newHealthSystolic} onChange={e => setNewHealthSystolic(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-xl p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none"
                    placeholder="e.g. 120"
                  />
                </div>
                <div>
                  <label className="block text-slate-455 font-bold mb-1 uppercase text-[9px]">Diastolic BP (mmHg)</label>
                  <input
                    type="number" value={newHealthDiastolic} onChange={e => setNewHealthDiastolic(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-xl p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none"
                    placeholder="e.g. 80"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-455 font-bold mb-1 uppercase text-[9px]">Blood Glucose (mg/dL)</label>
                <input
                  type="number" value={newHealthSugar} onChange={e => setNewHealthSugar(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-xl p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none"
                  placeholder="e.g. 95"
                />
              </div>
              <div>
                <label className="block text-slate-455 font-bold mb-1 uppercase text-[9px]">Heart Rate (bpm)</label>
                <input
                  type="number" value={newHealthHeart} onChange={e => setNewHealthHeart(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-xl p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none"
                  placeholder="e.g. 72"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                type="button" onClick={() => setIsLogMetricModalOpen(false)}
                className="flex-1 py-2 border border-slate-250 rounded-xl text-xs font-bold uppercase hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 text-slate-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold uppercase"
              >
                Log Metric
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ----------------- EDIT EMERGENCY INFO MODAL ----------------- */}
      {isEmergencyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveEmergencyInfo} className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Update Emergency Information Card</h3>
              <p className="text-xs text-slate-400">These details are immediately synchronized with your assigned doctor's EHR workspace.</p>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-455 font-bold mb-1 uppercase text-[9px]">Emergency contact phone number</label>
                <input
                  type="text" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-xl p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none"
                  placeholder="+91 98765 43210"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-455 font-bold mb-1 uppercase text-[9px]">Blood Group</label>
                <select
                  value={emergencyBlood} onChange={e => setEmergencyBlood(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-xl p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-455 font-bold mb-1 uppercase text-[9px]">Known Allergies &amp; Health Conditions</label>
                <textarea
                  value={emergencyAllergies} onChange={e => setEmergencyAllergies(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-xl p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none h-24 resize-none"
                  placeholder="e.g. Penicillin, Peanuts, Asthma (Please list all or write None)"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                type="button" onClick={() => setIsEmergencyModalOpen(false)}
                className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-bold uppercase hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 text-slate-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase"
              >
                Save Details
              </button>
            </div>
          </form>
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
export default PatientDashboard;
