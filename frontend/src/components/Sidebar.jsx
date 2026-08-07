import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, User, Calendar, FileText, Activity, CreditCard, 
  Bell, Users, CheckSquare, Sun, Moon, LogOut, HeartPulse, Brain, ClipboardList, MessageSquare
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
  }, []);

  const toggleDarkMode = () => {
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setDarkMode(true);
    }
  };

  const getMenuItems = () => {
    if (!user) return [];
    const role = user?.role?.toLowerCase();
    
    if (role === 'patient') {
      return [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Profile', path: '/profile', icon: User },
        { name: 'Book Appointments', path: '/patient/search', icon: Users },
        { name: 'My Appointments', path: '/patient/appointments', icon: Calendar },
        { name: 'Medications', path: '/patient/medications', icon: Activity },
        { name: 'AI Disease Prediction', path: '/patient/predict-disease', icon: Brain },
        { name: 'Prescriptions', path: '/patient/prescriptions', icon: ClipboardList },
        { name: 'Medical Reports', path: '/patient/reports', icon: FileText },
        { name: 'Follow-up Chat', path: '/patient/chat', icon: MessageSquare },
      ];



    } else if (role === 'doctor') {
      return [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Profile', path: '/profile', icon: User },
        { name: 'Notifications', path: '/notifications', icon: Bell },
        { name: 'Appointments Manager', path: '/doctor/appointments', icon: Calendar },
        { name: 'Prescription Creation', path: '/doctor/prescriptions', icon: ClipboardList },
        { name: 'Working Hours & Leaves', path: '/doctor/availability', icon: CheckSquare },
        { name: 'Follow-up Chat', path: '/doctor/chat', icon: MessageSquare },
      ];
    } else if (role === 'admin') {
      return [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Profile', path: '/profile', icon: User },
        { name: 'Notifications', path: '/notifications', icon: Bell },
        { name: 'Manage Doctors', path: '/admin/doctors', icon: CheckSquare },
        { name: 'Manage Patients', path: '/admin/users', icon: Users },
        { name: 'Appointments Overview', path: '/admin/appointments', icon: Calendar },
      ];
    }
    return [];
  };



  const menuItems = getMenuItems();

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between h-screen sticky top-0 flex-shrink-0">
      <div>
        <div className="p-6 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2 bg-primary-100 dark:bg-primary-950/50 rounded-xl text-primary-600 dark:text-primary-400">
            <HeartPulse className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent leading-none">
              MedIntel
            </h1>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold tracking-wider uppercase">
              Management
            </span>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 border-l-4 border-primary-600 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
        {user && (
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-lg">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="truncate">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{user.username}</p>
              <p className="text-[11px] text-slate-400 uppercase font-semibold">{user.role}</p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={toggleDarkMode}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {darkMode ? (
              <>
                <Sun className="w-4 h-4 text-amber-500" />
                Light
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-500" />
                Dark
              </>
            )}
          </button>

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="p-2.5 rounded-xl border border-red-200 dark:border-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
