require('dotenv').config();
const axios = require('axios');
const bcrypt = require('bcryptjs');

const DJANGO_URL = process.env.DJANGO_URL || 'http://127.0.0.1:8000';

async function seed() {
  console.log('[Seed] Beginning database seeding via Django REST API...');

  try {
    // 1. Clean existing database records (optional, but let's clear for fresh start)
    console.log('[Seed] Clearing old records...');
    const usersRes = await axios.get(`${DJANGO_URL}/api/users/`);
    for (let u of usersRes.data) {
      await axios.delete(`${DJANGO_URL}/api/users/${u.id}/`);
    }
    console.log('[Seed] Database cleared.');

    const salt = await bcrypt.genSalt(10);

    // 2. Create Admin
    console.log('[Seed] Creating Administrator...');
    const adminHash = await bcrypt.hash('Admin@123', salt);
    await axios.post(`${DJANGO_URL}/api/users/`, {
      username: 'admin',
      email: 'admin@medintel.com',
      password_hash: adminHash,
      role: 'Admin',
      is_verified: true
    });

    // 3. Create 10 Indian Doctors
    console.log('[Seed] Creating 10 Doctors...');
    const indianDoctors = [
      { name: 'Rajesh Sharma', spec: 'Cardiology', qual: 'MD, FACC' },
      { name: 'Priya Patel', spec: 'Pediatrics', qual: 'MD, DCH' },
      { name: 'Amit Verma', spec: 'Dermatology', qual: 'MD, DNB' },
      { name: 'Kavita Reddy', spec: 'Neurology', qual: 'MD, DM' },
      { name: 'Sanjay Dutt', spec: 'General Medicine', qual: 'MBBS, MD' },
      { name: 'Sunita Rao', spec: 'Orthopedics', qual: 'MS, MCh' },
      { name: 'Manoj Kumar', spec: 'Gastroenterology', qual: 'MD, DM' },
      { name: 'Ananya Sen', spec: 'Ophthalmology', qual: 'MS, DOMS' },
      { name: 'Vikram Malhotra', spec: 'Psychiatry', qual: 'MD' },
      { name: 'Meera Deshmukh', spec: 'Pulmonology', qual: 'MD, TDD' }
    ];
    
    const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Hyderabad', 'Chennai'];

    for (let i = 0; i < 10; i++) {
      const doc = indianDoctors[i];
      const docHash = await bcrypt.hash('Doctor@123', salt);
      // Create user friendly username
      const username = doc.name.toLowerCase().replace(/\s/g, '');
      const email = `${username}@medintel.com`;
      const loc = cities[i % cities.length];
      const exp = 5 + (i * 2);

      const userRes = await axios.post(`${DJANGO_URL}/api/users/`, {
        username: doc.name,
        email,
        password_hash: docHash,
        role: 'Doctor',
        is_verified: true
      });

      await axios.post(`${DJANGO_URL}/api/doctors/`, {
        user: userRes.data.id,
        specialization: doc.spec,
        location: loc,
        experience: exp,
        qualification: doc.qual,
        clinic_address: `${(i+1) * 10} Medical Heights, Link Road, Andheri West, ${loc}`,
        contact_number: `+91 98200 1230${i}`,
        google_maps_link: `https://maps.google.com/?q=Dr+${username}+${loc}`.replace(/\s/g, '+'),
        working_hours_start: '09:00:00',
        working_hours_end: '17:00:00',
        is_verified: true,
        leaves: []
      });
    }

    // 4. Create 30 Patients with Indian Names
    console.log('[Seed] Creating 30 Patients...');
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
    const genders = ['Male', 'Female', 'Other'];
        const indianPatients = [
      'Rahul Kumar', 'Rohan Verma', 'Sunita Devi', 'Divya Nair', 'Pooja Singh',
      'Sameer Sen', 'Preeti Gupta', 'Aarav Mehta', 'Anjali Joshi', 'Aditya Roy',
      'Neha Sharma', 'Kunal Bahl', 'Siddharth Rao', 'Kirti Desai', 'Deepak Gill',
      'Shalini Iyer', 'Manish Pandey', 'Ritu Goel', 'Sanjay Gupta', 'Priyanka Sen',
      'Abhishek Mishra', 'Tanvi Hegde', 'Harish Nair', 'Karan Johar', 'Nisha Pathak',
      'Varun Dhawan', 'Alia Bhatt', 'Ranbir Kapoor', 'Deepika Padukone', 'Ranveer Singh'
    ];

    for (let i = 0; i < 30; i++) {
      const patName = indianPatients[i];
      const patHash = await bcrypt.hash('Patient@123', salt);
      const username = patName.toLowerCase().replace(/\s/g, '');
      const email = `${username}@medintel.com`;
      const gender = genders[i % genders.length];
      const bg = bloodGroups[i % bloodGroups.length];
      
      const userRes = await axios.post(`${DJANGO_URL}/api/users/`, {
        username: patName,
        email,
        password_hash: patHash,
        role: 'Patient',
        is_verified: true
      });

      await axios.post(`${DJANGO_URL}/api/patients/`, {
        user: userRes.data.id,
        date_of_birth: `19${75 + (i % 20)}-05-${10 + (i % 15)}`,
        gender: gender,
        blood_group: bg,
        emergency_contact: `+91 99999 888${i < 10 ? '0' + i : i}`,
        medical_history_summary: i % 3 === 0 ? 'Hypertension diagnosed. Occasional seasonal allergies.' : 'No major history.'
      });
    }

    // 5. Seed some sample appointments, payments, notifications
    console.log('[Seed] Seeding sample appointments & historical records...');
    const doctorsList = (await axios.get(`${DJANGO_URL}/api/doctors/`)).data;
    const patientsList = (await axios.get(`${DJANGO_URL}/api/patients/`)).data;

    // Create a few past completed appointments
    for (let i = 0; i < 5; i++) {
      const pat = patientsList[i];
      const doc = doctorsList[i % doctorsList.length];
      const date = `2026-08-01`;
      
      // Appointment
      const apptRes = await axios.post(`${DJANGO_URL}/api/appointments/`, {
        patient: pat.id,
        doctor: doc.id,
        date,
        time_slot: '10:00:00',
        status: 'Completed',
        payment_status: 'Paid'
      });

      // Prescription
      await axios.post(`${DJANGO_URL}/api/prescriptions/`, {
        appointment: apptRes.data.id,
        symptoms: 'Patient reports mild fatigue and muscle aches.',
        medicines: [
          { name: 'Multivitamins', dosage: '1-0-0', instructions: 'Take after breakfast' },
          { name: 'Paracetamol 500mg', dosage: '1-0-1', instructions: 'As needed for body pain' }
        ]
      });

      // Payment
      await axios.post(`${DJANGO_URL}/api/payments/`, {
        appointment: apptRes.data.id,
        amount: 250.00,
        method: 'UPI',
        status: 'Success',
        transaction_id: `TXN-SEED${apptRes.data.id}00`
      });
    }

    // Create a few upcoming appointments
    for (let i = 5; i < 10; i++) {
      const pat = patientsList[i];
      const doc = doctorsList[i % doctorsList.length];
      const date = `2026-08-10`;

      await axios.post(`${DJANGO_URL}/api/appointments/`, {
        patient: pat.id,
        doctor: doc.id,
        date,
        time_slot: '11:00:00',
        status: 'Approved',
        payment_status: 'Pending'
      });
    }

    // Create a few "Not Visited" (No-shows) appointments
    for (let i = 10; i < 13; i++) {
      const pat = patientsList[i];
      const doc = doctorsList[i % doctorsList.length];
      const date = `2026-08-02`;

      await axios.post(`${DJANGO_URL}/api/appointments/`, {
        patient: pat.id,
        doctor: doc.id,
        date,
        time_slot: '14:00:00',
        status: 'Cancelled',
        payment_status: 'Pending',
        not_visited: true
      });
    }

    // 6. Seed mock HealthMetrics for Rahul Kumar
    console.log('[Seed] Seeding sample health metrics for patient #1...');
    const pat1 = patientsList[0];
    const metrics = [
      { weight: 70.2, systolic: 122, diastolic: 80, blood_sugar: 95, heart_rate: 72 },
      { weight: 70.5, systolic: 124, diastolic: 82, blood_sugar: 98, heart_rate: 74 },
      { weight: 70.1, systolic: 120, diastolic: 78, blood_sugar: 92, heart_rate: 70 },
      { weight: 69.9, systolic: 118, diastolic: 76, blood_sugar: 90, heart_rate: 68 },
      { weight: 70.0, systolic: 121, diastolic: 81, blood_sugar: 110, heart_rate: 71 },
      { weight: 70.2, systolic: 125, diastolic: 83, blood_sugar: 105, heart_rate: 73 },
      { weight: 70.3, systolic: 128, diastolic: 85, blood_sugar: 120, heart_rate: 75 }
    ];
    for (let i = 0; i < metrics.length; i++) {
      await axios.post(`${DJANGO_URL}/api/health-metrics/`, {
        patient: pat1.id,
        ...metrics[i]
      });
    }

    // 7. Seed mock follow-up chat logs
    console.log('[Seed] Seeding follow-up chat messages between patient & doctor...');
    const doc1 = doctorsList[0];
    const messages = [
      { sender: doc1.user, receiver: pat1.user, message: "Hello Rahul, how are you feeling today after starting the new Multivitamins course?" },
      { sender: pat1.user, receiver: doc1.user, message: "Hello Dr. Rajesh! I am feeling much better now. No more body aches." },
      { sender: doc1.user, receiver: pat1.user, message: "Excellent! Make sure to take them post-breakfast and keep your hydration levels up." }
    ];
    for (let i = 0; i < messages.length; i++) {
      await axios.post(`${DJANGO_URL}/api/chat-messages/`, messages[i]);
    }

    console.log('[Seed] Seeding completed successfully!');
  } catch (err) {
    console.error('[Seed] Error seeding data:', err.response?.data || err.message);
  }
}

seed();


