import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const authAPI = {
  login: (email, password) => axios.post(`${API_BASE}/auth/login`, { email, password }),
  register: (data) => axios.post(`${API_BASE}/auth/register`, data),
  verifyEmail: (token) => axios.get(`${API_BASE}/auth/verify?token=${token}`),
  forgotPassword: (email) => axios.post(`${API_BASE}/auth/forgot-password`, { email }),
  resetPassword: (token, newPassword) => axios.post(`${API_BASE}/auth/reset-password`, { token, newPassword }),
};

export const doctorAPI = {
  getDoctors: (spec, loc) => api.get(`/doctors?specialization=${spec || ''}&location=${loc || ''}`),
  getAllDoctors: () => api.get('/doctors/all'),
  updateProfile: (id, data) => api.put(`/doctors/${id}`, data),
};


export const patientAPI = {
  getPatients: () => api.get('/patients'),
  getProfile: () => api.get('/patients/profile'),
  updateProfile: (id, data) => api.put(`/patients/${id}`, data),
};

export const appointmentAPI = {
  getSlots: (doctor, date) => api.get(`/appointments/slots?doctor=${doctor}&date=${date}`),
  getAppointments: () => api.get('/appointments'),
  bookAppointment: (data) => api.post('/appointments', data),
  updateAppointment: (id, data) => api.put(`/appointments/${id}`, data),
  bookFollowUp: (data) => api.post('/appointments/followup', data),
};

export const prescriptionAPI = {
  getPrescriptions: () => api.get('/prescriptions'),
  createPrescription: (data) => api.post('/prescriptions', data),
};

export const medicationAPI = {
  getMedicines: (params) => api.get('/prescribed-medicines/', { params }),
  stopMedicine: (id) => api.post(`/prescribed-medicines/${id}/stop/`),
  extendMedicine: (id, days) => api.post(`/prescribed-medicines/${id}/extend/`, { days }),
  getAdherence: (patientId) => api.get('/prescribed-medicines/adherence/', { params: { patient: patientId } }),
  getSchedules: (params) => api.get('/medication-schedules/', { params }),
  takeDose: (id) => api.post(`/medication-schedules/${id}/take/`),
  undoDose: (id) => api.post(`/medication-schedules/${id}/undo/`),
};

export const reportAPI = {
  getReports: () => api.get('/reports'),
  uploadReport: (formData) => api.post('/reports', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

export const paymentAPI = {
  getPayments: () => api.get('/payments'),
  checkout: (data) => api.post('/payments/checkout', data),
};

export const symptomAPI = {
  getSymptoms: () => api.get('/symptoms'),
  getHistory: () => api.get('/symptoms/history'),
  predictDisease: (data) => api.post('/symptoms/predict-disease', data),
  predictHealthRisk: (data) => api.post('/symptoms/predict-health-risk', data),
};


export const notificationAPI = {
  getNotifications: () => api.get('/notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}`),
};

export const adminAPI = {
  getUsers: () => api.get('/admin/users'),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
};

export const healthMetricAPI = {
  getMetrics: (patientId) => api.get(`/health-metrics?patient=${patientId || ''}`),
  logMetric: (data) => api.post('/health-metrics', data),
};

export const chatAPI = {
  getMessages: (partnerId) => api.get(`/chat-messages?partner=${partnerId}`),
  sendMessage: (receiverId, message, imageUrl) => api.post('/chat-messages', { receiver: receiverId, message, image_url: imageUrl }),
  markRead: (partnerId) => api.post('/chat-messages/mark-read', { partner: partnerId }),
  uploadAttachment: (formData) => api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

export default api;
