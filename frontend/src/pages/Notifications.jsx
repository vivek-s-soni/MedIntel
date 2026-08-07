import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { notificationAPI } from '../api';
import { Bell, Check, X, RefreshCw } from 'lucide-react';
import Toast from '../components/Toast';

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationAPI.getNotifications();
      setNotifications(res.data);
    } catch (err) {
      showToast('Failed to load notifications inbox', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      showToast('Notification marked as read');
      loadNotifications();
    } catch (err) {
      showToast('Failed to mark read', 'error');
    }
  };

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-6 overflow-y-auto max-h-screen">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                Notifications Inbox
              </h2>
              <p className="text-slate-400 dark:text-slate-500 text-xs">Stay updated on booking schedules and uploads</p>
            </div>
            <button
              onClick={loadNotifications}
              disabled={loading}
              className="p-2 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-xl hover:bg-slate-50 text-slate-600 dark:text-slate-400"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {notifications.map((n) => (
                <div key={n.id} className="py-4 flex justify-between items-start gap-4">
                  <div>
                    <p className={`text-sm ${n.is_read ? 'text-slate-400' : 'font-semibold text-slate-850 dark:text-slate-200'}`}>
                      {n.message}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(n.id)}
                      className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-primary-600 dark:text-primary-400 rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Mark read
                    </button>
                  )}
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-sm flex flex-col items-center gap-3">
                  <Bell className="w-10 h-10 text-slate-300" />
                  No system notifications received.
                </div>
              )}
            </div>
          </div>
        </div>
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

export default Notifications;
