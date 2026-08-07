# MedIntel Healthcare Management Platform

MedIntel is a production-ready, full-stack healthcare management platform engineered with React, Node.js + Express, and Python Django. The system implements secure role-based portals, automated medical report analysis (OCR), machine learning disease diagnostics, health risk trends projection, and online appointment scheduling.

---

## 🛠️ Technology Stack
- **Frontend**: React.js (Vite scaffolded), Tailwind CSS v3, Recharts, Lucide Icons, Axios
- **Backend API Gateway**: Node.js, Express, JWT Security, Nodemailer, Multer
- **AI & DB Microservice**: Python 3.12, Django, Django REST Framework, SQLite Database
- **ML Classifiers**: scikit-learn (Random Forest, K-Nearest Neighbors, Linear & Polynomial Regression), Pandas, NumPy

---

## 🚀 Portals & Core Features

### 👤 Patient Portal
- **Doctor Discovery**: Query and filter certified specialists by location, specialization, experience, and view clinic address maps.
- **Calendar Booking**: Book slots in real-time, preventing double bookings. Reschedule or cancel pending slots.
- **AI Disease Diagnosis**: Log symptoms, blood pressure, BMI, and glucose levels to get instant diagnostic predictions via Random Forest & KNN.
- **Health Risk Trend**: Chart historical indicators using Linear & Polynomial Regression models.
- **Lab OCR Report Scan**: Upload report files (JPG, PNG, PDF) to automatically scan values (Hemoglobin, WBC, RBC, Platelets, Vitamins) and generate doctor/patient friendly summaries.
- **Checkout Invoice**: Pay consultation fees digitally (UPI, Card, Cash simulation) and print receipts.

### 🥼 Doctor Portal
- **Workday Schedule**: Approve, reject, or complete patient appointments.
- **Patient No-Shows**: Mark missed appointments to register patients automatically in the "Not Visited" section.
- **Digital Prescriptions**: Generate complete prescriptions (Dosage, Medicine, instructions) exclusively for completed visits. Download as a text receipt.
- **Working Hours & Leaves**: Modify shift timings and calendar blockouts.

### 🔑 Admin Portal
- **Doctor Credentials Verification**: Audit and activate/deactivate new doctor registries.
- **Manage Users**: Deactivate or suspend violating doctor or patient accounts, or delete records permanently.
- **Oversight Charts**: Monitor gross system appointments, user distribution charts, and hospital revenue metrics.

---

## 📥 Installation & Setup Guide

### 1. Python Django Service
1. Navigate to the workspace folder:
   ```bash
   cd "Medical App"
   ```
2. Create and activate virtual environment:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install django djangorestframework django-cors-headers pandas numpy scikit-learn pillow pytesseract openpyxl
   ```
4. Perform migrations:
   ```bash
   cd ai_service
   python manage.py makemigrations core
   python manage.py migrate
   ```
5. Run server:
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```

### 2. Express Backend API Gateway
1. Open a new terminal:
   ```bash
   cd backend
   npm install
   ```
2. Setup environment settings in `backend/.env`:
   ```env
   PORT=5000
   JWT_SECRET=medintel_super_secret_jwt_token_key_123!
   DJANGO_URL=http://127.0.0.1:8000
   ```
3. Initialize the database seed:
   ```bash
   node seed.js
   ```
4. Start gateway:
   ```bash
   npm run dev
   ```

### 3. React Frontend
1. Open a new terminal:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. Navigate to `http://localhost:5173`.

---

## 🔐 Seed Credentials

Use these verified accounts to navigate the platform:
- **Admin**: `admin@medintel.com` / Password: `Admin@123`
- **Doctors** (10 accounts): `doctor1@medintel.com` to `doctor10@medintel.com` / Password: `Doctor@123`
- **Patients** (30 accounts): `patient1@medintel.com` to `patient30@medintel.com` / Password: `Patient@123`
