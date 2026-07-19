# Database Schema Reference
## AI-Powered Face Recognition Attendance Management System (FRAMS)

**Database:** MongoDB Atlas (v6.0+)
**ODM:** Mongoose v7+
**Strategy:** Document-oriented with ObjectId references (no embedded sub-documents for independent entities)

---

## Table of Contents

1. [users](#1-users-collection)
2. [students](#2-students-collection)
3. [teachers](#3-teachers-collection)
4. [departments](#4-departments-collection)
5. [courses](#5-courses-collection)
6. [subjects](#6-subjects-collection)
7. [attendance_sessions](#7-attendance_sessions-collection)
8. [attendances](#8-attendances-collection)
9. [timetables](#9-timetables-collection)
10. [leave_requests](#10-leave_requests-collection)
11. [notifications](#11-notifications-collection)
12. [face_datasets](#12-face_datasets-collection)
13. [reports](#13-reports-collection)
14. [predictions](#14-predictions-collection)
15. [audit_logs](#15-audit_logs-collection)
16. [system_configs](#16-system_configs-collection)
17. [refresh_tokens](#17-refresh_tokens-collection)

---

## 1. `users` Collection

### Schema Definition

```javascript
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  passwordHash: {
    type: String,
    required: true,
    select: false   // Never returned in API responses by default
  },
  role: {
    type: String,
    enum: ['admin', 'teacher', 'student'],
    required: true
  },
  phone: {
    type: String,
    match: /^[0-9]{10}$/,
    default: null
  },
  avatar: {
    type: String,   // ImageKit URL
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  resetOtp: {
    type: String,
    select: false
  },
  resetOtpExpiry: {
    type: Date,
    select: false
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true   // adds createdAt, updatedAt
});
```

### Indexes

| Index | Fields | Type | Options |
|---|---|---|---|
| email_unique | `email` | Single | `unique: true` |
| role_active | `role, isActive` | Compound | – |

### Field Reference Table

| Field | Type | Required | Unique | Description |
|---|---|---|---|---|
| `_id` | ObjectId | Auto | Yes | MongoDB primary key |
| `name` | String | Yes | No | Full name (2–100 chars) |
| `email` | String | Yes | Yes | Login email, lowercase |
| `passwordHash` | String | Yes | No | BCrypt hash (not returned in API) |
| `role` | String(enum) | Yes | No | `admin`, `teacher`, or `student` |
| `phone` | String | No | No | 10-digit mobile number |
| `avatar` | String | No | No | ImageKit.io CDN URL |
| `isActive` | Boolean | – | – | False = deactivated account |
| `isEmailVerified` | Boolean | – | – | Email verification status |
| `resetOtp` | String | No | No | Hashed OTP for password reset |
| `resetOtpExpiry` | Date | No | No | OTP expiry timestamp |
| `lastLogin` | Date | No | No | Last successful login time |
| `createdAt` | Date | Auto | – | Mongoose timestamp |
| `updatedAt` | Date | Auto | – | Mongoose timestamp |

### Sample Document

```json
{
  "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
  "name": "Ravi Sharma",
  "email": "ravi.sharma@college.edu",
  "role": "teacher",
  "phone": "9876543210",
  "avatar": "https://ik.imagekit.io/frams/avatars/64a1.jpg",
  "isActive": true,
  "isEmailVerified": true,
  "lastLogin": "2026-07-16T06:30:00.000Z",
  "createdAt": "2026-01-15T09:00:00.000Z",
  "updatedAt": "2026-07-16T06:30:00.000Z"
}
```

---

## 2. `students` Collection

### Schema Definition

```javascript
const studentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  rollNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  section: {
    type: String,
    required: true,
    uppercase: true,
    maxlength: 2
  },
  currentSemester: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  batchYear: {
    type: Number,
    required: true
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    default: null
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  guardianName: { type: String, default: null },
  guardianPhone: { type: String, default: null },
  faceEnrolled: { type: Boolean, default: false },
  enrolledAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});
```

### Indexes

| Index | Fields | Type | Options |
|---|---|---|---|
| userId_unique | `userId` | Single | `unique: true` |
| rollNumber_unique | `rollNumber` | Single | `unique: true` |
| dept_course_batch | `departmentId, courseId, batchYear` | Compound | – |
| section_semester | `section, currentSemester` | Compound | – |

### Sample Document

```json
{
  "_id": "64b2c3d4e5f6g7h8i9j0k1l2",
  "userId": "64c3d4e5f6g7h8i9j0k1l2m3",
  "departmentId": "64d4e5f6g7h8i9j0k1l2m3n4",
  "courseId": "64e5f6g7h8i9j0k1l2m3n4o5",
  "rollNumber": "CS2022001",
  "section": "A",
  "currentSemester": 6,
  "batchYear": 2022,
  "bloodGroup": "B+",
  "address": {
    "street": "123 MG Road",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560001"
  },
  "guardianName": "Suresh Kumar",
  "guardianPhone": "9876500001",
  "faceEnrolled": true,
  "enrolledAt": "2022-08-01T00:00:00.000Z",
  "createdAt": "2022-08-01T09:00:00.000Z",
  "updatedAt": "2026-07-10T11:00:00.000Z"
}
```

---

## 3. `teachers` Collection

### Schema Definition

```javascript
const teacherSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  employeeId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  qualification: { type: String, default: null },
  designation: {
    type: String,
    enum: ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Lab Instructor'],
    default: 'Lecturer'
  },
  experienceYears: { type: Number, default: 0, min: 0 },
  joiningDate: { type: Date, default: Date.now }
}, {
  timestamps: true
});
```

### Sample Document

```json
{
  "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
  "userId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "departmentId": "64d4e5f6g7h8i9j0k1l2m3n4",
  "employeeId": "EMP-CS-0042",
  "qualification": "M.Tech (Computer Science)",
  "designation": "Assistant Professor",
  "experienceYears": 5,
  "joiningDate": "2021-06-01T00:00:00.000Z",
  "createdAt": "2021-06-01T09:00:00.000Z",
  "updatedAt": "2024-01-01T09:00:00.000Z"
}
```

---

## 4. `departments` Collection

### Schema Definition

```javascript
const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, maxlength: 10 },
  hodId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  totalSemesters: { type: Number, required: true, min: 2, max: 10 },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});
```

### Sample Document

```json
{
  "_id": "64d4e5f6g7h8i9j0k1l2m3n4",
  "name": "Computer Science and Engineering",
  "code": "CS",
  "hodId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "totalSemesters": 8,
  "description": "Department of Computer Science and Engineering offering B.Tech and M.Tech programs",
  "isActive": true,
  "createdAt": "2020-01-01T09:00:00.000Z",
  "updatedAt": "2026-01-01T09:00:00.000Z"
}
```

---

## 5. `courses` Collection

### Schema Definition

```javascript
const courseSchema = new mongoose.Schema({
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  courseName: { type: String, required: true, trim: true },
  courseCode: { type: String, required: true, unique: true, uppercase: true },
  duration: { type: Number, required: true, comment: 'Duration in years' },
  totalSemesters: { type: Number, required: true },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});
```

### Sample Document

```json
{
  "_id": "64e5f6g7h8i9j0k1l2m3n4o5",
  "departmentId": "64d4e5f6g7h8i9j0k1l2m3n4",
  "courseName": "Bachelor of Technology - Computer Science",
  "courseCode": "BTECH-CS",
  "duration": 4,
  "totalSemesters": 8,
  "description": "4-year undergraduate program in Computer Science Engineering",
  "isActive": true,
  "createdAt": "2020-01-01T09:00:00.000Z",
  "updatedAt": "2020-01-01T09:00:00.000Z"
}
```

---

## 6. `subjects` Collection

### Schema Definition

```javascript
const subjectSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
  subjectName: { type: String, required: true, trim: true },
  subjectCode: { type: String, required: true, unique: true, uppercase: true },
  semester: { type: Number, required: true, min: 1, max: 10 },
  creditHours: { type: Number, required: true, min: 1, max: 6 },
  totalLectures: { type: Number, default: 0 },
  isElective: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});
```

### Indexes

| Index | Fields | Purpose |
|---|---|---|
| `subjectCode` | Single Unique | Subject lookup |
| `(courseId, semester)` | Compound | Semester subjects list |
| `teacherId` | Single | Teacher's subjects |

### Sample Document

```json
{
  "_id": "64f6g7h8i9j0k1l2m3n4o5p6",
  "courseId": "64e5f6g7h8i9j0k1l2m3n4o5",
  "departmentId": "64d4e5f6g7h8i9j0k1l2m3n4",
  "teacherId": "65a1b2c3d4e5f6g7h8i9j0k1",
  "subjectName": "Database Management Systems",
  "subjectCode": "CS-301",
  "semester": 6,
  "creditHours": 4,
  "totalLectures": 60,
  "isElective": false,
  "isActive": true,
  "createdAt": "2023-06-01T09:00:00.000Z",
  "updatedAt": "2023-06-01T09:00:00.000Z"
}
```

---

## 7. `attendance_sessions` Collection

### Schema Definition

```javascript
const attendanceSessionSchema = new mongoose.Schema({
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  section: { type: String, required: true },
  semester: { type: Number, required: true },
  timetableSlotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Timetable', default: null },
  date: { type: Date, required: true },
  period: { type: String, required: true },
  room: { type: String, default: '' },
  qrToken: { type: String, default: null },
  qrExpiry: { type: Date, default: null },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  radius: { type: Number, default: 50, comment: 'Allowed geolocation radius in meters' },
  status: { type: String, enum: ['open', 'closed', 'cancelled'], default: 'open' },
  totalStudents: { type: Number, default: 0 },
  totalPresent: { type: Number, default: 0 },
  totalAbsent: { type: Number, default: 0 },
  totalLate: { type: Number, default: 0 },
  totalLeave: { type: Number, default: 0 },
  openedAt: { type: Date, default: Date.now },
  closedAt: { type: Date, default: null },
  notes: { type: String, default: '' }
}, {
  timestamps: true
});
```

### Indexes

| Index | Fields | Type | Purpose |
|---|---|---|---|
| session_unique | `(subjectId, date, period, section)` | Compound Unique | Prevent duplicate sessions |
| teacher_date | `(teacherId, date)` | Compound | Teacher's sessions by day |
| status_date | `(status, date)` | Compound | Open sessions query |

### Sample Document

```json
{
  "_id": "65g7h8i9j0k1l2m3n4o5p6q7",
  "subjectId": "64f6g7h8i9j0k1l2m3n4o5p6",
  "teacherId": "65a1b2c3d4e5f6g7h8i9j0k1",
  "departmentId": "64d4e5f6g7h8i9j0k1l2m3n4",
  "courseId": "64e5f6g7h8i9j0k1l2m3n4o5",
  "section": "A",
  "semester": 6,
  "date": "2026-07-16T00:00:00.000Z",
  "period": "3",
  "room": "CR-205",
  "qrToken": "qr_session_token_xyz789",
  "qrExpiry": "2026-07-16T10:30:00.000Z",
  "latitude": 12.971598,
  "longitude": 77.594566,
  "radius": 50,
  "status": "closed",
  "totalStudents": 60,
  "totalPresent": 52,
  "totalAbsent": 7,
  "totalLate": 1,
  "totalLeave": 0,
  "openedAt": "2026-07-16T10:00:00.000Z",
  "closedAt": "2026-07-16T10:15:00.000Z",
  "createdAt": "2026-07-16T10:00:00.000Z",
  "updatedAt": "2026-07-16T10:15:00.000Z"
}
```

---

## 8. `attendances` Collection

### Schema Definition

```javascript
const attendanceSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceSession', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  date: { type: Date, required: true },
  period: { type: String, required: true },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late', 'Leave'],
    required: true,
    default: 'Absent'
  },
  markedBy: {
    type: String,
    enum: ['face_recognition', 'manual', 'qr_scanner', 'system'],
    required: true
  },
  location: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null }
  },
  confidenceScore: { type: Number, min: 0, max: 1, default: null },
  isEdited: { type: Boolean, default: false },
  editHistory: [{
    previousStatus: String,
    newStatus: String,
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    editedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});
```

### Indexes

| Index | Fields | Type | Purpose |
|---|---|---|---|
| session_student_unique | `(sessionId, studentId)` | Compound Unique | One record per student per session |
| student_subject_date | `(studentId, subjectId, date)` | Compound | Student report queries |
| session_status | `(sessionId, status)` | Compound | Session summary calculation |
| subject_date_range | `(subjectId, date)` | Compound | Date-range report queries |

### Sample Document

```json
{
  "_id": "65h8i9j0k1l2m3n4o5p6q7r8",
  "sessionId": "65g7h8i9j0k1l2m3n4o5p6q7",
  "studentId": "64b2c3d4e5f6g7h8i9j0k1l2",
  "subjectId": "64f6g7h8i9j0k1l2m3n4o5p6",
  "teacherId": "65a1b2c3d4e5f6g7h8i9j0k1",
  "date": "2026-07-16T00:00:00.000Z",
  "period": "3",
  "status": "Present",
  "markedBy": "face_recognition",
  "confidenceScore": 0.94,
  "isEdited": false,
  "editHistory": [],
  "createdAt": "2026-07-16T10:05:33.000Z",
  "updatedAt": "2026-07-16T10:05:33.000Z"
}
```

---

## 9. `timetables` Collection

### Schema Definition

```javascript
const timetableSchema = new mongoose.Schema({
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  section: { type: String, required: true, uppercase: true },
  semester: { type: Number, required: true },
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true
  },
  startTime: { type: String, required: true },  // HH:MM format
  endTime: { type: String, required: true },
  period: { type: String, required: true },
  room: { type: String, required: true },
  academicYear: { type: String, required: true }, // e.g., "2025-2026"
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});
```

### Indexes

| Index | Fields | Purpose |
|---|---|---|
| teacher_conflict | `(teacherId, day, period, academicYear)` | Teacher double-booking check |
| room_conflict | `(room, day, period, academicYear)` | Room conflict check |
| class_schedule | `(courseId, section, semester, day, academicYear)` | Class timetable view |

### Sample Document

```json
{
  "_id": "65i9j0k1l2m3n4o5p6q7r8s9",
  "departmentId": "64d4e5f6g7h8i9j0k1l2m3n4",
  "courseId": "64e5f6g7h8i9j0k1l2m3n4o5",
  "subjectId": "64f6g7h8i9j0k1l2m3n4o5p6",
  "teacherId": "65a1b2c3d4e5f6g7h8i9j0k1",
  "section": "A",
  "semester": 6,
  "day": "Monday",
  "startTime": "10:00",
  "endTime": "11:00",
  "period": "3",
  "room": "CR-205",
  "academicYear": "2025-2026",
  "isActive": true,
  "createdAt": "2025-06-01T09:00:00.000Z",
  "updatedAt": "2025-06-01T09:00:00.000Z"
}
```

---

## 10. `leave_requests` Collection

### Schema Definition

```javascript
const leaveRequestSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  leaveType: {
    type: String,
    enum: ['medical', 'personal', 'exam', 'emergency', 'family'],
    required: true
  },
  reason: { type: String, required: true, maxlength: 500 },
  documentUrl: { type: String, default: null },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvalComment: { type: String, default: null },
  processedAt: { type: Date, default: null },
  affectedDays: { type: Number, default: 0 },
  affectedSubjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }]
}, {
  timestamps: true
});
```

### Sample Document

```json
{
  "_id": "65j0k1l2m3n4o5p6q7r8s9t0",
  "studentId": "64b2c3d4e5f6g7h8i9j0k1l2",
  "startDate": "2026-07-20T00:00:00.000Z",
  "endDate": "2026-07-22T00:00:00.000Z",
  "leaveType": "medical",
  "reason": "Fever and doctor advised 3 days rest",
  "documentUrl": "https://ik.imagekit.io/frams/leaves/doc_65j0.pdf",
  "status": "approved",
  "approvedBy": "64a1b2c3d4e5f6g7h8i9j0k1",
  "approvalComment": "Approved. Get well soon.",
  "processedAt": "2026-07-19T15:00:00.000Z",
  "affectedDays": 3,
  "affectedSubjects": ["64f6g7h8i9j0k1l2m3n4o5p6"],
  "createdAt": "2026-07-18T10:00:00.000Z",
  "updatedAt": "2026-07-19T15:00:00.000Z"
}
```

---

## 11. `notifications` Collection

### Schema Definition

```javascript
const notificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['low_attendance', 'leave_submitted', 'leave_approved', 'leave_rejected',
           'timetable_update', 'system', 'announcement', 'face_enrolled', 'prediction_alert'],
    required: true
  },
  title: { type: String, required: true, maxlength: 200 },
  message: { type: String, required: true, maxlength: 1000 },
  link: { type: String, default: null },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  timestamps: true
});
```

### Indexes

| Index | Fields | Purpose |
|---|---|---|
| recipient_read | `(recipientId, isRead)` | Unread count badge |
| recipient_created | `(recipientId, createdAt: -1)` | Recent notifications |
| createdAt TTL | `createdAt` | Auto-delete after 90 days |

---

## 12. `face_datasets` Collection

### Schema Definition

```javascript
const faceDatasetSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    unique: true
  },
  encodings: {
    type: [[Number]],   // Array of float[128] arrays
    required: true,
    default: []
  },
  imageUrls: [{ type: String }],
  imageFileIds: [{ type: String }],
  imageCount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'processing', 'verified', 'failed', 'stale'],
    default: 'pending'
  },
  qualityScore: { type: Number, min: 0, max: 100, default: null },
  enrolledAt: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true
});
```

### Field Details

| Field | Type | Description |
|---|---|---|
| `studentId` | ObjectId | Reference to Student (unique — one dataset per student) |
| `encodings` | Array of Array(128) of Number | 128-dim face descriptor vectors from dlib |
| `imageUrls` | String[] | ImageKit.io CDN URLs for stored face images |
| `imageFileIds` | String[] | ImageKit.io fileId values (for deletion) |
| `imageCount` | Number | Count of stored images (minimum 50 for reliable recognition) |
| `status` | Enum | `verified` = ready for recognition |
| `qualityScore` | Number | Average image quality score (0–100) |

### Sample Document

```json
{
  "_id": "65k1l2m3n4o5p6q7r8s9t0u1",
  "studentId": "64b2c3d4e5f6g7h8i9j0k1l2",
  "encodings": [
    [-0.1234, 0.5678, 0.2345, "...128 values total..."],
    [-0.1289, 0.5601, 0.2310, "...128 values total..."]
  ],
  "imageUrls": [
    "https://ik.imagekit.io/frams/faces/CS2022001/img_001.jpg",
    "https://ik.imagekit.io/frams/faces/CS2022001/img_002.jpg"
  ],
  "imageFileIds": [
    "file_id_img_001",
    "file_id_img_002"
  ],
  "imageCount": 87,
  "status": "verified",
  "qualityScore": 91.5,
  "enrolledAt": "2026-01-20T11:00:00.000Z",
  "lastUpdated": "2026-01-20T11:05:00.000Z",
  "createdAt": "2026-01-20T11:00:00.000Z",
  "updatedAt": "2026-01-20T11:05:00.000Z"
}
```

---

## 13. `reports` Collection

### Schema Definition

```javascript
const reportSchema = new mongoose.Schema({
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportType: {
    type: String,
    enum: ['student', 'class', 'subject', 'department', 'overall'],
    required: true
  },
  targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
  targetType: { type: String, enum: ['student', 'class', 'subject', 'department'], default: null },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  filters: { type: mongoose.Schema.Types.Mixed, default: {} },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  format: { type: String, enum: ['json', 'pdf', 'excel'], default: 'json' },
  fileUrl: { type: String, default: null },
  generatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});
```

---

## 14. `predictions` Collection

### Schema Definition

```javascript
const predictionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
  predictionType: {
    type: String,
    enum: ['attendance_risk', 'recognition_event'],
    required: true
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: null
  },
  probability: { type: Number, min: 0, max: 1, default: null },
  currentAttendance: { type: Number, min: 0, max: 100, default: null },
  predictedEndAttendance: { type: Number, min: 0, max: 100, default: null },
  remainingLectures: { type: Number, default: null },
  features: { type: mongoose.Schema.Types.Mixed, default: {} },
  modelVersion: { type: String, default: 'v1.0' },
  predictedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});
```

### Sample Document

```json
{
  "_id": "65l2m3n4o5p6q7r8s9t0u1v2",
  "studentId": "64b2c3d4e5f6g7h8i9j0k1l2",
  "subjectId": "64f6g7h8i9j0k1l2m3n4o5p6",
  "predictionType": "attendance_risk",
  "riskLevel": "high",
  "probability": 0.87,
  "currentAttendance": 68.5,
  "predictedEndAttendance": 62.1,
  "remainingLectures": 18,
  "features": {
    "weeklyAbsenceRate": 0.42,
    "longestAbsenceStreak": 5,
    "leavesTaken": 3,
    "mondayAbsenceRate": 0.6
  },
  "modelVersion": "v1.2",
  "predictedAt": "2026-07-16T00:00:00.000Z",
  "createdAt": "2026-07-16T00:00:00.000Z",
  "updatedAt": "2026-07-16T00:00:00.000Z"
}
```

---

## 15. `audit_logs` Collection

### Schema Definition

```javascript
const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  action: {
    type: String,
    enum: [
      'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'USER_ACTIVATE', 'USER_DEACTIVATE',
      'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGE', 'PASSWORD_RESET',
      'ATTENDANCE_MARK', 'ATTENDANCE_EDIT', 'SESSION_OPEN', 'SESSION_CLOSE',
      'FACE_ENROLL', 'FACE_DELETE', 'MODEL_REBUILD',
      'LEAVE_SUBMIT', 'LEAVE_APPROVE', 'LEAVE_REJECT',
      'SUBJECT_CREATE', 'SUBJECT_UPDATE',
      'TIMETABLE_CREATE', 'TIMETABLE_UPDATE', 'TIMETABLE_DELETE',
      'REPORT_GENERATE', 'CONFIG_UPDATE'
    ],
    required: true
  },
  entity: { type: String, default: null },
  entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
  previousValue: { type: mongoose.Schema.Types.Mixed, default: null },
  newValue: { type: mongoose.Schema.Types.Mixed, default: null },
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },
  success: { type: Boolean, default: true },
  errorMessage: { type: String, default: null },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: false  // Use custom 'timestamp' field
});
```

### Indexes

| Index | Fields | Purpose |
|---|---|---|
| timestamp_TTL | `timestamp` (TTL: 365 days) | Auto-delete old logs |
| user_action | `(userId, action)` | User activity history |
| entity_lookup | `(entity, entityId)` | Entity change history |

---

## 16. `system_configs` Collection

### Schema Definition

```javascript
const systemConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },
  description: { type: String, default: '' },
  dataType: { type: String, enum: ['string', 'number', 'boolean', 'json'], default: 'string' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedAt: { type: Date, default: Date.now }
});
```

### Default Configuration Values

| Key | Default Value | Type | Description |
|---|---|---|---|
| `min_attendance_threshold` | `75` | number | Minimum % to avoid shortage alert |
| `face_recognition_tolerance` | `0.5` | number | dlib recognition tolerance (lower = stricter) |
| `liveness_detection_enabled` | `true` | boolean | Enable/disable liveness detection |
| `max_leaves_per_semester` | `15` | number | Max student leaves per semester |
| `session_auto_close_minutes` | `90` | number | Auto-close session after N minutes |
| `otp_expiry_minutes` | `10` | number | OTP expiry time |
| `attendance_edit_window_hours` | `48` | number | Hours teacher can edit attendance |
| `face_min_images` | `50` | number | Minimum face images for enrollment |
| `face_target_images` | `100` | number | Target face images for enrollment |
| `notification_low_attendance` | `true` | boolean | Send notification on low attendance |

---

## 17. `refresh_tokens` Collection

### Schema Definition

```javascript
const refreshTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  isRevoked: { type: Boolean, default: false },
  revokedAt: { type: Date, default: null },
  expiresAt: { type: Date, required: true },
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});
```

### Indexes

| Index | Fields | Purpose |
|---|---|---|
| token_unique | `token` | Token lookup on refresh |
| user_tokens | `(userId, isRevoked)` | User's active sessions |
| expiresAt TTL | `expiresAt` | Auto-delete expired tokens |

---

## Database Connection & Configuration

```javascript
// config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`DB Error: ${error.message}`);
    process.exit(1);
  }
};
```

## Mongoose Plugins Used

| Plugin | Purpose |
|---|---|
| `mongoose-paginate-v2` | Consistent pagination across all collections |
| `mongoose-aggregate-paginate-v2` | Aggregation pipeline pagination |

---

*End of Database Schema Reference*
*FRAMS Project | B.Tech CS Final Year | Version 1.0 | July 2026*
