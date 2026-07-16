# REST API Documentation
## AI-Powered Face Recognition Attendance Management System (FRAMS)

**Base URL (Production):** `https://frams-api.onrender.com/api/v1`
**Base URL (Development):** `http://localhost:5000/api/v1`
**CV API Base URL:** `https://frams-cv.onrender.com/api`
**Content-Type:** `application/json` (unless noted)
**Authentication:** Bearer token in `Authorization` header

---

## Table of Contents

1. [Authentication Endpoints](#1-authentication)
2. [Admin – User Management](#2-admin--user-management)
3. [Admin – Department / Course / Subject](#3-admin--departments-courses-subjects)
4. [Teacher Endpoints](#4-teacher-endpoints)
5. [Student Endpoints](#5-student-endpoints)
6. [Attendance Endpoints](#6-attendance-endpoints)
7. [Timetable Endpoints](#7-timetable-endpoints)
8. [Leave Request Endpoints](#8-leave-request-endpoints)
9. [Face Recognition Endpoints (CV API)](#9-face-recognition-cv-api)
10. [Analytics & Reports Endpoints](#10-analytics--reports)
11. [AI / ML Prediction Endpoints](#11-ai--ml-predictions)
12. [Notification Endpoints](#12-notification-endpoints)
13. [Audit Log Endpoints](#13-audit-log-endpoints)
14. [System Configuration Endpoints](#14-system-configuration)
15. [Error Reference](#15-error-reference)

---

## Authentication Notation

| Symbol | Meaning |
|---|---|
| 🔓 | No authentication required |
| 🔑 | JWT Bearer token required |
| 👑 | Admin only |
| 📚 | Teacher only |
| 🎓 | Student only |
| 🔑+ | Any authenticated role |

---

## 1. Authentication

### POST `/auth/login` 🔓

Login with email and password.

**Request Body:**
```json
{
  "email": "teacher@college.edu",
  "password": "SecurePass123!"
}
```

**Response 200 OK:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
      "name": "Ravi Sharma",
      "email": "ravi.sharma@college.edu",
      "role": "teacher",
      "avatar": null,
      "isActive": true
    }
  }
}
```
*Note: `refreshToken` is set as HTTP-only cookie automatically.*

**Status Codes:**

| Code | Meaning |
|---|---|
| 200 | Login successful |
| 400 | Validation error (missing fields) |
| 401 | Invalid credentials |
| 403 | Account deactivated |
| 429 | Too many failed attempts |

---

### POST `/auth/refresh` 🔓

Refresh access token using HTTP-only cookie.

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Status Codes:** `200`, `401` (expired/invalid refresh token)

---

### POST `/auth/logout` 🔑+

Invalidate current refresh token.

**Response 200 OK:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### POST `/auth/change-password` 🔑+

**Request Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!",
  "confirmNewPassword": "NewPass456!"
}
```

**Response 200 OK:**
```json
{ "success": true, "message": "Password changed successfully" }
```

**Status Codes:** `200`, `400` (validation), `401` (wrong current password)

---

### POST `/auth/forgot-password` 🔓

**Request Body:**
```json
{ "email": "student@college.edu" }
```

**Response 200 OK:**
```json
{ "success": true, "message": "OTP sent to registered email" }
```

---

### POST `/auth/reset-password` 🔓

**Request Body:**
```json
{
  "email": "student@college.edu",
  "otp": "482913",
  "newPassword": "NewPass789!"
}
```

**Response 200 OK:**
```json
{ "success": true, "message": "Password reset successfully" }
```

**Status Codes:** `200`, `400` (invalid/expired OTP)

---

### GET `/auth/me` 🔑+

Get current authenticated user's profile.

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
      "name": "Ravi Sharma",
      "email": "ravi.sharma@college.edu",
      "role": "teacher",
      "phone": "9876543210",
      "avatar": "https://ik.imagekit.io/frams/avatar.jpg",
      "isActive": true,
      "lastLogin": "2026-07-16T06:30:00.000Z"
    }
  }
}
```

---

## 2. Admin – User Management

### GET `/admin/users` 👑

List all users with filters.

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `role` | string | Filter by role: `admin`, `teacher`, `student` |
| `department` | ObjectId | Filter by department |
| `search` | string | Search by name or email |
| `isActive` | boolean | Filter by active status |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 20, max: 100) |

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
        "name": "Ravi Sharma",
        "email": "ravi.sharma@college.edu",
        "role": "teacher",
        "isActive": true,
        "createdAt": "2021-06-01T09:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 250,
      "page": 1,
      "limit": 20,
      "totalPages": 13
    }
  }
}
```

---

### POST `/admin/users` 👑

Create a new user.

**Request Body:**
```json
{
  "name": "Priya Patel",
  "email": "priya.patel@college.edu",
  "role": "teacher",
  "phone": "9876543211",
  "departmentId": "64d4e5f6g7h8i9j0k1l2m3n4",
  "employeeId": "EMP-CS-0043",
  "designation": "Assistant Professor",
  "qualification": "M.Tech (AI & ML)",
  "experienceYears": 3,
  "joiningDate": "2023-07-01"
}
```

**Response 201 Created:**
```json
{
  "success": true,
  "message": "User created successfully. Credentials sent to email.",
  "data": {
    "user": {
      "_id": "66a1b2c3d4e5f6g7h8i9j0k1",
      "name": "Priya Patel",
      "email": "priya.patel@college.edu",
      "role": "teacher"
    }
  }
}
```

**Status Codes:** `201`, `400` (validation), `409` (email already exists)

---

### GET `/admin/users/:userId` 👑

Get single user by ID.

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "user": { "...full user object with profile..." }
  }
}
```

---

### PUT `/admin/users/:userId` 👑

Update user.

**Request Body:** Any updatable fields (name, phone, avatar, isActive, etc.)

**Response 200 OK:**
```json
{ "success": true, "data": { "user": { "...updated user..." } } }
```

---

### DELETE `/admin/users/:userId` 👑

Soft-delete user.

**Response 200 OK:**
```json
{ "success": true, "message": "User deleted successfully" }
```

---

### PATCH `/admin/users/:userId/toggle-status` 👑

Activate or deactivate a user account.

**Request Body:**
```json
{ "isActive": false }
```

**Response 200 OK:**
```json
{ "success": true, "message": "User deactivated successfully" }
```

---

### POST `/admin/users/bulk-import` 👑

Import students via CSV.

**Content-Type:** `multipart/form-data`

**Request:** Form field `file` containing CSV.

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "created": 45,
    "failed": [
      { "row": 3, "email": "dup@college.edu", "error": "Email already exists" }
    ]
  }
}
```

---

## 3. Admin – Departments, Courses, Subjects

### GET `/admin/departments` 👑

**Response:** Array of department objects with HOD details populated.

### POST `/admin/departments` 👑

```json
{
  "name": "Computer Science and Engineering",
  "code": "CS",
  "hodId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "totalSemesters": 8,
  "description": "..."
}
```

### PUT `/admin/departments/:id` 👑
### DELETE `/admin/departments/:id` 👑

---

### GET `/admin/courses` 👑

Query params: `departmentId`

### POST `/admin/courses` 👑

```json
{
  "departmentId": "64d4...",
  "courseName": "Bachelor of Technology - Computer Science",
  "courseCode": "BTECH-CS",
  "duration": 4,
  "totalSemesters": 8
}
```

---

### GET `/admin/subjects` 👑

Query params: `courseId`, `departmentId`, `semester`, `teacherId`

### POST `/admin/subjects` 👑

```json
{
  "courseId": "64e5...",
  "departmentId": "64d4...",
  "teacherId": "65a1...",
  "subjectName": "Database Management Systems",
  "subjectCode": "CS-301",
  "semester": 6,
  "creditHours": 4,
  "totalLectures": 60
}
```

### PUT `/admin/subjects/:id` 👑
### DELETE `/admin/subjects/:id` 👑

### PATCH `/admin/subjects/:id/assign-teacher` 👑

```json
{ "teacherId": "65a1b2c3d4e5f6g7h8i9j0k1" }
```

---

### POST `/admin/students/:studentId/enroll` 👑

Enroll student in a course.

```json
{
  "courseId": "64e5...",
  "batchYear": 2022,
  "section": "A",
  "semester": 1
}
```

---

## 4. Teacher Endpoints

### GET `/teacher/profile` 📚

Get own teacher profile with assigned subjects.

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "teacher": {
      "_id": "65a1...",
      "employeeId": "EMP-CS-0042",
      "designation": "Assistant Professor",
      "subjects": [
        { "_id": "64f6...", "subjectName": "DBMS", "subjectCode": "CS-301", "semester": 6 }
      ]
    }
  }
}
```

### PUT `/teacher/profile` 📚

Update own profile (name, phone, avatar).

### GET `/teacher/dashboard` 📚

Returns today's schedule, pending leave requests, low-attendance students.

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "todaySchedule": [
      { "time": "10:00-11:00", "subject": "DBMS", "section": "A", "room": "CR-205" }
    ],
    "pendingLeaves": 3,
    "lowAttendanceStudents": [
      { "name": "Amit Kumar", "rollNo": "CS2022012", "attendance": 68.5 }
    ],
    "stats": {
      "totalStudents": 120,
      "todayAttendanceRate": 86.7
    }
  }
}
```

### GET `/teacher/students` 📚

Get all students under teacher's assigned subjects.

Query: `subjectId`, `section`, `semester`, `search`

### GET `/teacher/students/:studentId/attendance` 📚

View a specific student's attendance across teacher's subjects.

---

## 5. Student Endpoints

### GET `/student/profile` 🎓

Get own student profile.

### PUT `/student/profile` 🎓

Update own profile (phone, address, avatar).

### GET `/student/dashboard` 🎓

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "overallAttendance": 82.4,
    "subjects": [
      {
        "subjectName": "DBMS",
        "subjectCode": "CS-301",
        "present": 45,
        "total": 55,
        "percentage": 81.8,
        "status": "normal"
      },
      {
        "subjectName": "Computer Networks",
        "subjectCode": "CS-302",
        "present": 31,
        "total": 50,
        "percentage": 62.0,
        "status": "critical"
      }
    ],
    "upcomingClasses": [...],
    "pendingLeaves": 1,
    "notifications": 3
  }
}
```

### GET `/student/attendance` 🎓

View own attendance.

Query: `subjectId`, `startDate`, `endDate`

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "attendance": [
      {
        "date": "2026-07-16",
        "subject": "DBMS",
        "period": "3",
        "status": "Present",
        "markedBy": "face_recognition"
      }
    ],
    "summary": {
      "total": 55,
      "present": 45,
      "absent": 8,
      "late": 1,
      "leave": 1,
      "percentage": 83.6
    }
  }
}
```

---

## 6. Attendance Endpoints

### POST `/attendance/sessions` 📚

Start a new attendance session.

**Request Body:**
```json
{
  "subjectId": "64f6g7h8i9j0k1l2m3n4o5p6",
  "section": "A",
  "semester": 6,
  "date": "2026-07-16",
  "period": "3",
  "room": "CR-205",
  "timetableSlotId": "65i9j0k1l2m3n4o5p6q7r8s9"
}
```

**Response 201 Created:**
```json
{
  "success": true,
  "data": {
    "session": {
      "_id": "65g7h8...",
      "status": "open",
      "totalStudents": 60,
      "openedAt": "2026-07-16T10:00:00.000Z"
    }
  }
}
```

**Status Codes:** `201`, `409` (session already exists for this slot)

---

### GET `/attendance/sessions` 📚

List attendance sessions.

Query: `subjectId`, `date`, `status`, `section`, `page`, `limit`

---

### GET `/attendance/sessions/:sessionId` 🔑+

Get session details with attendance records.

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "session": {
      "_id": "65g7h8...",
      "subject": { "name": "DBMS", "code": "CS-301" },
      "date": "2026-07-16",
      "period": "3",
      "status": "open",
      "totalPresent": 52,
      "totalAbsent": 8
    },
    "records": [
      {
        "student": { "_id": "...", "name": "Amit Kumar", "rollNumber": "CS2022001" },
        "status": "Present",
        "markedBy": "face_recognition",
        "confidenceScore": 0.94
      }
    ]
  }
}
```

---

### POST `/attendance/sessions/:sessionId/mark` 📚

Manually mark attendance for a student.

**Request Body:**
```json
{
  "studentId": "64b2c3...",
  "status": "Present"
}
```

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "attendance": {
      "_id": "65h8i9...",
      "studentId": "64b2c3...",
      "status": "Present",
      "markedBy": "manual"
    }
  }
}
```

---

### POST `/attendance/sessions/:sessionId/mark-face` 📚

Process face recognition result and mark attendance.

**Request Body:**
```json
{
  "recognizedStudents": [
    { "studentId": "64b2c3...", "confidence": 0.94 },
    { "studentId": "64c3d4...", "confidence": 0.87 }
  ]
}
```

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "markedCount": 2,
    "results": [
      { "studentId": "64b2c3...", "name": "Amit Kumar", "status": "Present" }
    ]
  }
}
```

---

### PATCH `/attendance/sessions/:sessionId/close` 📚

Close session and mark remaining students Absent.

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "session": {
      "status": "closed",
      "totalPresent": 52,
      "totalAbsent": 8,
      "closedAt": "2026-07-16T10:15:00.000Z"
    },
    "autoMarkedAbsent": 8
  }
}
```

---

### PUT `/attendance/:attendanceId` 🔑+

Edit a specific attendance record.

**Request Body:**
```json
{
  "status": "Present",
  "reason": "Face recognition failed due to poor lighting"
}
```

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "attendance": {
      "_id": "65h8i9...",
      "status": "Present",
      "isEdited": true,
      "editHistory": [
        {
          "previousStatus": "Absent",
          "newStatus": "Present",
          "reason": "Face recognition failed due to poor lighting",
          "editedAt": "2026-07-16T11:00:00.000Z"
        }
      ]
    }
  }
}
```

---

## 7. Timetable Endpoints

### GET `/timetable` 🔑+

Get timetable. Role-based auto-filter.
- Admin: all timetables (filter by dept/course/section)
- Teacher: own schedule
- Student: own class schedule

Query: `courseId`, `section`, `semester`, `academicYear`, `day`

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "timetable": {
      "Monday": [
        {
          "period": "1",
          "startTime": "09:00",
          "endTime": "10:00",
          "subject": { "name": "Mathematics", "code": "CS-301" },
          "teacher": { "name": "Dr. Priya Patel" },
          "room": "CR-101"
        }
      ],
      "Tuesday": [...]
    }
  }
}
```

---

### POST `/timetable` 👑

Create timetable slot.

**Request Body:**
```json
{
  "departmentId": "64d4...",
  "courseId": "64e5...",
  "subjectId": "64f6...",
  "teacherId": "65a1...",
  "section": "A",
  "semester": 6,
  "day": "Monday",
  "startTime": "10:00",
  "endTime": "11:00",
  "period": "3",
  "room": "CR-205",
  "academicYear": "2025-2026"
}
```

**Response 201 Created / 409 Conflict:**
```json
// Conflict response:
{
  "success": false,
  "error": {
    "code": "TIMETABLE_CONFLICT",
    "message": "Teacher already scheduled at Monday Period 3",
    "conflictingSlot": { "subject": "CN", "room": "CR-301" }
  }
}
```

### PUT `/timetable/:id` 👑
### DELETE `/timetable/:id` 👑

---

## 8. Leave Request Endpoints

### GET `/leaves` 🔑+

List leave requests.
- Student: own requests only
- Teacher: requests for students in their subjects
- Admin: all requests

Query: `status`, `studentId`, `startDate`, `endDate`, `page`, `limit`

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "leaves": [
      {
        "_id": "65j0k1...",
        "student": { "name": "Amit Kumar", "rollNumber": "CS2022001" },
        "startDate": "2026-07-20",
        "endDate": "2026-07-22",
        "leaveType": "medical",
        "reason": "Fever",
        "status": "pending",
        "createdAt": "2026-07-18T10:00:00.000Z"
      }
    ],
    "pagination": { "total": 12, "page": 1 }
  }
}
```

---

### POST `/leaves` 🎓

Submit leave request.

**Request Body (multipart/form-data):**
```
startDate: 2026-07-20
endDate: 2026-07-22
leaveType: medical
reason: Fever and doctor advised rest
document: [file upload - optional]
```

**Response 201 Created:**
```json
{
  "success": true,
  "data": {
    "leaveRequest": {
      "_id": "65j0k1...",
      "status": "pending",
      "affectedDays": 3
    }
  }
}
```

---

### GET `/leaves/:leaveId` 🔑+
### PATCH `/leaves/:leaveId/approve` 📚👑

**Request Body:**
```json
{
  "action": "approve",
  "comment": "Approved. Please provide medical certificate on return."
}
```

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "leaveRequest": { "status": "approved", "processedAt": "2026-07-19T15:00:00.000Z" }
  }
}
```

### PATCH `/leaves/:leaveId/cancel` 🎓

Cancel a pending leave request.

---

## 9. Face Recognition (CV API)

> **Note:** CV API base URL: `https://frams-cv.onrender.com/api`
> All CV API requests include header: `X-API-Key: {CV_API_KEY}`

---

### POST `/cv/enroll/start` 🔑+

Start face enrollment session.

**Request Body:**
```json
{ "studentId": "64b2c3..." }
```

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "sessionId": "enroll_abc123",
    "targetImages": 100,
    "instructions": "Look straight at the camera. We will guide you through different angles."
  }
}
```

---

### POST `/cv/enroll/capture` 🔑+

Submit webcam frame for enrollment.

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "sessionId": "enroll_abc123",
  "frame": "data:image/jpeg;base64,/9j/4AAQSkZJRgAB..."
}
```

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "captured": 23,
    "target": 100,
    "quality": "good",
    "angle": "frontal",
    "instruction": "Now turn slightly to the left",
    "faceDetected": true
  }
}
```

---

### POST `/cv/enroll/complete` 🔑+

Finalize enrollment – compute encodings and save.

**Request Body:**
```json
{ "sessionId": "enroll_abc123", "studentId": "64b2c3..." }
```

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "studentId": "64b2c3...",
    "imagesProcessed": 87,
    "encodingsGenerated": 87,
    "qualityScore": 91.5,
    "status": "verified"
  }
}
```

---

### POST `/cv/recognize` 📚

Perform face recognition on a webcam frame.

**Request Body:**
```json
{
  "sessionId": "65g7h8...",
  "frame": "data:image/jpeg;base64,/9j/4AAQSkZJRgAB...",
  "section": "A",
  "courseId": "64e5...",
  "semester": 6
}
```

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "recognized": [
      {
        "studentId": "64b2c3...",
        "name": "Amit Kumar",
        "rollNumber": "CS2022001",
        "confidence": 0.94,
        "isLive": true,
        "boundingBox": { "top": 120, "right": 340, "bottom": 280, "left": 180 }
      }
    ],
    "facesDetected": 3,
    "facesRecognized": 1,
    "processingTime": 1.23
  }
}
```

---

### POST `/cv/liveness-check` 📚

Perform standalone liveness detection.

**Request Body:**
```json
{
  "frames": ["base64_frame1", "base64_frame2", "base64_frame3"]
}
```

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "isLive": true,
    "method": "blink",
    "earScore": 0.21,
    "blinksDetected": 2,
    "confidence": 0.95
  }
}
```

---

### POST `/cv/enroll/delete` 👑

Delete a student's face dataset from CV API memory.

```json
{ "studentId": "64b2c3..." }
```

---

### POST `/cv/model/rebuild` 👑

Rebuild the known faces in-memory registry.

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "knownFaces": 245,
    "rebuiltAt": "2026-07-16T11:30:00.000Z",
    "timeTakenMs": 8432
  }
}
```

---

### GET `/cv/health` 🔓

Check CV API health.

```json
{
  "status": "ok",
  "version": "1.0.0",
  "loadedFaces": 245,
  "uptime": 3600
}
```

---

## 10. Analytics & Reports

### GET `/analytics/student/:studentId` 🔑+

Get detailed analytics for a student.

Query: `subjectId`, `startDate`, `endDate`

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "student": { "name": "Amit Kumar", "rollNumber": "CS2022001" },
    "overall": {
      "present": 320,
      "total": 400,
      "percentage": 80.0,
      "status": "normal"
    },
    "subjects": [
      {
        "subjectId": "64f6...",
        "subjectName": "DBMS",
        "subjectCode": "CS-301",
        "present": 45,
        "absent": 8,
        "late": 1,
        "leave": 1,
        "total": 55,
        "percentage": 83.6,
        "status": "normal"
      }
    ],
    "weeklyTrend": [
      { "week": "2026-W27", "percentage": 85.0 },
      { "week": "2026-W28", "percentage": 80.0 }
    ],
    "monthlyTrend": [
      { "month": "June 2026", "percentage": 82.1 }
    ]
  }
}
```

---

### GET `/analytics/class` 📚👑

Class-level attendance analytics.

Query: `subjectId`, `section`, `semester`, `startDate`, `endDate`

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "subject": { "name": "DBMS" },
    "summary": {
      "totalStudents": 60,
      "averageAttendance": 81.3,
      "below75": 8
    },
    "students": [
      {
        "name": "Amit Kumar",
        "rollNumber": "CS2022001",
        "percentage": 81.8,
        "present": 45,
        "absent": 8,
        "status": "normal"
      }
    ],
    "dateWise": [
      {
        "date": "2026-07-16",
        "period": "3",
        "present": 52,
        "absent": 8,
        "rate": 86.7
      }
    ]
  }
}
```

---

### GET `/analytics/department` 👑

Department-level attendance statistics.

---

### GET `/reports/generate` 📚👑

Generate attendance report.

Query: `type` (student/class/subject/department), `targetId`, `startDate`, `endDate`, `format` (json/pdf/excel)

**Response (JSON format):** Report data object
**Response (PDF/Excel):** Binary file download with appropriate headers

---

### GET `/reports` 📚👑

List generated reports.

---

## 11. AI / ML Predictions

### GET `/predictions/student/:studentId` 📚👑

Get attendance risk prediction for a student.

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "predictions": [
      {
        "subject": { "name": "DBMS", "code": "CS-301" },
        "riskLevel": "high",
        "probability": 0.87,
        "currentAttendance": 68.5,
        "predictedEndAttendance": 62.1,
        "remainingLectures": 18,
        "recommendation": "Student needs to attend all remaining 18 lectures to reach 75%",
        "modelVersion": "v1.2",
        "predictedAt": "2026-07-16T00:00:00.000Z"
      }
    ]
  }
}
```

---

### GET `/predictions/class` 📚👑

Risk predictions for entire class.

Query: `subjectId`, `section`, `semester`

**Response:** Array of student predictions sorted by risk level.

---

### POST `/predictions/send-alerts` 📚👑

Send notification to high-risk students.

```json
{
  "subjectId": "64f6...",
  "section": "A",
  "riskThreshold": "high"
}
```

**Response 200 OK:**
```json
{
  "success": true,
  "data": { "notificationsSent": 8 }
}
```

---

### POST `/predictions/retrain` 👑

Trigger model retraining.

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "modelVersion": "v1.3",
    "accuracy": 0.89,
    "f1Score": 0.87,
    "trainedOn": 1250,
    "trainedAt": "2026-07-16T12:00:00.000Z"
  }
}
```

---

## 12. Notification Endpoints

### GET `/notifications` 🔑+

Get user's notifications.

Query: `isRead`, `type`, `page`, `limit`

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "65m3...",
        "type": "low_attendance",
        "title": "Low Attendance Alert",
        "message": "Your attendance in DBMS has fallen below 75% (68.5%)",
        "isRead": false,
        "createdAt": "2026-07-16T10:15:00.000Z"
      }
    ],
    "unreadCount": 3,
    "pagination": { "total": 15 }
  }
}
```

---

### PATCH `/notifications/:notificationId/read` 🔑+

Mark single notification as read.

### PATCH `/notifications/read-all` 🔑+

Mark all notifications as read.

### DELETE `/notifications/:notificationId` 🔑+

Delete a notification.

---

## 13. Audit Log Endpoints

### GET `/admin/audit-logs` 👑

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `userId` | ObjectId | Filter by user |
| `action` | string | Filter by action type |
| `entity` | string | Filter by entity type |
| `entityId` | ObjectId | Filter by entity ID |
| `startDate` | date | Start of date range |
| `endDate` | date | End of date range |
| `success` | boolean | Filter by success/failure |
| `page` | number | Pagination |
| `limit` | number | Page size |

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "_id": "65n4...",
        "user": { "name": "Ravi Sharma", "email": "ravi@college.edu" },
        "action": "ATTENDANCE_EDIT",
        "entity": "Attendance",
        "entityId": "65h8i9...",
        "previousValue": { "status": "Absent" },
        "newValue": { "status": "Present" },
        "ipAddress": "192.168.1.100",
        "timestamp": "2026-07-16T11:00:00.000Z"
      }
    ],
    "pagination": { "total": 1450, "page": 1 }
  }
}
```

---

## 14. System Configuration

### GET `/admin/config` 👑

Get all system configuration.

### PUT `/admin/config/:key` 👑

Update a configuration value.

```json
{ "value": "80", "description": "Updated threshold to 80%" }
```

---

### GET `/admin/stats` 👑

System-wide statistics for admin dashboard.

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "users": { "total": 320, "students": 280, "teachers": 38, "admins": 2 },
    "departments": 5,
    "courses": 8,
    "subjects": 64,
    "attendance": {
      "todayRate": 84.2,
      "weeklyAvg": 81.5,
      "totalSessions": 2450
    },
    "pendingLeaves": 12,
    "faceEnrolled": 265,
    "notEnrolled": 15
  }
}
```

---

## 15. Error Reference

### Standard Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### HTTP Status Codes

| Code | Meaning | Common Causes |
|---|---|---|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation error, missing fields |
| 401 | Unauthorized | Missing/invalid/expired JWT |
| 403 | Forbidden | Insufficient role permissions |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Duplicate resource (email, session) |
| 422 | Unprocessable | Semantic validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unhandled server error |
| 503 | Service Unavailable | CV API unavailable |

### Common Error Codes

| Error Code | Description |
|---|---|
| `INVALID_CREDENTIALS` | Wrong email or password |
| `TOKEN_EXPIRED` | JWT access token expired |
| `TOKEN_INVALID` | JWT signature invalid |
| `ACCOUNT_DISABLED` | User account is deactivated |
| `FORBIDDEN` | Role not authorized for this action |
| `VALIDATION_ERROR` | Input validation failed |
| `RESOURCE_NOT_FOUND` | Requested document not found |
| `DUPLICATE_EMAIL` | Email already registered |
| `SESSION_ALREADY_EXISTS` | Attendance session already open for slot |
| `SESSION_CLOSED` | Attendance session is already closed |
| `FACE_NOT_ENROLLED` | Student has no face dataset |
| `TIMETABLE_CONFLICT` | Scheduling conflict detected |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `CV_API_UNAVAILABLE` | Python CV API is not reachable |
| `EDIT_WINDOW_EXPIRED` | Attendance edit window of 48h has passed |
| `OTP_EXPIRED` | Password reset OTP has expired |

---

### Request Validation Rules

| Field | Rules |
|---|---|
| `email` | Valid email format, max 255 chars |
| `password` | Min 8 chars, at least 1 uppercase, 1 number, 1 special char |
| `name` | 2–100 chars, letters and spaces only |
| `phone` | 10-digit numeric string |
| `date` | ISO 8601 format (YYYY-MM-DD) |
| `page` | Integer ≥ 1 |
| `limit` | Integer 1–100 |
| `frame` | Base64 data URI string, JPEG or PNG |

---

*End of API Documentation*
*FRAMS Project | B.Tech CS Final Year | Version 1.0 | July 2026*
