import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { useSelector } from 'react-redux';
import { useEffect } from 'react';
import store from './store/store';
import { subscribeToPushNotifications } from './utils/pushNotifications';

// Auth Pages
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import RoleSelection from './pages/auth/RoleSelection';
import StudentRegister from './pages/auth/StudentRegister';
import InternshipRegister from './pages/auth/InternshipRegister';
import JobRegister from './pages/auth/JobRegister';
import TeacherRegister from './pages/auth/TeacherRegister';

// Original Student Pages (used by Intern)
import StudentDashboard from './pages/student/StudentDashboard';
import AssignmentSubmission from './pages/student/AssignmentSubmission';
import MarksSheet from './pages/student/MarksSheet';

// Layout
import DashboardLayout from './components/layout/DashboardLayout';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import CourseManagement from './pages/admin/CourseManagement';
import FeeVerification from './pages/admin/FeeVerification';
import PaidTasksManagement from './pages/admin/PaidTasksManagement';
import CertificateManagement from './pages/admin/CertificateManagement';
import TeachersManagement from './pages/admin/TeachersManagement';
import StudentsManagement from './pages/admin/StudentsManagement';
import InternsManagement from './pages/admin/InternsManagement';
import JobsManagement from './pages/admin/JobsManagement';
import NotificationManagement from './pages/admin/NotificationManagement';
import StudentDirectory from './pages/admin/StudentDirectory';
import TeacherDirectory from './pages/admin/TeacherDirectory';

// Teacher Pages (handles both Students and Interns)
import TeacherProfile from './pages/teacher/TeacherProfile';
import AttendanceSheet from './pages/teacher/AttendanceSheet';
import TeacherCourses from './pages/teacher/TeacherCourses';
import QuickAttendance from './pages/teacher/QuickAttendance';

// Job Pages (Paid Tasks System)
import BrowseTasks from './pages/job/BrowseTasks';
import JobProfile from './pages/job/JobProfile';

// Student Pages
import StudentProfile from './pages/student/StudentProfile';
import BrowseCourses from './pages/student/BrowseCourses';
import FeeManagement from './pages/student/FeeManagement';
import TeacherCertificates from './pages/teacher/TeacherCertificates';

// Public Pages
import CertificateVerification from './pages/public/CertificateVerification';

// Settings Page
import Settings from './pages/settings/Settings';


// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, role } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (role === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
    if (role === 'job') return <Navigate to="/job/tasks" replace />;
    if (role === 'intern') return <Navigate to="/intern/dashboard" replace />;
    return <Navigate to="/student/dashboard" replace />;
  }

  return children;
};

// App Routes Component
const AppRoutes = () => {
  const { isAuthenticated, role } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      // Small timeout to not block rendering
      setTimeout(() => subscribeToPushNotifications(), 1000);
    }
  }, [isAuthenticated]);

  const getDefaultPage = () => {
    switch (role) {
      case 'admin': return '/admin/dashboard';
      case 'teacher': return '/teacher/dashboard';
      case 'job': return '/job/tasks';
      case 'intern': return '/intern/dashboard';
      default: return '/student/dashboard';
    }
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={getDefaultPage()} replace /> : <Login />}
      />
      <Route
        path="/forgot-password"
        element={isAuthenticated ? <Navigate to={getDefaultPage()} replace /> : <ForgotPassword />}
      />
      <Route
        path="/reset-password/:token"
        element={<ResetPassword />}
      />

      {/* Registration Routes */}
      <Route path="/register" element={isAuthenticated ? <Navigate to={getDefaultPage()} replace /> : <RoleSelection />} />
      <Route path="/register/student" element={isAuthenticated ? <Navigate to={getDefaultPage()} replace /> : <StudentRegister />} />
      <Route path="/register/internship" element={isAuthenticated ? <Navigate to={getDefaultPage()} replace /> : <InternshipRegister />} />
      <Route path="/register/job" element={isAuthenticated ? <Navigate to={getDefaultPage()} replace /> : <JobRegister />} />
      <Route path="/register/teacher" element={isAuthenticated ? <Navigate to={getDefaultPage()} replace /> : <TeacherRegister />} />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout /></ProtectedRoute>}
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="courses" element={<CourseManagement />} />
        <Route path="paid-tasks" element={<PaidTasksManagement />} />
        <Route path="certificates" element={<CertificateManagement />} />
        <Route path="students" element={<StudentsManagement />} />
        <Route path="teachers" element={<TeachersManagement />} />
        <Route path="interns" element={<InternsManagement />} />
        <Route path="jobs" element={<JobsManagement />} />
        <Route path="fees" element={<FeeVerification />} />
        <Route path="notifications" element={<NotificationManagement />} />
        <Route path="directory" element={<StudentDirectory />} />
        <Route path="teacher-directory" element={<TeacherDirectory />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Public Verification Route */}
      <Route path="/verify" element={<CertificateVerification />} />

      {/* Teacher Routes - handles Students AND Interns */}
      <Route
        path="/teacher"
        element={<ProtectedRoute allowedRoles={['teacher']}><DashboardLayout /></ProtectedRoute>}
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<TeacherCourses isDashboard={true} />} />
        <Route path="profile" element={<TeacherProfile />} />
        <Route path="attendance" element={<AttendanceSheet />} />
        <Route path="quick-attendance" element={<QuickAttendance />} />
        <Route path="course/:id" element={<AttendanceSheet />} />
        <Route path="certificates" element={<TeacherCertificates />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Student Routes */}
      <Route
        path="/student"
        element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout /></ProtectedRoute>}
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="courses" element={<BrowseCourses />} />
        <Route path="fees" element={<FeeManagement />} />
        <Route path="assignments" element={<AssignmentSubmission />} />
        <Route path="marks" element={<MarksSheet />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Intern Routes */}
      <Route
        path="/intern"
        element={<ProtectedRoute allowedRoles={['intern']}><DashboardLayout /></ProtectedRoute>}
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="courses" element={<BrowseCourses />} />
        <Route path="fees" element={<FeeManagement />} />
        <Route path="assignments" element={<AssignmentSubmission />} />
        <Route path="marks" element={<MarksSheet />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Job Routes - Paid Tasks System */}
      <Route
        path="/job"
        element={<ProtectedRoute allowedRoles={['job']}><DashboardLayout /></ProtectedRoute>}
      >
        <Route index element={<Navigate to="tasks" replace />} />
        <Route path="tasks" element={<BrowseTasks />} />
        <Route path="profile" element={<JobProfile />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Root redirect */}
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to={getDefaultPage()} replace /> : <Navigate to="/login" replace />}
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <Provider store={store}>
      <Router>
        <Toaster position="top-right" reverseOrder={false} />
        <AppRoutes />
      </Router>
    </Provider>
  );
}

export default App;


