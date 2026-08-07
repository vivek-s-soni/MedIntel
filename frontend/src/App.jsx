import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPages';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Sidebar from './components/Sidebar';

// Simple Route Guard
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

// Route wrapper with Sidebar
const SidebarLayout = ({ children }) => {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
          <Route path="/reset-password" element={<AuthPage mode="reset" />} />
          <Route path="/verify-email" element={<AuthPage mode="verify" />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />

          {/* Patient Portal Routes */}
          <Route path="/patient/search" element={<PrivateRoute><SidebarLayout><PatientDashboard tab="search" /></SidebarLayout></PrivateRoute>} />
          <Route path="/patient/appointments" element={<PrivateRoute><SidebarLayout><PatientDashboard tab="appointments" /></SidebarLayout></PrivateRoute>} />


          <Route path="/patient/predict-disease" element={<PrivateRoute><SidebarLayout><PatientDashboard tab="predict-disease" /></SidebarLayout></PrivateRoute>} />
          <Route path="/patient/prescriptions" element={<PrivateRoute><SidebarLayout><PatientDashboard tab="prescriptions" /></SidebarLayout></PrivateRoute>} />
          <Route path="/patient/reports" element={<PrivateRoute><SidebarLayout><PatientDashboard tab="reports" /></SidebarLayout></PrivateRoute>} />
          <Route path="/patient/medications" element={<PrivateRoute><SidebarLayout><PatientDashboard tab="medications" /></SidebarLayout></PrivateRoute>} />
          <Route path="/patient/chat" element={<PrivateRoute><SidebarLayout><PatientDashboard tab="chat" /></SidebarLayout></PrivateRoute>} />

          {/* Doctor Portal Routes */}
          <Route path="/doctor/appointments" element={<PrivateRoute><SidebarLayout><DoctorDashboard tab="appointments" /></SidebarLayout></PrivateRoute>} />
          <Route path="/doctor/prescriptions" element={<PrivateRoute><SidebarLayout><DoctorDashboard tab="prescriptions" /></SidebarLayout></PrivateRoute>} />
          <Route path="/doctor/availability" element={<PrivateRoute><SidebarLayout><DoctorDashboard tab="availability" /></SidebarLayout></PrivateRoute>} />
          <Route path="/doctor/chat" element={<PrivateRoute><SidebarLayout><DoctorDashboard tab="chat" /></SidebarLayout></PrivateRoute>} />

          {/* Admin Portal Routes */}
          <Route path="/admin/doctors" element={<PrivateRoute><SidebarLayout><AdminDashboard tab="doctors" /></SidebarLayout></PrivateRoute>} />
          <Route path="/admin/users" element={<PrivateRoute><SidebarLayout><AdminDashboard tab="users" /></SidebarLayout></PrivateRoute>} />
          <Route path="/admin/appointments" element={<PrivateRoute><SidebarLayout><AdminDashboard tab="appointments" /></SidebarLayout></PrivateRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
