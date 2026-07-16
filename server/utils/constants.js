// User roles
export const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
};

// Attendance status
export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  EXCUSED: 'excused',
};

// Attendance marking methods
export const ATTENDANCE_METHOD = {
  FACE: 'face',
  QR: 'qr',
  MANUAL: 'manual',
  BULK: 'bulk',
};

// Attendance thresholds
export const ATTENDANCE_THRESHOLDS = {
  MINIMUM: 75,       // % below which student is at risk
  WARNING: 80,       // % below which warning is issued
  SAFE: 85,          // % considered safe
  EXCELLENT: 95,     // % considered excellent
  LATE_MINUTES: 15,  // Minutes after start time considered late
};

// Leave request status
export const LEAVE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

// Notification types
export const NOTIFICATION_TYPES = {
  ATTENDANCE_ALERT: 'attendance_alert',
  LEAVE_REQUEST: 'leave_request',
  LEAVE_APPROVED: 'leave_approved',
  LEAVE_REJECTED: 'leave_rejected',
  SYSTEM: 'system',
  CORRECTION_REQUEST: 'correction_request',
  CORRECTION_APPROVED: 'correction_approved',
  REPORT_READY: 'report_ready',
  LOW_ATTENDANCE: 'low_attendance',
};

// Report types
export const REPORT_TYPES = {
  STUDENT_ATTENDANCE: 'student_attendance',
  SUBJECT_ATTENDANCE: 'subject_attendance',
  DEPARTMENT_ATTENDANCE: 'department_attendance',
  CONSOLIDATED: 'consolidated',
};

// Risk levels for attendance predictions
export const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

// Days of week
export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// QR session default expiry (seconds)
export const QR_SESSION_EXPIRY = parseInt(process.env.QR_SESSION_EXPIRY) || 600;

// Face recognition confidence threshold
export const FACE_CONFIDENCE_THRESHOLD = 0.75;

// Max images per student face dataset
export const MAX_FACE_IMAGES = 10;

// Geolocation defaults
export const DEFAULT_GEO = {
  lat: parseFloat(process.env.GEOLOCATION_LAT) || 28.6139,
  lng: parseFloat(process.env.GEOLOCATION_LNG) || 77.209,
  radius: parseFloat(process.env.GEOLOCATION_RADIUS) || 100, // meters
};

// Semesters
export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

// Years
export const YEARS = [1, 2, 3, 4];

// Audit action types
export const AUDIT_ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  LOGIN: 'login',
  LOGOUT: 'logout',
  MARK_ATTENDANCE: 'mark_attendance',
  EXPORT: 'export',
  FACE_REGISTER: 'face_register',
  FACE_RECOGNIZE: 'face_recognize',
};
