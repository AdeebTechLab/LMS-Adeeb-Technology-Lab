import axios from 'axios';

// Base API URL
let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Ensure the URL ends with /api correctly
if (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.endsWith('/api')) {
    API_URL = `${import.meta.env.VITE_API_URL}/api`;
}

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle response errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth APIs
export const authAPI = {
    register: (formData) => api.post('/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    login: (credentials) => api.post('/auth/login', credentials),
    getMe: () => api.get('/auth/me'),
    updateProfile: (formData) => api.put('/auth/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (token, password) => api.post(`/auth/reset-password/${token}`, { password })
};

// User APIs (for admin)
export const userAPI = {
    getByRole: (role) => api.get(`/users/role/${role}`),
    getVerifiedByRole: (role) => api.get(`/users/role/${role}/verified`),
    getAll: () => api.get('/users'),
    getPendingCounts: () => api.get('/users/pending-counts'),
    verify: (id) => api.put(`/users/${id}/verify`),
    unverify: (id) => api.put(`/users/${id}/unverify`),
    delete: (id) => api.delete(`/users/${id}`),
    update: (id, data) => api.put(`/users/${id}`, data),
};

// Course APIs
export const courseAPI = {
    getAll: (params) => api.get('/courses', { params }),
    getOne: (id) => api.get(`/courses/${id}`),
    create: (data) => api.post('/courses', data),
    update: (id, data) => api.put(`/courses/${id}`, data),
    delete: (id) => api.delete(`/courses/${id}`),
    getStudents: (id) => api.get(`/courses/${id}/students`)
};

// Enrollment APIs
export const enrollmentAPI = {
    getMy: () => api.get('/enrollments/my'),
    enroll: (courseId) => api.post('/enrollments', { courseId }),
    complete: (id, data) => api.put(`/enrollments/${id}/complete`, data),
    getAll: () => api.get('/enrollments/all')
};

// Fee APIs
export const feeAPI = {
    getMy: () => api.get('/fees/my'),
    getPending: () => api.get('/fees/pending'),
    getAll: () => api.get('/fees/all'),
    pay: (feeId, formData) => api.post(`/fees/${feeId}/pay`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    verify: (feeId, installmentId) => api.put(`/fees/${feeId}/installments/${installmentId}/verify`),
    setInstallments: (feeId, installments) => api.post(`/fees/${feeId}/installments`, { installments })
};

// Attendance APIs
export const attendanceAPI = {
    get: (courseId, date) => api.get(`/attendance/${courseId}/${date}`),
    mark: (data) => api.post('/attendance', data),
    getReport: (courseId) => api.get(`/attendance/report/${courseId}`),
    getMy: (courseId) => api.get(`/attendance/my/${courseId}`)
};

// Assignment APIs
export const assignmentAPI = {
    getByCourse: (courseId) => api.get(`/assignments/course/${courseId}`),
    getMy: () => api.get('/assignments/my'),
    create: (data) => api.post('/assignments', data),
    submit: (id, formData) => api.post(`/assignments/${id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    grade: (assignmentId, submissionId, marks, feedback, status) =>
        api.put(`/assignments/${assignmentId}/grade/${submissionId}`, { marks, feedback, status })
};

// Certificate APIs
export const certificateAPI = {
    getMy: () => api.get('/certificates/my'),
    getCourses: () => api.get('/certificates/courses'),
    issue: (data) => api.post('/certificates/issue', data),
    update: (id, data) => api.put(`/certificates/${id}`, data),
    getRequests: () => api.get('/certificates/requests'),
    request: (data) => api.post('/certificates/request', data),
    approveRequest: (id, data) => api.put(`/certificates/requests/${id}/approve`, data),
    rejectRequest: (id) => api.put(`/certificates/requests/${id}/reject`),
    verify: (rollNo) => api.get(`/certificates/verify/${rollNo}`)
};

// Paid Tasks APIs
export const taskAPI = {
    getAll: (params) => api.get('/tasks', { params }),
    getMy: () => api.get('/tasks/my'),
    create: (data) => api.post('/tasks', data),
    apply: (id, message) => api.post(`/tasks/${id}/apply`, { message }),
    assign: (id, userId) => api.put(`/tasks/${id}/assign`, { userId }),
    submit: (id, formData) => api.post(`/tasks/${id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    complete: (id) => api.put(`/tasks/${id}/complete`),
    addMessage: (id, text) => api.post(`/tasks/${id}/messages`, { text }),
    getMessages: (id) => api.get(`/tasks/${id}/messages`),
    markAsRead: (id) => api.put(`/tasks/${id}/read`),
    delete: (id) => api.delete(`/tasks/${id}`)
};

// Daily Task APIs
export const dailyTaskAPI = {
    submit: (data) => api.post('/daily-tasks', data),
    getByCourse: (courseId) => api.get(`/daily-tasks/course/${courseId}`),
    getMy: (courseId) => api.get(`/daily-tasks/my/${courseId}`)
};

// Notification APIs
export const notificationAPI = {
    getActive: () => api.get('/notifications/active'),
    getAll: () => api.get('/notifications'),
    create: (data) => api.post('/notifications', data),
    update: (id, data) => api.put(`/notifications/${id}`, data),
    delete: (id) => api.delete(`/notifications/${id}`)
};

export default api;
