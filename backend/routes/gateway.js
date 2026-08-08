const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sendNotificationEmail } = require('../utils/mailer');

const DJANGO_URL = process.env.DJANGO_URL || 'http://127.0.0.1:8000';

// Multer Upload configuration
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// JWT Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token invalid or expired' });
    req.user = user;
    next();
  });
}

// Role Authorization Middleware
function requireRole(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }
    next();
  };
}

// Helper to push a notification into Django
async function createNotification(userId, message, type = 'info') {
  try {
    await axios.post(`${DJANGO_URL}/api/notifications/`, {
      user: userId,
      message,
      type
    });
  } catch (error) {
    console.error('Failed to create notification:', error.message);
  }
}

// ----------------------------------------------------
// Doctors Endpoints
// ----------------------------------------------------
router.get('/doctors', authenticateToken, async (req, res) => {
  try {
    const specialization = req.query.specialization;
    const location = req.query.location;
    const url = `${DJANGO_URL}/api/doctors/search/?specialization=${specialization || ''}&location=${location || ''}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/doctors/all', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`${DJANGO_URL}/api/doctors/`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Doctor Profile / Availability
router.put('/doctors/:id', authenticateToken, requireRole(['Doctor', 'Admin']), async (req, res) => {
  try {
    const response = await axios.patch(`${DJANGO_URL}/api/doctors/${req.params.id}/`, req.body);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// ----------------------------------------------------
// Patients Endpoints
// ----------------------------------------------------
router.get('/patients', authenticateToken, requireRole(['Doctor', 'Admin']), async (req, res) => {
  try {
    const response = await axios.get(`${DJANGO_URL}/api/patients/`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/patients/profile', authenticateToken, requireRole(['Patient']), async (req, res) => {
  try {
    const patientsRes = await axios.get(`${DJANGO_URL}/api/patients/`);
    const patient = patientsRes.data.find(p => p.user === req.user.id);
    if (!patient) return res.status(404).json({ error: 'Patient profile not found' });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/patients/:id', authenticateToken, requireRole(['Patient', 'Admin']), async (req, res) => {
  try {
    const response = await axios.patch(`${DJANGO_URL}/api/patients/${req.params.id}/`, req.body);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// ----------------------------------------------------
// Appointments Endpoints
// ----------------------------------------------------
router.get('/appointments/slots', authenticateToken, async (req, res) => {
  try {
    const { doctor, date } = req.query;
    const response = await axios.get(`${DJANGO_URL}/api/appointments/slots/?doctor=${doctor}&date=${date}`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/appointments', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`${DJANGO_URL}/api/appointments/`);
    let data = response.data;
    if (req.user.role === 'Patient') {
      // Find patient profile first
      const patientsRes = await axios.get(`${DJANGO_URL}/api/patients/`);
      const patient = patientsRes.data.find(p => p.user === req.user.id);
      data = data.filter(a => a.patient === patient.id);
    } else if (req.user.role === 'Doctor') {
      // Find doctor profile first
      const doctorsRes = await axios.get(`${DJANGO_URL}/api/doctors/`);
      const doctor = doctorsRes.data.find(d => d.user === req.user.id);
      data = data.filter(a => a.doctor === doctor.id);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Book appointment
router.post('/appointments', authenticateToken, requireRole(['Patient']), async (req, res) => {
  try {
    const patientsRes = await axios.get(`${DJANGO_URL}/api/patients/`);
    const patient = patientsRes.data.find(p => p.user === req.user.id);
    if (!patient) return res.status(404).json({ error: 'Patient profile not found' });

    const { doctor, date, time_slot, chief_complaint, payment_method } = req.body;

    // ── Past date/time validation ─────────────────────────────────────────
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD in UTC
    // Convert to IST for comparison (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const istTodayStr = istNow.toISOString().split('T')[0];
    const istNowHHMM = istNow.toISOString().substring(11, 16); // HH:MM in IST

    if (date < istTodayStr) {
      return res.status(400).json({ error: 'Cannot book an appointment for a past date.' });
    }
    if (date === istTodayStr) {
      const slotHHMM = (time_slot || '').substring(0, 5);
      if (slotHHMM <= istNowHHMM) {
        return res.status(400).json({ error: `The selected time slot (${slotHHMM}) has already passed. Please choose a future time slot.` });
      }
    }
    // ─────────────────────────────────────────────────────────────────────

    // Check availability
    const slotsRes = await axios.get(`${DJANGO_URL}/api/appointments/slots/?doctor=${doctor}&date=${date}`);
    if (slotsRes.data.is_leave) {
      return res.status(400).json({ error: 'This doctor is not available on the selected date.' });
    }
    if (slotsRes.data.booked_slots.includes(time_slot.substring(0, 5))) {
      return res.status(400).json({ error: 'This time slot is already booked' });
    }

    const apptRes = await axios.post(`${DJANGO_URL}/api/appointments/`, {
      patient: patient.id,
      doctor,
      date,
      time_slot,
      status: 'Pending',
      payment_status: payment_method && payment_method !== 'Hospital' ? 'Paid' : 'Pending',
      payment_method: payment_method || null,
      chief_complaint: chief_complaint || null
    });

    const appointment = apptRes.data;

    // Fetch doctor info to send notification safely
    try {
      const docProfileRes = await axios.get(`${DJANGO_URL}/api/doctors/${doctor}/`);
      const docUserRes = await axios.get(`${DJANGO_URL}/api/users/${docProfileRes.data.user}/`);
      const docName = docUserRes.data.username || 'Doctor';

      // Notify patient & doctor
      await createNotification(req.user.id, `Appointment request submitted for Dr. ${docName} on ${date} at ${time_slot}`, 'info');
      await createNotification(docUserRes.data.id, `New appointment request from ${req.user.username} for ${date} at ${time_slot}`, 'alert');

      // Email Notification
      await sendNotificationEmail({
        to: req.user.email,
        subject: 'MedIntel Appointment Booked - Pending Confirmation',
        html: `<p>Your appointment request with Dr. ${docName} on <b>${date} at ${time_slot}</b> is booked. It is currently pending confirmation from the doctor.</p>`
      }).catch(e => console.error('[Email Fail]:', e.message));
    } catch (notifErr) {
      console.warn('[Notification Fail]:', notifErr.message);
    }

    res.status(201).json(appointment);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Book follow-up appointment (Doctor)
router.post('/appointments/followup', authenticateToken, requireRole(['Doctor']), async (req, res) => {
  try {
    const { doctor, patient, date, time_slot, note } = req.body;

    const apptRes = await axios.post(`${DJANGO_URL}/api/appointments/`, {
      patient,
      doctor,
      date,
      time_slot: time_slot || '10:00:00',
      status: 'Approved',
      payment_status: 'Pending',
      payment_method: 'Hospital',
      chief_complaint: note || 'Follow-up consultation'
    });

    const appointment = apptRes.data;

    // Notify patient
    try {
      const patientProfile = await axios.get(`${DJANGO_URL}/api/patients/${patient}/`);
      const patientUserId = patientProfile.data.user;
      
      const docProfileRes = await axios.get(`${DJANGO_URL}/api/doctors/${doctor}/`);
      const docUserRes = await axios.get(`${DJANGO_URL}/api/users/${docProfileRes.data.user}/`);
      const docName = docUserRes.data.username || 'Doctor';

      await createNotification(patientUserId, `Dr. ${docName} scheduled a follow-up appointment for you on ${date} at ${time_slot || '10:00'}`, 'info');
      
      // Email Notification
      const patientUserRes = await axios.get(`${DJANGO_URL}/api/users/${patientUserId}/`);
      await sendNotificationEmail({
        to: patientUserRes.data.email,
        subject: 'Follow-up Appointment Scheduled by Doctor',
        html: `<p>Dr. ${docName} has scheduled a follow-up appointment for you on <b>${date} at ${time_slot || '10:00'}</b>.</p>`
      }).catch(e => console.error('[Email Fail]:', e.message));
    } catch (notifErr) {
      console.warn('[Notification Fail]:', notifErr.message);
    }

    res.status(201).json(appointment);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Update appointment status (Doctor/Admin: Approve/Reject/Reschedule/Complete/Cancel)
router.put('/appointments/:id', authenticateToken, async (req, res) => {
  try {
    const apptDetails = await axios.get(`${DJANGO_URL}/api/appointments/${req.params.id}/`);
    const appointment = apptDetails.data;

    // Check permissions
    const doctorsRes = await axios.get(`${DJANGO_URL}/api/doctors/`);
    const doctor = doctorsRes.data.find(d => d.user === req.user.id);
    const patientsRes = await axios.get(`${DJANGO_URL}/api/patients/`);
    const patient = patientsRes.data.find(p => p.user === req.user.id);

    if (req.user.role === 'Doctor' && appointment.doctor !== doctor?.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.user.role === 'Patient' && appointment.patient !== patient?.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { status, date, time_slot, not_visited } = req.body;
    const patchData = {};
    if (status) patchData.status = status;
    if (date) patchData.date = date;
    if (time_slot) patchData.time_slot = time_slot;
    if (not_visited !== undefined) patchData.not_visited = not_visited;

    const response = await axios.patch(`${DJANGO_URL}/api/appointments/${req.params.id}/`, patchData);
    const updatedAppt = response.data;

    // Retrieve details for email notifications safely
    try {
      const pProfile = await axios.get(`${DJANGO_URL}/api/patients/${appointment.patient}/`);
      const pUser = await axios.get(`${DJANGO_URL}/api/users/${pProfile.data.user}/`);
      const dProfile = await axios.get(`${DJANGO_URL}/api/doctors/${appointment.doctor}/`);
      const dUser = await axios.get(`${DJANGO_URL}/api/users/${dProfile.data.user}/`);
      const doctorName = dUser.data.username || 'Doctor';

      // Send notifications based on state change
      if (status === 'Approved') {
        await createNotification(pUser.data.id, `Your appointment with Dr. ${doctorName} has been approved.`, 'success');
        await sendNotificationEmail({
          to: pUser.data.email,
          subject: 'MedIntel Appointment Approved',
          html: `<p>Your appointment with Dr. ${doctorName} on <b>${updatedAppt.date} at ${updatedAppt.time_slot}</b> has been approved!</p>`
        }).catch(e => console.error('[Email Fail]:', e.message));
      } else if (status === 'Cancelled') {
        await createNotification(pUser.data.id, `Your appointment with Dr. ${doctorName} has been cancelled.`, 'warning');
        await createNotification(dUser.data.id, `Appointment with ${pUser.data.username} has been cancelled.`, 'warning');
        await sendNotificationEmail({
          to: pUser.data.email,
          subject: 'MedIntel Appointment Cancelled',
          html: `<p>Your appointment with Dr. ${doctorName} on <b>${updatedAppt.date} at ${updatedAppt.time_slot}</b> has been cancelled.</p>`
        }).catch(e => console.error('[Email Fail]:', e.message));
      }
    } catch (notifErr) {
      console.warn('[Notification Fail]:', notifErr.message);
    }

    res.json(updatedAppt);

  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// ----------------------------------------------------
// Prescriptions Endpoints
// ----------------------------------------------------
router.get('/prescriptions', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`${DJANGO_URL}/api/prescriptions/`);
    let data = response.data;
    if (req.user.role === 'Patient') {
      const patientsRes = await axios.get(`${DJANGO_URL}/api/patients/`);
      const patient = patientsRes.data.find(p => p.user === req.user.id);
      if (patient) {
        const apptsRes = await axios.get(`${DJANGO_URL}/api/appointments/`);
        const patientApptIds = apptsRes.data.filter(a => a.patient === patient.id).map(a => a.id);
        data = data.filter(p => patientApptIds.includes(p.appointment) || p.patient_name === req.user.username);
      } else {
        data = data.filter(p => p.patient_name === req.user.username);
      }
    } else if (req.user.role === 'Doctor') {
      const doctorsRes = await axios.get(`${DJANGO_URL}/api/doctors/`);
      const doctor = doctorsRes.data.find(d => d.user === req.user.id);
      if (doctor) {
        const apptsRes = await axios.get(`${DJANGO_URL}/api/appointments/`);
        const doctorApptIds = apptsRes.data.filter(a => a.doctor === doctor.id).map(a => a.id);
        data = data.filter(p => doctorApptIds.includes(p.appointment) || p.doctor_name === req.user.username);
      } else {
        data = data.filter(p => p.doctor_name === req.user.username);
      }
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post('/prescriptions', authenticateToken, requireRole(['Doctor']), async (req, res) => {
  try {
    const { appointment, symptoms, medicines, pdf_url } = req.body;
    
    // Auto-mark appointment as Completed if creating prescription
    const apptDetails = await axios.get(`${DJANGO_URL}/api/appointments/${appointment}/`);
    if (apptDetails.data.status !== 'Completed') {
      await axios.patch(`${DJANGO_URL}/api/appointments/${appointment}/`, { status: 'Completed' });
    }

    const response = await axios.post(`${DJANGO_URL}/api/prescriptions/`, {
      appointment,
      symptoms,
      medicines,
      pdf_url
    });

    const prescription = response.data;

    // Notify patient safely
    try {
      const pProfile = await axios.get(`${DJANGO_URL}/api/patients/${apptDetails.data.patient}/`);
      const pUser = await axios.get(`${DJANGO_URL}/api/users/${pProfile.data.user}/`);
      await createNotification(pUser.data.id, `Dr. ${req.user.username} uploaded a new prescription for your visit.`, 'success');
      
      await sendNotificationEmail({
        to: pUser.data.email,
        subject: 'New Prescription Uploaded - MedIntel',
        html: `<p>A new prescription has been generated for your appointment on ${apptDetails.data.date}. You can now view and download the PDF from your patient portal.</p>`
      }).catch(e => console.error('[Email Fail]:', e.message));
    } catch (notifErr) {
      console.warn('[Notification Fail]:', notifErr.message);
    }

    res.status(201).json(prescription);

  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// ----------------------------------------------------
// Confidential Reports Endpoints
// ----------------------------------------------------
router.get('/reports', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`${DJANGO_URL}/api/reports/`);
    let data = response.data;
    
    // Security check: Only uploading doctor, concerned patient, and admin can access
    if (req.user.role === 'Patient') {
      const patientsRes = await axios.get(`${DJANGO_URL}/api/patients/`);
      const patient = patientsRes.data.find(p => p.user === req.user.id);
      data = data.filter(r => r.patient === patient.id);
    } else if (req.user.role === 'Doctor') {
      const doctorsRes = await axios.get(`${DJANGO_URL}/api/doctors/`);
      const doctor = doctorsRes.data.find(d => d.user === req.user.id);
      data = data.filter(r => r.doctor === doctor.id);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reports', authenticateToken, upload.single('reportFile'), async (req, res) => {
  try {
    const { title, patient_id } = req.body;
    let filePath = '';
    if (req.file) {
      filePath = req.file.path.replace(/\\/g, '/');
    }

    let doctorId = null;
    if (req.user.role === 'Doctor') {
      const doctorsRes = await axios.get(`${DJANGO_URL}/api/doctors/`);
      const doctor = doctorsRes.data.find(d => d.user === req.user.id);
      doctorId = doctor?.id;
    }

    const reportRes = await axios.post(`${DJANGO_URL}/api/reports/`, {
      patient: patient_id,
      doctor: doctorId,
      title,
      file_url: filePath,
      ocr_results: {},
      summary: '',
      doctor_summary: '',
      explanation: '',
      recommendations: ''
    });

    const report = reportRes.data;

    // Run OCR automatically
    const ocrRun = await axios.post(`${DJANGO_URL}/api/reports/${report.id}/process_ocr/`);
    const finalReport = ocrRun.data;

    // Notify patient
    const pProfile = await axios.get(`${DJANGO_URL}/api/patients/${patient_id}/`);
    const pUser = await axios.get(`${DJANGO_URL}/api/users/${pProfile.data.user}/`);
    await createNotification(pUser.data.id, `A new medical report "${title}" has been uploaded & analyzed.`, 'info');
    
    await sendNotificationEmail({
      to: pUser.data.email,
      subject: 'New Medical Report Uploaded - MedIntel',
      html: `<p>Your medical report <b>"${title}"</b> has been securely uploaded and analyzed using MedIntel OCR AI. You can view your health summary on the dashboard.</p>`
    });

    res.status(201).json(finalReport);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// ----------------------------------------------------
// Payments & Receipts Endpoints
// ----------------------------------------------------
router.get('/payments', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`${DJANGO_URL}/api/payments/`);
    let data = response.data;
    if (req.user.role === 'Patient') {
      data = data.filter(p => p.patient_name === req.user.username);
    } else if (req.user.role === 'Doctor') {
      data = data.filter(p => p.doctor_name === req.user.username);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/payments/checkout', authenticateToken, requireRole(['Patient']), async (req, res) => {
  const { appointment_id, amount, method } = req.body;
  try {
    const transactionId = 'TXN-' + Math.floor(100000000 + Math.random() * 900000000);
    
    // Create payment in Django
    const payRes = await axios.post(`${DJANGO_URL}/api/payments/`, {
      appointment: appointment_id,
      amount,
      method,
      status: 'Success',
      transaction_id: transactionId
    });

    // Update appointment payment status
    await axios.patch(`${DJANGO_URL}/api/appointments/${appointment_id}/`, {
      payment_status: 'Paid'
    });

    // Notify patient
    await createNotification(req.user.id, `Payment of ₹${amount} successful for appointment #${appointment_id}.`, 'success');
    
    await sendNotificationEmail({
      to: req.user.email,
      subject: 'Payment Successful - MedIntel Receipt',
      html: `
        <h3>Payment Receipt</h3>
        <p>Thank you for your payment!</p>
        <ul>
          <li><b>Transaction ID:</b> ${transactionId}</li>
          <li><b>Amount:</b> ₹${amount}</li>
          <li><b>Method:</b> ${method}</li>
          <li><b>Status:</b> Success</li>
        </ul>
      `
    });

    res.status(201).json(payRes.data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// ----------------------------------------------------
// Symptom Logging & Disease/Health Risk Prediction
// ----------------------------------------------------
router.get('/symptoms', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`${DJANGO_URL}/api/symptoms/`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/symptoms/history', authenticateToken, requireRole(['Patient']), async (req, res) => {

  try {
    const patientsRes = await axios.get(`${DJANGO_URL}/api/patients/`);
    const patient = patientsRes.data.find(p => p.user === req.user.id);
    if (!patient) return res.status(404).json({ error: 'Patient profile not found' });
    
    const response = await axios.get(`${DJANGO_URL}/api/symptom-logs/`);
    const logs = response.data.filter(l => l.patient === patient.id);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/symptoms/predict-disease', authenticateToken, requireRole(['Patient']), async (req, res) => {
  const { symptoms, age, gender, bp, sugar, bmi, family_history, lifestyle } = req.body;
  try {
    const patientsRes = await axios.get(`${DJANGO_URL}/api/patients/`);
    const patient = patientsRes.data.find(p => p.user === req.user.id);

    // Save symptom log
    await axios.post(`${DJANGO_URL}/api/symptom-logs/`, {
      patient: patient.id,
      symptoms,
      age,
      gender,
      bp,
      sugar,
      bmi,
      family_history,
      lifestyle
    });

    // Run prediction in Django
    const response = await axios.post(`${DJANGO_URL}/api/predict/disease/`, { symptoms });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

router.post('/symptoms/predict-health-risk', authenticateToken, requireRole(['Patient']), async (req, res) => {
  const { history } = req.body;
  try {
    const response = await axios.post(`${DJANGO_URL}/api/predict/health-risk/`, { history });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// ----------------------------------------------------
// Notifications Endpoints
// ----------------------------------------------------
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`${DJANGO_URL}/api/notifications/`);
    const userNotifications = response.data.filter(n => n.user === req.user.id);
    res.json(userNotifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const response = await axios.patch(`${DJANGO_URL}/api/notifications/${req.params.id}/`, {
      is_read: true
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Admin Management APIs
// ----------------------------------------------------
router.get('/admin/users', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const usersRes = await axios.get(`${DJANGO_URL}/api/users/`);
    res.json(usersRes.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/users/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const response = await axios.patch(`${DJANGO_URL}/api/users/${req.params.id}/`, req.body);
    const updatedUser = response.data;
    
    if (req.body.is_verified === false) {
      await sendNotificationEmail({
        to: updatedUser.email,
        subject: 'MedIntel Account Status Update - Suspended',
        html: `<h2>Account Suspended</h2><p>Dear ${updatedUser.username},</p><p>Your MedIntel account has been suspended by the administrator. You will not be able to log in. Please contact support if you believe this is an error.</p>`
      });
    } else if (req.body.is_verified === true) {
      await sendNotificationEmail({
        to: updatedUser.email,
        subject: 'MedIntel Account Status Update - Reactivated',
        html: `<h2>Account Reactivated</h2><p>Dear ${updatedUser.username},</p><p>Your MedIntel account has been reactivated. You can now log in to the portal.</p>`
      });
    }

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/users/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    await axios.delete(`${DJANGO_URL}/api/users/${req.params.id}/`);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Medication Tracking Endpoints
// ----------------------------------------------------
router.get('/prescribed-medicines', authenticateToken, async (req, res) => {
  try {
    let patientId = req.query.patient;
    if (req.user.role === 'Patient') {
      const patientsRes = await axios.get(`${DJANGO_URL}/api/patients/`);
      const patient = patientsRes.data.find(p => p.user === req.user.id);
      if (!patient) return res.status(404).json({ error: 'Patient profile not found' });
      patientId = patient.id;
    }
    
    let url = `${DJANGO_URL}/api/prescribed-medicines/`;
    const params = [];
    if (patientId) params.push(`patient=${patientId}`);
    if (req.query.doctor) params.push(`doctor=${req.query.doctor}`);
    if (req.query.status) params.push(`status=${req.query.status}`);
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    
    const response = await axios.get(url);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/prescribed-medicines/:id/stop', authenticateToken, requireRole(['Doctor', 'Admin']), async (req, res) => {
  try {
    const response = await axios.post(`${DJANGO_URL}/api/prescribed-medicines/${req.params.id}/stop/`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

router.post('/prescribed-medicines/:id/extend', authenticateToken, requireRole(['Doctor', 'Admin']), async (req, res) => {
  try {
    const response = await axios.post(`${DJANGO_URL}/api/prescribed-medicines/${req.params.id}/extend/`, req.body);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

router.get('/prescribed-medicines/adherence', authenticateToken, async (req, res) => {
  try {
    let patientId = req.query.patient;
    if (req.user.role === 'Patient') {
      const patientsRes = await axios.get(`${DJANGO_URL}/api/patients/`);
      const patient = patientsRes.data.find(p => p.user === req.user.id);
      if (!patient) return res.status(404).json({ error: 'Patient profile not found' });
      patientId = patient.id;
    }
    if (!patientId) {
      return res.status(400).json({ error: 'patient parameter required' });
    }
    const response = await axios.get(`${DJANGO_URL}/api/prescribed-medicines/adherence_report/?patient=${patientId}`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/medication-schedules', authenticateToken, async (req, res) => {
  try {
    let patientId = req.query.patient;
    if (req.user.role === 'Patient') {
      const patientsRes = await axios.get(`${DJANGO_URL}/api/patients/`);
      const patient = patientsRes.data.find(p => p.user === req.user.id);
      if (!patient) return res.status(404).json({ error: 'Patient profile not found' });
      patientId = patient.id;
    }
    
    let url = `${DJANGO_URL}/api/medication-schedules/`;
    const params = [];
    if (patientId) params.push(`patient=${patientId}`);
    if (req.query.date) params.push(`date=${req.query.date}`);
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    
    const response = await axios.get(url);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/medication-schedules/:id/take', authenticateToken, requireRole(['Patient']), async (req, res) => {
  try {
    const response = await axios.post(`${DJANGO_URL}/api/medication-schedules/${req.params.id}/mark_taken/`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

router.post('/medication-schedules/:id/undo', authenticateToken, requireRole(['Patient']), async (req, res) => {
  try {
    const response = await axios.post(`${DJANGO_URL}/api/medication-schedules/${req.params.id}/undo_taken/`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// ----------------------------------------------------
// Health Metrics Endpoints
// ----------------------------------------------------
router.get('/health-metrics', authenticateToken, async (req, res) => {
  try {
    let patientId = req.query.patient;
    if (req.user.role === 'Patient') {
      const patientsRes = await axios.get(`${DJANGO_URL}/api/patients/`);
      const patient = patientsRes.data.find(p => p.user === req.user.id);
      if (!patient) return res.status(404).json({ error: 'Patient profile not found' });
      patientId = patient.id;
    }
    const response = await axios.get(`${DJANGO_URL}/api/health-metrics/?patient=${patientId || ''}`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/health-metrics', authenticateToken, requireRole(['Patient']), async (req, res) => {
  try {
    const patientsRes = await axios.get(`${DJANGO_URL}/api/patients/`);
    const patient = patientsRes.data.find(p => p.user === req.user.id);
    if (!patient) return res.status(404).json({ error: 'Patient profile not found' });
    
    const response = await axios.post(`${DJANGO_URL}/api/health-metrics/`, {
      ...req.body,
      patient: patient.id
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// ----------------------------------------------------
// Follow-up Chat Endpoints
// ----------------------------------------------------
router.get('/chat-messages', authenticateToken, async (req, res) => {
  try {
    const { partner } = req.query;
    const response = await axios.get(`${DJANGO_URL}/api/chat-messages/?user=${req.user.id}&partner=${partner || ''}`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/chat-messages', authenticateToken, async (req, res) => {
  try {
    const response = await axios.post(`${DJANGO_URL}/api/chat-messages/`, {
      ...req.body,
      sender: req.user.id
    });
    
    // Create notification for receiver
    try {
      const receiverUser = await axios.get(`${DJANGO_URL}/api/users/${req.body.receiver}/`);
      if (receiverUser.data) {
        await createNotification(
          req.body.receiver,
          `New chat message from ${req.user.username}`,
          'chat'
        );
      }
    } catch (notifErr) {
      console.warn('[Chat Notif Fail]:', notifErr.message);
    }
    
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

router.post('/chat-messages/mark-read', authenticateToken, async (req, res) => {
  try {
    const { partner } = req.body;
    const response = await axios.post(`${DJANGO_URL}/api/chat-messages/mark_read/`, {
      sender: partner,
      receiver: req.user.id
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Upload endpoint for chat attachments
router.post('/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

module.exports = router;


