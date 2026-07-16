import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import LoadingSpinner from './components/common/LoadingSpinner.jsx';
import AuthLayout from './layouts/AuthLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import TeacherLayout from './layouts/TeacherLayout.jsx';
import StudentLayout from './layouts/StudentLayout.jsx';

// Auth pages
const Login = lazy(() => import('./pages/auth/Login.jsx'));
const Register = lazy(() => import('./pages/auth/Register.jsx'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword.jsx'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const AdminDepartments = lazy(() => import('./pages/admin/Departments.jsx'));
const AdminCourses = lazy(() => import('./pages/admin/Courses.jsx'));
const AdminSubjects = lazy(() => import('./pages/admin/Subjects.jsx'));
const AdminTeachers = lazy(() => import('./pages/admin/Teachers.jsx'));
const AdminStudents = lazy(() => import('./pages/admin/Students.jsx'));
const AdminTimetable = lazy(() => import('./pages/admin/Timetable.jsx'));
const AdminFaceDatasets = lazy(() => import('./pages/admin/FaceDatasets.jsx'));
const AdminReports = lazy(() => import('./pages/admin/Reports.jsx'));
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics.jsx'));
const AdminAIAssistant = lazy(() => import('./pages/admin/AIAssistant.jsx'));
const AdminUsers = lazy(() => import('./pages/admin/Users.jsx'));

// Teacher pages
const TeacherDashboard = lazy(() => import('./pages/teacher/Dashboard.jsx'));
const TeacherLiveAttendance = lazy(() => import('./pages/teacher/LiveAttendance.jsx'));
const TeacherManualAttendance = lazy(() => import('./pages/teacher/ManualAttendance.jsx'));
const TeacherQRAttendance = lazy(() => import('./pages/teacher/QRAttendance.jsx'));
const TeacherHistory = lazy(() => import('./pages/teacher/AttendanceHistory.jsx'));
const TeacherReports = lazy(() => import('./pages/teacher/Reports.jsx'));
const TeacherStudentSearch = lazy(() => import('./pages/teacher/StudentSearch.jsx'));
const TeacherLeaveApproval = lazy(() => import('./pages/teacher/LeaveApproval.jsx'));
const TeacherNotifications = lazy(() => import('./pages/teacher/Notifications.jsx'));

// Student pages
const StudentDashboard = lazy(() => import('./pages/student/Dashboard.jsx'));
const StudentAttendanceHistory = lazy(() => import('./pages/student/AttendanceHistory.jsx'));
const StudentAttendanceCalendar = lazy(() => import('./pages/student/AttendanceCalendar.jsx'));
const StudentFaceProfile = lazy(() => import('./pages/student/FaceProfile.jsx'));
const StudentLeaveRequest = lazy(() => import('./pages/student/LeaveRequest.jsx'));
const StudentNotifications = lazy(() => import('./pages/student/Notifications.jsx'));
const StudentReports = lazy(() => import('./pages/student/Reports.jsx'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <AnimatePresence mode="wait">
        <Routes>
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Auth routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>

          {/* Admin routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/departments" element={<AdminDepartments />} />
              <Route path="/admin/courses" element={<AdminCourses />} />
              <Route path="/admin/subjects" element={<AdminSubjects />} />
              <Route path="/admin/teachers" element={<AdminTeachers />} />
              <Route path="/admin/students" element={<AdminStudents />} />
              <Route path="/admin/timetable" element={<AdminTimetable />} />
              <Route path="/admin/face-datasets" element={<AdminFaceDatasets />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/admin/ai-assistant" element={<AdminAIAssistant />} />
              <Route path="/admin/users" element={<AdminUsers />} />
            </Route>
          </Route>

          {/* Teacher routes */}
          <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
            <Route element={<TeacherLayout />}>
              <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
              <Route path="/teacher/live-attendance" element={<TeacherLiveAttendance />} />
              <Route path="/teacher/manual-attendance" element={<TeacherManualAttendance />} />
              <Route path="/teacher/qr-attendance" element={<TeacherQRAttendance />} />
              <Route path="/teacher/history" element={<TeacherHistory />} />
              <Route path="/teacher/reports" element={<TeacherReports />} />
              <Route path="/teacher/students" element={<TeacherStudentSearch />} />
              <Route path="/teacher/leave-approval" element={<TeacherLeaveApproval />} />
              <Route path="/teacher/notifications" element={<TeacherNotifications />} />
            </Route>
          </Route>

          {/* Student routes */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route element={<StudentLayout />}>
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/attendance" element={<StudentAttendanceHistory />} />
              <Route path="/student/calendar" element={<StudentAttendanceCalendar />} />
              <Route path="/student/face-profile" element={<StudentFaceProfile />} />
              <Route path="/student/leave" element={<StudentLeaveRequest />} />
              <Route path="/student/notifications" element={<StudentNotifications />} />
              <Route path="/student/reports" element={<StudentReports />} />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}

export default App;
