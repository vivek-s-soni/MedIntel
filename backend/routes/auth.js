const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { sendNotificationEmail } = require('../utils/mailer');

const DJANGO_URL = process.env.DJANGO_URL || 'http://127.0.0.1:8000';

// Register User
router.post('/register', async (req, res) => {
  const { username, email, password, role, ...profileData } = req.value || req.body;
  
  if (!username || !email || !password || !role) {
    return res.status(400).json({ error: 'Please provide all required fields' });
  }

  try {
    // Check if user already exists
    let existingUser;
    try {
      const response = await axios.post(`${DJANGO_URL}/api/users/login_check/`, { email });
      existingUser = response.data;
    } catch (e) {
      // User doesn't exist, which is expected
    }

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Create user in Django
    const djangoUserRes = await axios.post(`${DJANGO_URL}/api/users/`, {
      username,
      email,
      password_hash: passwordHash,
      role,
      is_verified: true, // Auto-verified for development
      verification_token: verificationToken
    });

    const createdUser = djangoUserRes.data;

    // Create role-specific profiles
    if (role === 'Doctor') {
      await axios.post(`${DJANGO_URL}/api/doctors/`, {
        user: createdUser.id,
        specialization: profileData.specialization || 'General',
        location: profileData.location || 'Default Location',
        experience: profileData.experience || 0,
        qualification: profileData.qualification || 'MBBS',
        clinic_address: profileData.clinic_address || 'Clinic Address',
        contact_number: profileData.contact_number || '0000000000',
        google_maps_link: profileData.google_maps_link || 'https://maps.google.com',
        is_verified: true // Auto-verified for development
      });
    } else if (role === 'Patient') {
      await axios.post(`${DJANGO_URL}/api/patients/`, {
        user: createdUser.id,
        date_of_birth: profileData.date_of_birth || null,
        gender: profileData.gender || 'Other',
        blood_group: profileData.blood_group || 'O+',
        emergency_contact: profileData.emergency_contact || '',
        medical_history_summary: profileData.medical_history_summary || ''
      });
    }

    // Send verification email
    const verifyLink = `http://localhost:5173/verify-email?token=${verificationToken}`;
    await sendNotificationEmail({
      to: email,
      subject: 'Verify your MedIntel Account',
      html: `
        <h2>Welcome to MedIntel!</h2>
        <p>Thank you for registering. Please verify your email by clicking the link below:</p>
        <a href="${verifyLink}" style="padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
        <p>If you did not request this, please ignore this email.</p>
      `
    });

    res.status(201).json({ message: 'User registered successfully! You can now log in.' });
  } catch (error) {
    console.error('Registration Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Server registration error' });
  }
});

// Login User
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password' });
  }

  const cleanEmail = String(email).trim();
  const cleanPassword = String(password).trim();

  try {
    // Check if user exists in Django DB
    let user;
    try {
      const response = await axios.post(`${DJANGO_URL}/api/users/login_check/`, { email: cleanEmail });
      user = response.data;
    } catch (e) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    if (!user || !user.password_hash) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Verify Password (supports bcrypt hash or plain text fallback if seeded)
    let isMatch = false;
    try {
      if (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$')) {
        isMatch = await bcrypt.compare(cleanPassword, user.password_hash);
      } else {
        isMatch = (cleanPassword === user.password_hash);
      }
    } catch (bcryptErr) {
      console.warn('[Bcrypt Check Fail]:', bcryptErr.message);
      isMatch = false;
    }

    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Check if email is verified
    if (!user.is_verified) {
      return res.status(403).json({ error: 'Please verify your email address before logging in' });
    }

    // Fetch Profile Data
    let profileData = null;
    if (user.role === 'Doctor') {
      const doctorsRes = await axios.get(`${DJANGO_URL}/api/doctors/`);
      const doctor = doctorsRes.data.find(d => d.user === user.id);
      if (!doctor) {
        return res.status(404).json({ error: 'Doctor profile record not found' });
      }
      if (!doctor.is_verified) {
        return res.status(403).json({ error: 'Your professional credentials are still under review by the Administrator.' });
      }
      profileData = doctor;
    } else if (user.role === 'Patient') {
      const patientsRes = await axios.get(`${DJANGO_URL}/api/patients/`);
      const patient = patientsRes.data.find(p => p.user === user.id);
      profileData = patient || null;
    }

    // Generate JWT safely
    const jwtSecret = process.env.JWT_SECRET || 'medintel_super_secret_jwt_token_key_123!';
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: profileData
      }
    });
  } catch (error) {
    console.error('Login Server Error:', error.response?.data || error.message);
    const errMsg = typeof error.response?.data === 'string' ? error.response.data : error.response?.data?.error || error.message || 'Server login error';
    res.status(500).json({ error: errMsg });
  }
});


// Verify Email Route
router.get('/verify', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Invalid token' });
  }

  try {
    const usersRes = await axios.get(`${DJANGO_URL}/api/users/`);
    const user = usersRes.data.find(u => u.verification_token === token);

    if (!user) {
      return res.status(400).json({ error: 'Verification token is invalid or has expired.' });
    }

    // Update user in Django
    await axios.patch(`${DJANGO_URL}/api/users/${user.id}/`, {
      is_verified: true,
      verification_token: null
    });

    res.json({ message: 'Email verified successfully! You can now log in.' });
  } catch (error) {
    console.error('Verify Email Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Server verification error' });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Please provide email' });
  }

  try {
    const usersRes = await axios.get(`${DJANGO_URL}/api/users/`);
    const user = usersRes.data.find(u => u.email === email);

    if (!user) {
      // Don't leak user presence
      return res.json({ message: 'If this email exists, a password reset link has been sent.' });
    }

    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Save token in Django
    await axios.patch(`${DJANGO_URL}/api/users/${user.id}/`, {
      reset_token: resetToken
    });

    // Send reset email
    const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;
    await sendNotificationEmail({
      to: email,
      subject: 'Reset your MedIntel Password',
      html: `
        <h2>Password Reset Request</h2>
        <p>We received a request to reset your password. Click the link below to set a new one:</p>
        <a href="${resetLink}" style="padding: 10px 20px; background-color: #ef4444; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        <p>If you did not request this, please ignore this email.</p>
      `
    });

    res.json({ message: 'Password reset link sent to your email.' });
  } catch (error) {
    console.error('Forgot Password Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Server forgot password error' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  try {
    const usersRes = await axios.get(`${DJANGO_URL}/api/users/`);
    const user = usersRes.data.find(u => u.reset_token === token);

    if (!user) {
      return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update user in Django
    await axios.patch(`${DJANGO_URL}/api/users/${user.id}/`, {
      password_hash: newPasswordHash,
      reset_token: null
    });

    res.json({ message: 'Password reset successful! You can now log in.' });
  } catch (error) {
    console.error('Reset Password Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Server reset password error' });
  }
});

module.exports = router;
