import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';
import { HeartPulse, Mail, Lock, User, UserCheck, ShieldAlert, Sparkles, Calendar, Award } from 'lucide-react';
import Toast from '../components/Toast';

export const AuthPage = ({ mode }) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('Patient');
  const [specialization, setSpecialization] = useState('General Medicine');
  const [location, setLocation] = useState('New York');
  const [experience, setExperience] = useState('');
  const [qualification, setQualification] = useState('MBBS');
  const [contactNumber, setContactNumber] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');

  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('O+');

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Email Verification Effect
  useEffect(() => {
    if (mode === 'verify') {
      const token = searchParams.get('token');
      if (token) {
        verifyEmailToken(token);
      } else {
        showToast('Invalid verification link', 'error');
      }
    }
  }, [mode, searchParams]);

  const verifyEmailToken = async (token) => {
    setLoading(true);
    try {
      const res = await authAPI.verifyEmail(token);
      showToast(res.data.message, 'success');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      showToast(err.response?.data?.error || 'Email verification failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type) => {
    setToast({ message, type });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        const userData = await login(email, password);
        showToast('Login successful!', 'success');
        setTimeout(() => navigate('/dashboard'), 1000);
      } else if (mode === 'register') {
        const regData = {
          username,
          email,
          password,
          role,
          specialization,
          location,
          experience: parseInt(experience) || 0,
          qualification,
          contact_number: contactNumber,
          clinic_address: clinicAddress,
          date_of_birth: dob,
          gender: gender,
          blood_group: bloodGroup,
        };
        const res = await authAPI.register(regData);
        showToast(res.data.message, 'success');
        setTimeout(() => navigate('/login'), 4000);
      } else if (mode === 'forgot') {
        const res = await authAPI.forgotPassword(email);
        showToast(res.data.message, 'success');
      } else if (mode === 'reset') {
        const token = searchParams.get('token');
        const res = await authAPI.resetPassword(token, password);
        showToast(res.data.message, 'success');
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'An error occurred. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderForm = () => {
    if (mode === 'verify') {
      return (
        <div className="text-center py-6">
          {loading ? (
            <div className="space-y-4">
              <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-slate-600 dark:text-slate-400 font-medium">Verifying your email address, please wait...</p>
            </div>
          ) : (
            <p className="text-slate-600 dark:text-slate-400 font-medium">Redirecting you to login page...</p>
          )}
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-4 mt-6">
        {mode === 'register' && (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Username</label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-850 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Register As</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('Patient')}
                  className={`py-2 px-4 rounded-xl border text-sm font-semibold transition-all ${
                    role === 'Patient'
                      ? 'bg-primary-600 border-primary-600 text-white shadow-md'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Patient
                </button>
                <button
                  type="button"
                  onClick={() => setRole('Doctor')}
                  className={`py-2 px-4 rounded-xl border text-sm font-semibold transition-all ${
                    role === 'Doctor'
                      ? 'bg-primary-600 border-primary-600 text-white shadow-md'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Doctor
                </button>
              </div>
            </div>

            {role === 'Doctor' && (
              <div className="grid grid-cols-2 gap-3 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
                <div className="col-span-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Professional Credentials
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Specialization</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cardiologist"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-850 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">City Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Boston"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-850 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Qualification</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MBBS, MD"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-850 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 8"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-850 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Contact Number</label>
                  <input
                    type="text"
                    required
                    placeholder="+1 555-0199"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-850 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Clinic Address</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="123 Health Ave, Suite 400"
                    value={clinicAddress}
                    onChange={(e) => setClinicAddress(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-850 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                  />
                </div>
              </div>
            )}

            {role === 'Patient' && (
              <div className="grid grid-cols-2 gap-3 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
                <div className="col-span-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Patient Details
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:bg-slate-900"
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Blood Group</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:bg-slate-900"
                  >
                    <option>A+</option>
                    <option>A-</option>
                    <option>B+</option>
                    <option>B-</option>
                    <option>O+</option>
                    <option>O-</option>
                    <option>AB+</option>
                    <option>AB-</option>
                  </select>
                </div>
              </div>
            )}
          </>
        )}

        {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
              <input
                type="email"
                required
                placeholder="example@medintel.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-855 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        )}

        {(mode === 'login' || mode === 'register' || mode === 'reset') && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
              {mode === 'reset' ? 'New Password' : 'Password'}
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-855 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        )}

        {mode === 'login' && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
            >
              Forgot Password?
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-primary-500/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.01]"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              {mode === 'login' && 'Log In'}
              {mode === 'register' && 'Register'}
              {mode === 'forgot' && 'Send Reset Link'}
              {mode === 'reset' && 'Update Password'}
            </>
          )}
        </button>
      </form>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 relative overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute top-0 -left-10 w-96 h-96 bg-primary-400/10 dark:bg-primary-600/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 -right-10 w-96 h-96 bg-indigo-400/10 dark:bg-indigo-600/5 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl shadow-xl p-8 relative z-10">
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-primary-100 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 rounded-2xl mb-4">
            <HeartPulse className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {mode === 'login' && 'Welcome Back'}
            {mode === 'register' && 'Join MedIntel'}
            {mode === 'forgot' && 'Reset Password'}
            {mode === 'reset' && 'Set New Password'}
            {mode === 'verify' && 'Verify Email'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 text-center">
            {mode === 'login' && 'Access your patient portal, schedule, and AI medical analysis.'}
            {mode === 'register' && 'Create your account to start managing health smarter.'}
            {mode === 'forgot' && "Enter your email, we'll send a password recovery link."}
            {mode === 'reset' && 'Please input a secure, complex password.'}
            {mode === 'verify' && 'We are validating your account registration credentials.'}
          </p>
        </div>

        {renderForm()}

        {mode === 'login' && (
          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/register')}
              className="font-semibold text-primary-600 dark:text-primary-400 hover:underline"
            >
              Sign Up
            </button>
          </p>
        )}

        {mode === 'register' && (
          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="font-semibold text-primary-600 dark:text-primary-400 hover:underline"
            >
              Log In
            </button>
          </p>
        )}

        {(mode === 'forgot' || mode === 'reset') && (
          <div className="text-center mt-6">
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:underline"
            >
              Back to Login
            </button>
          </div>
        )}
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
export default AuthPage;
