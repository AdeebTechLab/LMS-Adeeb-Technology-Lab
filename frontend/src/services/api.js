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
// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
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
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
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
    forgotPassword: (data) => api.post('/auth/forgot-password', data),
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
    update: (id, data) => {
        const config = data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
        return api.put(`/users/${id}`, data, config);
    },
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
    withdraw: (id) => api.delete(`/enrollments/${id}`),
    getAll: () => api.get('/enrollments/all')
};

// Fee APIs
export const feeAPI = {
    getMy: () => api.get('/fees/my'),
    getPending: () => api.get('/fees/pending'),
    getAll: () => api.get('/fees/all'),
    checkStatus: (courseId) => api.get(`/fees/check-status/${courseId}`),
    pay: (feeId, formData) => api.post(`/fees/${feeId}/pay`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    verify: (feeId, installmentId) => api.put(`/fees/${feeId}/installments/${installmentId}/verify`),
    reject: (feeId, installmentId) => api.put(`/fees/${feeId}/installments/${installmentId}/reject`),
    setInstallments: (feeId, installments) => api.post(`/fees/${feeId}/installments`, { installments }),
    deleteInstallment: (feeId, installmentId) => api.delete(`/fees/${feeId}/installments/${installmentId}`),
    delete: (id) => api.delete(`/fees/${id}`)
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
        api.put(`/assignments/${assignmentId}/grade/${submissionId}`, { marks, feedback, status }),
    update: (id, data) => api.put(`/assignments/${id}`, data),
    delete: (id) => api.delete(`/assignments/${id}`)
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
    delete: (id) => api.delete(`/certificates/${id}`),
    verify: (rollNo) => api.get(`/certificates/verify/${rollNo}`)
};

// Paid Tasks APIs
export const taskAPI = {
    getAll: (params) => api.get('/tasks', { params }),
    getMy: () => api.get('/tasks/my'),
    create: (data) => api.post('/tasks', data),
    update: (id, data) => api.put(`/tasks/${id}`, data),
    apply: (id, message) => api.post(`/tasks/${id}/apply`, { message }),
    assign: (id, userId) => api.put(`/tasks/${id}/assign`, { userId }),
    submit: (id, formData) => api.post(`/tasks/${id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    complete: (id) => api.put(`/tasks/${id}/complete`),
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

// User Notification APIs
export const userNotificationAPI = {
    getAll: () => api.get('/user-notifications'),
    getUnreadCount: () => api.get('/user-notifications/unread-count'),
    markAsRead: (id) => api.put(`/user-notifications/${id}/read`),
    markAllAsRead: () => api.put('/user-notifications/mark-all-read'),
    delete: (id) => api.delete(`/user-notifications/${id}`)
};

// Chat APIs
export const chatAPI = {
    getMessages: (otherUserId) => api.get(`/chat/messages/${otherUserId}`),
    sendMessage: (recipientId, text) => api.post('/chat/messages', { recipientId, text }),
    getConversations: () => api.get('/chat/conversations'),
    markAsRead: (senderId) => api.put(`/chat/read/${senderId}`),
    getUnread: () => api.get('/chat/unread'),
    clearChatHistory: (userId) => {
        console.log(`[API] Requesting to CLEAR CHAT HISTORY for user ${userId} via POST /chat/action/clear-messages/`);
        return api.post(`/chat/action/clear-messages/${userId}`);
    },
    // Course-based chat APIs
    getCourseMessages: (courseId, userId) => api.get(`/chat/course/${courseId}/messages/${userId}`),
    sendCourseMessage: (courseId, recipientId, text) => api.post(`/chat/course/${courseId}/send`, { recipientId, text }),
    getTeacherCourses: () => api.get('/chat/teacher/courses'),
    getStudentCourses: () => api.get('/chat/student/courses'),
    searchByEmail: (email, courseId = null) => {
        const params = courseId ? `?email=${email}&courseId=${courseId}` : `?email=${email}`;
        return api.get(`/chat/search${params}`);
    },
    markCourseAsRead: (courseId, senderId) => api.put(`/chat/course/${courseId}/read/${senderId}`)
};

// Stats APIs
export const statsAPI = {
    getAdminDashboard: (params) => api.get('/stats/admin-dashboard', { params })
};

// Settings API
export const settingsAPI = {
    getAll: () => api.get('/settings'),
    update: (key, value) => api.put(`/settings/${key}`, { value })
};

export default api;
