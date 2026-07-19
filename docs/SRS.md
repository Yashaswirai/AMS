# Software Requirements Specification (SRS)
## AI-Powered Face Recognition Attendance Management System (FRAMS)
### Version 1.0 | B.Tech Computer Science Final Year Project

---

## Document Control

| Field | Details |
|---|---|
| Document Title | Software Requirements Specification – FRAMS |
| Version | 1.0 |
| Status | Final |
| Date | July 2026 |
| Authors | B.Tech CS Final Year Team |
| Reviewers | Project Guide / Department HOD |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [System Constraints](#5-system-constraints)
6. [Use Case Specifications](#6-use-case-specifications)
7. [System Interface Requirements](#7-system-interface-requirements)
8. [External Interface Requirements](#8-external-interface-requirements)
9. [Appendix](#9-appendix)

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) document defines the complete functional and non-functional requirements for the **AI-Powered Face Recognition Attendance Management System (FRAMS)**. The document is intended for:

- Development team members implementing the system
- Project supervisor and evaluators reviewing project scope
- Testers designing test cases and verification procedures
- Stakeholders (college administration, faculty, students) understanding system capabilities

The FRAMS system automates student attendance tracking in academic institutions using computer-vision-based face recognition, replacing manual roll-call and proxy-prone paper-based systems.

### 1.2 Project Scope

FRAMS is a full-stack web application composed of three sub-systems:

1. **React.js Frontend** – Role-based dashboards for Admin, Teacher, and Student.
2. **Node.js / Express.js Backend API** – Business logic, authentication, and data management.
3. **Python / FastAPI Computer Vision API** – Face detection, encoding, recognition, and liveness detection.

The system integrates with:
- MongoDB Atlas (cloud database)
- ImageKit.io (face image storage)
- Render.com (backend and CV API hosting)
- Vercel (frontend hosting)

**In Scope:**
- User registration and role-based access control (Admin, Teacher, Student) with strict teacher data isolation
- Dual-mode face registration (Live Automated Camera Capture with 10 photos & Multi-Angle Photo Upload up to 10 angles) at `/student/face-profile`
- Real-time webcam face recognition attendance marking for teachers
- Student optical camera QR attendance scanner at `/student/qr-scanner` with geolocation verification (lat/lng/radius proxy prevention)
- Manual attendance override and correction
- AI Model Retraining via `POST /api/v1/face/train` triggering CV service `POST /api/ml/train` and dataset inspection
- Leave request workflow (Student → Teacher → Admin)
- Timetable management and subject-wise attendance
- Automated attendance reports with analytics
- Notifications and alerts (in-app)
- Audit logging for all critical operations
- AI-powered attendance prediction (shortage warning)

**Out of Scope:**
- Integration with university ERP systems (future enhancement)
- Mobile native applications (future enhancement)
- Biometric fingerprint authentication
- Payment gateway integrations
- Examination management

### 1.3 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|---|---|
| FRAMS | Face Recognition Attendance Management System |
| CV API | Computer Vision Application Programming Interface |
| ML | Machine Learning |
| CNN | Convolutional Neural Network |
| HOG | Histogram of Oriented Gradients |
| dlib | Open source C++ toolkit containing ML algorithms |
| face_recognition | Python library built on dlib for face recognition |
| JWT | JSON Web Token – stateless authentication mechanism |
| RBAC | Role-Based Access Control |
| CORS | Cross-Origin Resource Sharing |
| REST | Representational State Transfer |
| OTP | One-Time Password |
| SRS | Software Requirements Specification |
| FR | Functional Requirement |
| NFR | Non-Functional Requirement |
| UC | Use Case |
| API | Application Programming Interface |
| CRUD | Create, Read, Update, Delete |
| ER | Entity Relationship |
| DFD | Data Flow Diagram |
| HOD | Head of Department |
| MCA | Master of Computer Applications |
| B.Tech | Bachelor of Technology |
| MERN | MongoDB, Express.js, React.js, Node.js |
| UI | User Interface |
| UX | User Experience |
| HTTPS | Hypertext Transfer Protocol Secure |
| TLS | Transport Layer Security |
| BCrypt | Password hashing algorithm |
| liveness | Anti-spoofing measure to detect real faces vs. photos |
| encoding | 128-dimensional face descriptor vector |

### 1.4 References

| Ref | Document |
|---|---|
| [1] | face_recognition library – https://github.com/ageitgey/face_recognition |
| [2] | dlib – http://dlib.net |
| [3] | OpenCV Documentation – https://docs.opencv.org |
| [4] | FastAPI Documentation – https://fastapi.tiangolo.com |
| [5] | React.js Documentation – https://react.dev |
| [6] | MongoDB Atlas Documentation – https://www.mongodb.com/docs/atlas |
| [7] | JSON Web Token RFC 7519 – https://tools.ietf.org/html/rfc7519 |
| [8] | OWASP Security Guidelines – https://owasp.org |

### 1.5 Document Overview

- **Section 2** describes the overall system context, product perspective, major functions, and user classes.
- **Section 3** contains 50 numbered functional requirements.
- **Section 4** covers performance, security, scalability, and usability requirements.
- **Section 5** lists system constraints.
- **Section 6** provides 5 detailed use case specifications.
- **Sections 7–8** cover interface requirements.

---

## 2. Overall Description

### 2.1 Product Perspective

FRAMS is a standalone web application that interfaces with external services (MongoDB Atlas, ImageKit.io, SMTP server) but does not depend on or integrate with any existing institutional legacy system. It is designed as a replacement for paper-based attendance registers and standalone Excel sheets used by faculty.

The system follows a **three-tier client–server architecture**:

```
[Browser Client (React.js)]
        ↕ HTTPS REST
[Backend API (Node.js / Express.js)]
        ↕ HTTPS REST
[CV API (Python / FastAPI)]
        ↕
[MongoDB Atlas] [ImageKit.io CDN]
```

### 2.2 Product Functions

The primary functions of FRAMS are:

1. **Authentication & Authorization** – Secure login, JWT-based session management, strict teacher data isolation, role-based access.
2. **User & Student Management** – CRUD for all user roles, enrollment of students into departments/courses/subjects.
3. **Face Registration & Dataset Collection** – Dual-mode registration at `/student/face-profile`: Live Automated Camera Capture (10 photos) and Multi-Angle Photo Upload (file picker supporting up to 10 angles).
4. **Face Recognition Attendance** – Real-time webcam-based face recognition; mark attendance automatically for teacher-assigned classes.
5. **Student QR Attendance Scanner & Geolocation Verification** – Optical camera scanner (`html5-qrcode`) at `/student/qr-scanner` with lat/lng/radius distance comparison for proxy prevention.
6. **Retrain AI Classifier Integration** – Admin trigger `POST /api/v1/face/train` invoking Python FastAPI `POST /api/ml/train` to retrain ML classifier and sync face vector cache.
7. **Manual Attendance Management** – Faculty can add/edit/delete attendance records for corrections within assigned classes.
8. **Timetable Management** – Define weekly class schedules linking teacher–subject–class–room.
9. **Leave Request Workflow** – Students submit, teachers approve/reject, admin oversees.
10. **Attendance Analytics & Reports** – Per-student, per-subject, per-class attendance statistics.
11. **AI Attendance Prediction** – ML model predicts students at risk of shortage before end of semester.
12. **Notifications & Alerts** – Automated alerts for low attendance, leave approvals, system events.
13. **Audit Logging** – Immutable log of all system events for accountability.

### 2.3 User Classes and Characteristics

#### 2.3.1 Administrator (Admin)

| Attribute | Detail |
|---|---|
| Frequency of use | Daily – system management tasks |
| Technical level | Medium – comfortable with web applications |
| Responsibilities | System configuration, user management, department/course setup, oversight |
| Permissions | Full system access – all CRUD operations |

#### 2.3.2 Teacher (Faculty)

| Attribute | Detail |
|---|---|
| Frequency of use | Daily – marking attendance each lecture |
| Technical level | Low to Medium |
| Responsibilities | Mark attendance, manage leave requests, view subject reports |
| Permissions | Own subjects and assigned classes only |

#### 2.3.3 Student

| Attribute | Detail |
|---|---|
| Frequency of use | Regular – checking own attendance, submitting leave |
| Technical level | Low |
| Responsibilities | Enroll face dataset, check attendance, submit leave requests |
| Permissions | Read-only on attendance; write for leave requests and own profile |

#### 2.3.4 System (Automated Processes)

| Attribute | Detail |
|---|---|
| Description | Cron-job driven background processes |
| Responsibilities | Nightly attendance summary, prediction model refresh, notification dispatch |
| Permissions | Internal service account, no UI |

### 2.4 Operating Environment

| Component | Requirement |
|---|---|
| Client Browser | Chrome 110+, Firefox 110+, Edge 110+, Safari 15+ |
| Client OS | Windows 10+, macOS 12+, Ubuntu 20.04+ |
| Webcam | 720p minimum for face recognition accuracy |
| Internet Connection | Minimum 5 Mbps for face recognition streams |
| Backend Server | Node.js 18+ on Linux (Render.com) |
| CV API Server | Python 3.10+, FastAPI 0.100+ on Linux (Render.com) |
| Database | MongoDB Atlas M0+ cluster (MongoDB 6.0+) |

### 2.5 Design and Implementation Constraints

- The system **must** use MERN stack (MongoDB, Express, React, Node) for the primary application.
- The CV API **must** be implemented in Python using face_recognition / dlib libraries.
- All communication between services **must** use HTTPS in production.
- Passwords **must** be stored using BCrypt with a minimum cost factor of 10.
- Face encodings **must not** be stored in the client browser; only in the secure backend.
- The system must comply with basic **data privacy** principles (no raw face images exposed publicly).

### 2.6 Assumptions and Dependencies

**Assumptions:**
- Each student has a unique Roll Number within their department and year.
- Sufficient lighting conditions exist in classrooms for webcam capture (≥200 lux).
- Each student will cooperate during face dataset enrollment.
- The institution has stable internet connectivity (minimum 10 Mbps for server-side deployment).

**Dependencies:**
- `face_recognition` library v1.3.0+ (dlib-based)
- `OpenCV` v4.8+
- `numpy`, `scikit-learn` for ML prediction module
- ImageKit.io account for image CDN storage
- MongoDB Atlas cluster (free tier acceptable for academic)
- Render.com free/starter tier for API hosting
- Vercel free tier for frontend hosting

---

## 3. Functional Requirements

Requirements are numbered FR-01 through FR-50, organized by module. Priority: **P1** = Must Have, **P2** = Should Have, **P3** = Nice to Have.

---

### Module 1: Authentication & Session Management

#### FR-01 – User Login
| Field | Detail |
|---|---|
| ID | FR-01 |
| Title | User Login |
| Priority | P1 |
| Description | Users (Admin, Teacher, Student) must be able to log in using their registered email and password. The system issues a signed JWT access token (expiry 15 min) and a refresh token (expiry 7 days) upon successful authentication. |
| Inputs | `email` (string, valid email format), `password` (string, min 8 chars) |
| Processing | Validate input format → Look up user by email → BCrypt compare password hash → Generate JWT access + refresh token pair → Log login event to AuditLog |
| Outputs | `{ accessToken, refreshToken, user: { id, name, role, avatar } }` |
| Error Cases | Invalid credentials → 401. Account not found → 401. Account disabled → 403. |

#### FR-02 – Token Refresh
| Field | Detail |
|---|---|
| ID | FR-02 |
| Title | JWT Token Refresh |
| Priority | P1 |
| Description | The system must automatically refresh the access token using a valid refresh token without requiring the user to re-enter credentials. |
| Inputs | `refreshToken` (string, in HTTP-only cookie) |
| Processing | Verify refresh token signature and expiry → Check token is not revoked (blacklist) → Issue new access token |
| Outputs | `{ accessToken }` |
| Error Cases | Expired refresh token → 401. Revoked token → 401. |

#### FR-03 – Logout
| Field | Detail |
|---|---|
| ID | FR-03 |
| Title | Logout |
| Priority | P1 |
| Description | The system must invalidate the refresh token upon logout, preventing further use. |
| Inputs | `refreshToken` |
| Processing | Verify token → Add to revoked token blacklist in database → Clear HTTP-only cookie |
| Outputs | `{ message: "Logged out successfully" }` |

#### FR-04 – Change Password
| Field | Detail |
|---|---|
| ID | FR-04 |
| Title | Change Password |
| Priority | P1 |
| Description | Authenticated users must be able to change their password by providing the current password and a new password. |
| Inputs | `currentPassword`, `newPassword`, `confirmNewPassword` |
| Processing | Verify current password → Validate new password strength → Hash new password → Update in DB → Revoke all existing refresh tokens |
| Outputs | `{ message: "Password updated successfully" }` |

#### FR-05 – Forgot Password / Reset
| Field | Detail |
|---|---|
| ID | FR-05 |
| Title | Password Reset via OTP |
| Priority | P2 |
| Description | Users who forget their password can request a reset link/OTP sent to their registered email. The OTP expires in 10 minutes. |
| Inputs | `email` (for request); `otp`, `newPassword` (for reset) |
| Processing | Generate 6-digit OTP → Store hashed OTP in DB with expiry → Send via SMTP → Validate OTP on reset request → Update password |
| Outputs | `{ message: "OTP sent to registered email" }` |

---

### Module 2: User Management (Admin)

#### FR-06 – Create User
| Field | Detail |
|---|---|
| ID | FR-06 |
| Title | Create New User |
| Priority | P1 |
| Description | Admin can create new users (Teacher or Student). The system auto-generates a random initial password and sends it via email. |
| Inputs | `name`, `email`, `role` (teacher/student), `departmentId`, `phone`, additional role-specific fields |
| Processing | Validate uniqueness of email → Create User document → Create role-specific profile (Teacher/Student) → Send welcome email with credentials |
| Outputs | `{ user: { id, name, email, role }, message: "User created" }` |

#### FR-07 – List Users
| Field | Detail |
|---|---|
| ID | FR-07 |
| Title | List All Users |
| Priority | P1 |
| Description | Admin can list all users with filtering by role, department, and search by name/email. Results are paginated. |
| Inputs | Query params: `role`, `department`, `search`, `page`, `limit` |
| Processing | Build MongoDB aggregation with filters → Paginate → Return with total count |
| Outputs | `{ users: [...], total, page, limit }` |

#### FR-08 – Update User
| Field | Detail |
|---|---|
| ID | FR-08 |
| Title | Update User Profile |
| Priority | P1 |
| Description | Admin can update any user's profile fields. Teachers and Students can update their own non-critical fields (name, phone, avatar). |
| Inputs | `userId`, updated fields |
| Processing | Authorize (admin or self) → Validate fields → Update document → Return updated user |
| Outputs | `{ user: { ...updatedFields } }` |

#### FR-09 – Activate / Deactivate User
| Field | Detail |
|---|---|
| ID | FR-09 |
| Title | Toggle User Active Status |
| Priority | P1 |
| Description | Admin can deactivate a user account, preventing login without deleting data. Deactivated user tokens are immediately invalidated. |
| Inputs | `userId`, `isActive` (boolean) |
| Processing | Update `isActive` flag → If deactivating, add all refresh tokens to revocation list |
| Outputs | `{ message: "User deactivated/activated" }` |

#### FR-10 – Delete User
| Field | Detail |
|---|---|
| ID | FR-10 |
| Title | Delete User |
| Priority | P2 |
| Description | Admin can permanently delete a user. Associated data (attendance records, leave requests) is retained with a `deletedUser` flag. Face dataset is purged from ImageKit.io. |
| Inputs | `userId` |
| Processing | Soft-delete User document → Queue face dataset deletion from ImageKit.io → Revoke all tokens |
| Outputs | `{ message: "User deleted" }` |

---

### Module 3: Department, Course & Subject Management

#### FR-11 – Department CRUD
| Field | Detail |
|---|---|
| ID | FR-11 |
| Title | Department Management |
| Priority | P1 |
| Description | Admin can create, read, update, and delete departments (e.g., Computer Science, Electronics). A department has a name, code, HOD, and year/semester structure. |
| Inputs | `name`, `code`, `hodId`, `totalSemesters` |
| Outputs | Department document |

#### FR-12 – Course Management
| Field | Detail |
|---|---|
| ID | FR-12 |
| Title | Course/Program Management |
| Priority | P1 |
| Description | Admin manages academic programs (B.Tech, MCA) linked to departments. Each course defines the number of semesters and year structure. |
| Inputs | `courseName`, `courseCode`, `departmentId`, `duration`, `totalSemesters` |
| Outputs | Course document |

#### FR-13 – Subject Management
| Field | Detail |
|---|---|
| ID | FR-13 |
| Title | Subject CRUD |
| Priority | P1 |
| Description | Admin creates subjects (papers) within a course-semester. Each subject has a code, name, credit hours, and assigned teacher. |
| Inputs | `subjectName`, `subjectCode`, `courseId`, `semester`, `creditHours`, `teacherId` |
| Outputs | Subject document |

#### FR-14 – Assign Teacher to Subject
| Field | Detail |
|---|---|
| ID | FR-14 |
| Title | Teacher–Subject Assignment |
| Priority | P1 |
| Description | Admin assigns one primary teacher to each subject. A teacher can be assigned to multiple subjects. |
| Inputs | `subjectId`, `teacherId` |
| Outputs | Updated Subject with teacherId |

---

### Module 4: Student Enrollment

#### FR-15 – Enroll Student in Course
| Field | Detail |
|---|---|
| ID | FR-15 |
| Title | Course Enrollment |
| Priority | P1 |
| Description | Admin enrolls a student in a course (program) for a specific batch year and section. |
| Inputs | `studentId`, `courseId`, `batchYear`, `section`, `semester` |
| Outputs | Updated Student document with enrollment details |

#### FR-16 – Bulk Student Import
| Field | Detail |
|---|---|
| ID | FR-16 |
| Title | Bulk Student Import via CSV |
| Priority | P2 |
| Description | Admin can upload a CSV file containing student data to create multiple student accounts at once. |
| Inputs | CSV file with columns: name, email, rollNumber, departmentId, courseId, batchYear, section |
| Processing | Parse CSV → Validate each row → Create user+student documents → Send bulk emails → Return success/failure report |
| Outputs | `{ created: N, failed: [...errorRows] }` |

---

### Module 5: Student Face Profile & Registration

#### FR-17 – Dual-Mode Face Registration Panel
| Field | Detail |
|---|---|
| ID | FR-17 |
| Title | Student Face Profile Registration |
| Priority | P1 |
| Description | Enhanced student face registration panel at `/student/face-profile` supporting two enrollment modes: Mode 1 - Live Automated Camera Capture (captures 10 photos automatically with pose guidance), and Mode 2 - Multi-Angle Photo Upload (file picker supporting up to 10 angles for dataset generation). |
| Inputs | Live webcam feed OR file picker selection (up to 10 images) |
| Processing | Validate image inputs → Encode images to base64 array → Issue POST request to `/api/v1/face/register` |
| Outputs | `{ success: true, message: "Face profile registered successfully", imageCount: N }` |

#### FR-18 – Batch Face Registration Endpoint
| Field | Detail |
|---|---|
| ID | FR-18 |
| Title | Batch Face Registration API |
| Priority | P1 |
| Description | Backend endpoint `POST /api/v1/face/register` receives base64 image arrays or batch uploads, validates face quality via CV service, stores images on ImageKit.io, computes face encodings, and updates student faceEnrolled status. |
| Inputs | `images`: array of base64 data URIs or file uploads, `studentId` (or auto from JWT) |
| Processing | Extract base64 frames → Send to CV API for quality check & 128-dim encoding → Upload to ImageKit folder `frams/faces/{studentId}/` → Upsert FaceDataset doc → Trigger vector cache sync |
| Outputs | `{ registered: true, totalImages: N, faceDatasetId: ID, verified: true }` |

#### FR-19 – Generate Face Encodings
| Field | Detail |
|---|---|
| ID | FR-19 |
| Title | Generate 128-dim Face Encodings |
| Priority | P1 |
| Description | The CV API computes 128-dimensional face encoding vectors for captured/uploaded images using dlib's ResNet face recognition model. The mean encoding is computed and stored. |
| Inputs | `studentId`, collected image set |
| Processing | For each image → `face_recognition.face_encodings()` → Average encodings → Store in FaceDataset document |
| Outputs | `{ studentId, encodingCount, avgEncoding: [128 floats], storedAt }` |

#### FR-20 – Upload Face Images to ImageKit
| Field | Detail |
|---|---|
| ID | FR-20 |
| Title | Store Face Images in CDN |
| Priority | P1 |
| Description | Validated face images are uploaded to ImageKit.io under a folder named by student ID. ImageKit URLs and file IDs are stored in the FaceDataset document. |
| Inputs | Image files/base64 strings, `studentId` |
| Processing | Upload to ImageKit folder `frams/faces/{studentId}/` → Store fileId and URL in DB |
| Outputs | Array of `{ fileId, url }` objects |

#### FR-21 – Retrain AI Classifier & Cache Sync
| Field | Detail |
|---|---|
| ID | FR-21 |
| Title | Retrain AI Classifier Integration |
| Priority | P1 |
| Description | Endpoint `POST /api/v1/face/train` in Node.js backend triggers Python FastAPI CV service (`POST /api/ml/train`) to retrain ML models, update classifier weights, and sync the in-memory face vector cache. Admin Face Datasets inspector shows only real enrolled student datasets and provides model retraining status. |
| Inputs | Trigger: Admin button click or post-enrollment event |
| Processing | Node.js backend POST to CV API `/api/ml/train` with `CV_API_KEY` → CV service loads verified encodings → Trains model → Syncs vector cache → Returns metrics |
| Outputs | `{ success: true, trainedModels: N, knownFacesCount: N, syncTimestamp: Date }` |

#### FR-22 – Delete Face Dataset
| Field | Detail |
|---|---|
| ID | FR-22 |
| Title | Remove Student Face Data |
| Priority | P2 |
| Description | Admin can delete a student's face dataset. Images are deleted from ImageKit.io, encodings removed from DB, and model retrained. |
| Inputs | `studentId` |
| Processing | Delete ImageKit folder/files → Remove FaceDataset document → Trigger retrain pipeline |
| Outputs | `{ message: "Face data deleted", imagesRemoved: N }` |

---

### Module 6: Attendance Marking & Verification

#### FR-23 – Start Attendance Session (Strict Teacher Scoping)
| Field | Detail |
|---|---|
| ID | FR-23 |
| Title | Open Attendance Session |
| Priority | P1 |
| Description | A teacher starts an attendance session for a specific class, subject, and date/period. Strictly enforces that teachers can ONLY initiate sessions for subjects assigned to them by Admin. |
| Inputs | `subjectId`, `classId`, `date`, `period` |
| Processing | Validate teacher is assigned to `subjectId` → Check no existing session → Generate QR session token & Geolocation bounds → Create AttendanceSession document → Return session ID |
| Outputs | `{ sessionId, subject, classId, date, period, qrToken, lat, lng, radius, status: "open" }` |

#### FR-24 – Face Recognition Attendance Marking
| Field | Detail |
|---|---|
| ID | FR-24 |
| Title | Recognize and Mark Attendance via Face |
| Priority | P1 |
| Description | Teacher webcam captures classroom feed. CV API detects faces, evaluates liveness, matches against strict teacher-assigned student roster, and backend marks Present. |
| Inputs | Base64 webcam frame → CV API; `sessionId`, `recognizedStudentIds` → Backend |
| Processing | CV API: Detect faces → Extract encodings → Compare with known_faces (tolerance 0.5) → Liveness check → Return matched IDs. Backend: Filter by assigned class roster → Mark Present. |
| Outputs | `{ recognized: [{ studentId, name, rollNo, confidence }], markedPresent: N }` |

#### FR-25 – Student QR Attendance Scanner & Geolocation Verification
| Field | Detail |
|---|---|
| ID | FR-25 |
| Title | Student QR Scanner & Geolocation Check-in |
| Priority | P1 |
| Description | Student accesses optical camera QR scanner (`html5-qrcode`) at `/student/qr-scanner`. Checks in via `POST /api/v1/attendance/mark-qr` by providing QR payload + current latitude & longitude. System validates distance against session geolocation radius for proxy prevention. |
| Inputs | `qrToken`, `sessionId`, `latitude`, `longitude` |
| Processing | Verify active session & QR token validity → Calculate Haversine distance between student (lat, lng) and session (sessionLat, sessionLng) → If distance ≤ radius (default 50m), mark student Present (`markedBy: "qr_scanner"`) |
| Outputs | `{ success: true, message: "Attendance marked via QR scanner", status: "Present", distanceMeters: N }` |
| Error Cases | Student outside geolocation radius → 400 (`INVALID_LOCATION`). Expired QR → 400 (`QR_EXPIRED`). |

#### FR-26 – Manual Attendance Marking (Strict Scoping)
| Field | Detail |
|---|---|
| ID | FR-26 |
| Title | Teacher Manual Attendance Entry |
| Priority | P1 |
| Description | Teacher can manually mark students as Present, Absent, or Late. Access is strictly limited to students enrolled in the teacher's assigned subjects and courses. |
| Inputs | `sessionId`, `studentId`, `status` (Present/Absent/Late) |
| Processing | Validate teacher assignment to subject & student enrollment → Upsert Attendance document → Log manual override in AuditLog |
| Outputs | `{ attendance: { studentId, status, markedBy: "manual", timestamp } }` |
| Description | Teacher can manually mark individual students as Present, Absent, or Late during or after an attendance session. Useful for edge cases where face recognition fails. |
| Inputs | `sessionId`, `studentId`, `status` (Present/Absent/Late) |
| Processing | Validate teacher authorization → Upsert Attendance document → Log manual override in AuditLog |
| Outputs | `{ attendance: { studentId, status, markedBy: "manual", timestamp } }` |

#### FR-27 – Close Attendance Session
| Field | Detail |
|---|---|
| ID | FR-27 |
| Title | Close and Finalize Attendance |
| Priority | P1 |
| Description | Teacher closes the session. Any students in the class not yet marked are automatically set to Absent. Session status changes to "closed". |
| Inputs | `sessionId` |
| Processing | Fetch all enrolled students for class → Identify unmarked students → Set as Absent → Update session status to "closed" → Trigger notifications for absentees |
| Outputs | `{ sessionId, status: "closed", totalPresent: N, totalAbsent: N, totalLate: N }` |

#### FR-28 – Edit Attendance Record
| Field | Detail |
|---|---|
| ID | FR-28 |
| Title | Edit Post-Session Attendance |
| Priority | P1 |
| Description | Teacher or Admin can edit attendance status for a closed session within 48 hours of the session. All changes are logged to AuditLog. |
| Inputs | `attendanceId`, `newStatus`, `reason` |
| Processing | Validate time window (≤ 48 hours unless admin) → Update status → Create AuditLog entry with `previousStatus`, `newStatus`, `changedBy`, `reason` |
| Outputs | Updated Attendance document |

---

### Module 7: Timetable Management

#### FR-29 – Create Timetable
| Field | Detail |
|---|---|
| ID | FR-29 |
| Title | Define Weekly Timetable |
| Priority | P1 |
| Description | Admin defines a weekly timetable for each class/section, specifying subject, teacher, room, day, and period slots. |
| Inputs | `classId`, `subjectId`, `teacherId`, `day` (Mon–Sat), `startTime`, `endTime`, `room` |
| Processing | Check for conflicts (teacher double-booking, room double-booking) → Create Timetable slot |
| Outputs | Timetable slot document |

#### FR-30 – View Timetable
| Field | Detail |
|---|---|
| ID | FR-30 |
| Title | View Weekly Schedule |
| Priority | P1 |
| Description | Teachers and Students can view their weekly timetable in a grid format. |
| Inputs | `userId`, `role` (auto from JWT) |
| Outputs | `{ timetable: [{ day, slots: [{ time, subject, teacher, room }] }] }` |

#### FR-31 – Conflict Detection
| Field | Detail |
|---|---|
| ID | FR-31 |
| Title | Timetable Conflict Detection |
| Priority | P1 |
| Description | The system prevents scheduling conflicts where the same teacher or room is assigned to overlapping time slots. |
| Inputs | New timetable slot data |
| Processing | Query existing slots for same teacher/room/day/time → If overlap found → return conflict details |
| Outputs | Error: `{ conflict: true, conflictingSlot: {...} }` or success |

---

### Module 8: Leave Request Management

#### FR-32 – Submit Leave Request
| Field | Detail |
|---|---|
| ID | FR-32 |
| Title | Student Leave Request Submission |
| Priority | P1 |
| Description | Students can submit leave requests for specific date ranges with a reason and optional supporting documents (medical certificate). |
| Inputs | `studentId`, `startDate`, `endDate`, `reason`, `leaveType` (medical/personal/exam), optional document URL |
| Processing | Validate date range (not retroactive beyond 2 days) → Create LeaveRequest document with status "pending" → Notify assigned teachers |
| Outputs | `{ leaveRequest: { id, status: "pending", submittedAt } }` |

#### FR-33 – Teacher Approve/Reject Leave
| Field | Detail |
|---|---|
| ID | FR-33 |
| Title | Teacher Leave Approval |
| Priority | P1 |
| Description | Assigned teachers can approve or reject student leave requests for their subjects. A comment is required for rejection. |
| Inputs | `leaveRequestId`, `action` (approve/reject), `comment` |
| Processing | Validate teacher is assigned to student's subjects → Update status → If approved, update affected Attendance records to "Leave" status → Notify student |
| Outputs | `{ leaveRequest: { status: "approved"/"rejected", comment, processedBy, processedAt } }` |

#### FR-34 – Admin Override Leave
| Field | Detail |
|---|---|
| ID | FR-34 |
| Title | Admin Leave Override |
| Priority | P2 |
| Description | Admin can override any leave request decision regardless of teacher action. |
| Inputs | `leaveRequestId`, `action`, `comment` |
| Outputs | Updated LeaveRequest document |

---

### Module 9: Attendance Analytics & Reports

#### FR-35 – Student Attendance Summary
| Field | Detail |
|---|---|
| ID | FR-35 |
| Title | Per-Student Attendance Report |
| Priority | P1 |
| Description | Students and Teachers can view a student's attendance percentage per subject, overall, and trend over time (weekly). |
| Inputs | `studentId`, optional `subjectId`, `startDate`, `endDate` |
| Processing | Aggregate Attendance documents → Compute (present+late) / total × 100 per subject → Group by week for trend |
| Outputs | `{ overall: 82.5, subjects: [{ subject, percent, present, absent }], weeklyTrend: [...] }` |

#### FR-36 – Class Attendance Report
| Field | Detail |
|---|---|
| ID | FR-36 |
| Title | Class-Level Attendance Report |
| Priority | P1 |
| Description | Teacher views attendance report for all students in a class for a subject. Includes date-wise and student-wise breakdown. |
| Inputs | `classId`, `subjectId`, `startDate`, `endDate` |
| Outputs | `{ students: [{ name, rollNo, percent, datewise: [...] }] }` |

#### FR-37 – Export Report to PDF/Excel
| Field | Detail |
|---|---|
| ID | FR-37 |
| Title | Export Attendance Reports |
| Priority | P2 |
| Description | Teachers and Admin can export attendance reports as PDF (formatted) or Excel (.xlsx) files. |
| Inputs | Report parameters + `format` (pdf/excel) |
| Processing | Generate report data → Use `pdfkit` / `exceljs` library → Stream file response |
| Outputs | Binary file stream with appropriate Content-Type header |

#### FR-38 – Low Attendance Alert
| Field | Detail |
|---|---|
| ID | FR-38 |
| Title | Automated Low Attendance Notification |
| Priority | P1 |
| Description | When a student's attendance in any subject drops below 75%, the system automatically sends an in-app notification to the student and their teacher. |
| Inputs | Triggered by: attendance session close |
| Processing | After session close → Recalculate affected students' attendance % → If any subject < 75% → Create Notification documents |
| Outputs | Notifications created in DB |

---

### Module 10: AI / ML Prediction

#### FR-39 – Attendance Shortage Prediction
| Field | Detail |
|---|---|
| ID | FR-39 |
| Title | Predict End-of-Semester Shortage |
| Priority | P2 |
| Description | An ML model (trained with historical attendance data) predicts which students are likely to fall below 75% attendance by end of semester. Risk levels: Low, Medium, High. |
| Inputs | `studentId`, current attendance %, remaining lectures, average absences per week |
| Processing | Feature engineering → Load pre-trained scikit-learn RandomForest model → Predict risk label and probability |
| Outputs | `{ studentId, riskLevel: "high/medium/low", probability: 0.87, recommendedAttendance: 95% }` |

#### FR-40 – Retrain Prediction Model
| Field | Detail |
|---|---|
| ID | FR-40 |
| Title | Periodic Model Retraining |
| Priority | P3 |
| Description | Admin can trigger retraining of the attendance prediction model using accumulated historical data from the current semester. |
| Inputs | Admin trigger or automated weekly cron |
| Processing | Export attendance data → Feature engineering → Train RandomForest → Evaluate (F1, accuracy) → Save model artifact → Log metrics |
| Outputs | `{ modelVersion, accuracy, f1Score, trainedAt }` |

#### FR-41 – Face Recognition Accuracy Logging
| Field | Detail |
|---|---|
| ID | FR-41 |
| Title | Log Recognition Predictions |
| Priority | P2 |
| Description | Every face recognition prediction (matched/unmatched, confidence score) is logged in the Prediction collection for audit and model improvement. |
| Inputs | Auto-logged by CV API |
| Outputs | Prediction document with image hash, matched student, confidence |

---

### Module 11: Notifications

#### FR-42 – In-App Notifications
| Field | Detail |
|---|---|
| ID | FR-42 |
| Title | In-App Notification System |
| Priority | P1 |
| Description | The system maintains a Notification collection. Users receive notifications for: low attendance, leave approval/rejection, new timetable, system announcements. |
| Inputs | System-generated events |
| Outputs | `{ notifications: [{ id, type, message, read, createdAt }] }` |

#### FR-43 – Mark Notification Read
| Field | Detail |
|---|---|
| ID | FR-43 |
| Title | Mark Notifications as Read |
| Priority | P1 |
| Description | Users can mark individual or all notifications as read. |
| Inputs | `notificationId` or `markAll: true` |
| Outputs | Updated notification read status |

---

### Module 12: Audit Logging

#### FR-44 – Automatic Audit Logging
| Field | Detail |
|---|---|
| ID | FR-44 |
| Title | System Audit Log |
| Priority | P1 |
| Description | All critical actions are automatically logged: login/logout, attendance changes, user management, leave approvals, face enrollment, model retraining. |
| Inputs | Auto-triggered by middleware |
| Outputs | AuditLog document: `{ userId, action, entity, entityId, previousValue, newValue, ip, userAgent, timestamp }` |

#### FR-45 – View Audit Logs
| Field | Detail |
|---|---|
| ID | FR-45 |
| Title | Admin Audit Log Viewer |
| Priority | P2 |
| Description | Admin can search and filter audit logs by user, action type, date range, and entity. |
| Inputs | Filter params: `userId`, `action`, `startDate`, `endDate` |
| Outputs | Paginated list of AuditLog documents |

---

### Module 13: Dashboard & Statistics

#### FR-46 – Admin Dashboard
| Field | Detail |
|---|---|
| ID | FR-46 |
| Title | Admin System Dashboard |
| Priority | P1 |
| Description | Admin sees system-wide statistics: total students, teachers, departments, today's attendance rate, pending leave requests, recent activities. |
| Outputs | Aggregated statistics object |

#### FR-47 – Teacher Dashboard
| Field | Detail |
|---|---|
| ID | FR-47 |
| Title | Teacher Dashboard |
| Priority | P1 |
| Description | Teacher sees: today's schedule, recent attendance sessions, pending leave requests for their students, low-attendance students alert. |
| Outputs | Personalized dashboard data |

#### FR-48 – Student Dashboard
| Field | Detail |
|---|---|
| ID | FR-48 |
| Title | Student Dashboard |
| Priority | P1 |
| Description | Student sees: own overall attendance %, subject-wise breakdown, upcoming classes, leave request status, notifications. |
| Outputs | Personalized dashboard data |

---

### Module 14: Settings & Configuration

#### FR-49 – System Configuration
| Field | Detail |
|---|---|
| ID | FR-49 |
| Title | System-Wide Settings |
| Priority | P2 |
| Description | Admin can configure: minimum attendance threshold (default 75%), maximum allowed leaves per semester, face recognition tolerance value, whether liveness detection is mandatory. |
| Inputs | Configuration key-value pairs |
| Outputs | Updated system configuration document |

#### FR-50 – Profile Avatar Upload
| Field | Detail |
|---|---|
| ID | FR-50 |
| Title | User Avatar Upload |
| Priority | P3 |
| Description | Users can upload a profile photo (avatar). The image is stored on ImageKit.io and the URL is saved in the User document. Max size: 2 MB. Formats: jpg, png, webp. |
| Inputs | Image file, `userId` |
| Processing | Validate format and size → Upload to ImageKit.io → Update User.avatar |
| Outputs | `{ avatarUrl }` |

---

## 4. Non-Functional Requirements

### 4.1 Performance Requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-01 | API Response Time (95th percentile) | ≤ 500 ms for non-CV endpoints |
| NFR-02 | Face Recognition per Frame | ≤ 2 seconds on warm CV API |
| NFR-03 | Concurrent Users | Support 200 concurrent users |
| NFR-04 | Database Query Time | ≤ 100 ms for indexed queries |
| NFR-05 | Report Generation | ≤ 5 seconds for up to 1000-record reports |
| NFR-06 | System Availability | 99.5% uptime (≈ 44 hours downtime/year) |
| NFR-07 | Page Load Time | ≤ 3 seconds on 5 Mbps connection |

### 4.2 Security Requirements

| ID | Requirement | Implementation |
|---|---|---|
| NFR-08 | Password Storage | BCrypt hash, cost factor ≥ 10 |
| NFR-09 | Authentication | JWT tokens, short expiry (15 min access) |
| NFR-10 | Data in Transit | TLS 1.2+ (HTTPS) for all communication |
| NFR-11 | SQL/NoSQL Injection Prevention | Mongoose schema validation, input sanitization |
| NFR-12 | XSS Prevention | Content Security Policy headers, React DOM escaping |
| NFR-13 | CSRF Protection | SameSite=Strict cookie attribute for refresh tokens |
| NFR-14 | Rate Limiting | 100 requests/minute per IP on auth endpoints; 500/min general |
| NFR-15 | Face Data Privacy | Encodings stored server-side only; never sent to client |
| NFR-16 | Role Authorization | All endpoints protected by RBAC middleware |
| NFR-17 | Sensitive Headers | X-Content-Type-Options, X-Frame-Options, HSTS |
| NFR-18 | API Key Security | All third-party API keys in environment variables only |

### 4.3 Scalability Requirements

| ID | Requirement |
|---|---|
| NFR-19 | Horizontal scaling: Backend API is stateless (no server-side session); can be horizontally scaled behind load balancer |
| NFR-20 | MongoDB Atlas auto-scaling: Can scale from M0 (free) to M30+ as data grows |
| NFR-21 | CV API can be scaled independently from backend |
| NFR-22 | Face encodings cache rebuilt in < 30 seconds for up to 10,000 students |

### 4.4 Usability Requirements

| ID | Requirement |
|---|---|
| NFR-23 | Responsive design: UI functional on screens ≥ 360px wide (mobile), 768px (tablet), 1280px (desktop) |
| NFR-24 | Error messages must be human-readable and actionable, not raw error codes |
| NFR-25 | Face enrollment wizard guides user step-by-step with visual feedback |
| NFR-26 | Attendance marking UI shows real-time recognized student list |
| NFR-27 | All data tables support sorting, filtering, and search |
| NFR-28 | Color contrast ratio ≥ 4.5:1 for accessibility (WCAG AA) |

### 4.5 Reliability Requirements

| ID | Requirement |
|---|---|
| NFR-29 | Face recognition fallback: If CV API is unavailable, teacher can use manual marking |
| NFR-30 | Database connection pooling with automatic reconnect on failure |
| NFR-31 | Failed ImageKit.io uploads are retried up to 3 times with exponential backoff |
| NFR-32 | All async operations have timeouts (30s default) |

### 4.6 Maintainability Requirements

| ID | Requirement |
|---|---|
| NFR-33 | Code coverage: ≥ 70% unit test coverage for backend |
| NFR-34 | All API changes versioned (v1/ prefix) |
| NFR-35 | Structured logging (JSON format) for all backend services |
| NFR-36 | Modular code structure: separate routers, controllers, services, models |

---

## 5. System Constraints

| Constraint | Description |
|---|---|
| SC-01 | **Technology Stack** – Must use MERN stack for core application and Python/FastAPI for CV API |
| SC-02 | **Free Tier Deployment** – System must be deployable on free tiers of Render (backend/CV) and Vercel (frontend) for academic demonstration |
| SC-03 | **Face Recognition Library** – Must use `face_recognition` library (dlib-based); commercial APIs (AWS Rekognition, etc.) are out of scope |
| SC-04 | **Single Institution** – MVP is designed for a single institution (single MongoDB database, not multi-tenant) |
| SC-05 | **Webcam Dependency** – Real-time attendance marking requires a physical webcam; mobile camera API not implemented in v1 |
| SC-06 | **Cold Start** – Render free tier has ~30-second cold start; CV API warm-up time must be communicated to users |
| SC-07 | **Image Quality** – Face recognition accuracy degrades in poor lighting or with masks; system must communicate this limitation |
| SC-08 | **Browser** – WebRTC webcam access requires HTTPS in production and is only available in Chrome, Firefox, Edge, Safari |

---

## 6. Use Case Specifications

### UC-01: Mark Attendance via Face Recognition

| Field | Detail |
|---|---|
| **Use Case ID** | UC-01 |
| **Name** | Mark Attendance via Face Recognition |
| **Actors** | Teacher (Primary), CV API (Secondary), System |
| **Trigger** | Teacher initiates attendance session for a class period |
| **Preconditions** | 1. Teacher is logged in. 2. Class, subject, timetable slot exist. 3. At least one student in the class has enrolled face data. 4. CV API is online. |
| **Postconditions** | 1. Attendance records created for all recognized students (Present). 2. All unrecognized enrolled students marked Absent after session close. 3. Notification sent to absentees. |

**Main Flow:**
1. Teacher navigates to "Mark Attendance" and selects subject and period.
2. System checks for existing session (if none, creates new one with status "open").
3. System displays the camera feed interface and recognized student list.
4. Teacher positions webcam toward the class.
5. Browser captures frames and sends to CV API via POST.
6. CV API detects faces, computes encodings, compares with known encodings.
7. CV API performs liveness detection (EAR blink check).
8. CV API returns list of recognized student IDs with confidence scores.
9. Backend marks recognized students as Present in the open session.
10. Real-time UI updates: recognized student names appear with a green checkmark.
11. Teacher reviews list, can manually add/remove students (FR-26).
12. Teacher clicks "Close Session."
13. System marks all remaining unrecognized students as Absent.
14. Session status set to "closed."
15. Low-attendance notification triggered for students below 75%.

**Alternative Flows:**
- **A1 (No faces detected):** CV API returns empty list → System shows "No faces detected, adjust camera" → Teacher can retry or switch to manual mode.
- **A2 (Liveness check failed):** CV API returns `isLive: false` → Student not marked → UI shows "Liveness check failed for detected face."
- **A3 (Low confidence match):** Confidence < 0.6 → Not marked automatically → Flagged for teacher review in UI.
- **A4 (CV API unavailable):** Backend returns 503 → UI prompts teacher to use manual attendance mode.

---

### UC-02: Enroll Student Face Dataset

| Field | Detail |
|---|---|
| **Use Case ID** | UC-02 |
| **Name** | Enroll Student Face Dataset |
| **Actors** | Admin/Teacher (Primary), Student (Participant), CV API |
| **Trigger** | Admin creates new student account or initiates batch enrollment session |
| **Preconditions** | 1. Student user account exists. 2. Student does not already have a valid face dataset. 3. Webcam available. |
| **Postconditions** | 1. ≥ 50 face images stored on ImageKit.io. 2. 128-dim encoding computed and stored in FaceDataset. 3. Known faces registry updated. |

**Main Flow:**
1. Admin opens "Face Enrollment" for a student.
2. System calls CV API to begin enrollment session.
3. Webcam feed displayed with face overlay bounding box.
4. CV API processes frames: detects face, checks quality (blur, size).
5. UI displays progress bar (0/100 images captured).
6. System prompts student to look in different directions.
7. On 100 valid captures: CV API generates mean encoding.
8. Images uploaded to ImageKit.io asynchronously.
9. FaceDataset document created in DB.
10. Known faces registry rebuilt.
11. Success notification shown; dataset marked "verified."

---

### UC-03: Submit and Process Leave Request

| Field | Detail |
|---|---|
| **Use Case ID** | UC-03 |
| **Name** | Submit and Process Leave Request |
| **Actors** | Student (Primary), Teacher (Secondary), Admin (Secondary), System |
| **Trigger** | Student submits a leave request for upcoming or past dates |
| **Preconditions** | Student is enrolled and logged in. |
| **Postconditions** | Leave approved/rejected; if approved, attendance records updated. |

**Main Flow:**
1. Student opens "Leave Request" form.
2. Enters start date, end date, leave type (medical/personal), reason.
3. Optionally uploads supporting document.
4. System validates: dates not more than 2 days past, no duplicate leave.
5. LeaveRequest created with status "pending."
6. Notification sent to all assigned teachers.
7. Teacher opens notification, views request details.
8. Teacher approves with optional comment.
9. System updates Attendance records for the leave period to "Leave" status.
10. Student receives approval notification.

---

### UC-04: Generate and Export Attendance Report

| Field | Detail |
|---|---|
| **Use Case ID** | UC-04 |
| **Name** | Generate and Export Report |
| **Actors** | Teacher / Admin |
| **Trigger** | User requests attendance report |
| **Preconditions** | Attendance data exists for the requested period. |
| **Postconditions** | Report displayed on screen; optionally downloaded as PDF/Excel. |

**Main Flow:**
1. Teacher selects class, subject, date range.
2. System aggregates Attendance documents.
3. Report displayed: student-wise % table, date-wise heatmap.
4. Teacher clicks "Export PDF" or "Export Excel."
5. System generates file using pdfkit/exceljs.
6. File downloaded to browser.

---

### UC-05: View AI Attendance Shortage Prediction

| Field | Detail |
|---|---|
| **Use Case ID** | UC-05 |
| **Name** | View AI Shortage Prediction |
| **Actors** | Teacher / Admin, ML Prediction Service |
| **Trigger** | Teacher opens prediction dashboard |
| **Preconditions** | At least 4 weeks of attendance data exists. Prediction model is trained. |
| **Postconditions** | Risk classification displayed for each student. |

**Main Flow:**
1. Teacher clicks "AI Predictions" on dashboard.
2. Backend calls CV/ML API with student attendance features.
3. ML model predicts risk level for each student.
4. Dashboard displays table: Student, Current %, Predicted End %, Risk Level (color-coded).
5. "High Risk" students can be selected for bulk notification.
6. Teacher sends reminder notification to high-risk students.

---

## 7. System Interface Requirements

### 7.1 User Interfaces

| Interface | Description |
|---|---|
| Login Page | Email/password form, forgot password link. Responsive. |
| Admin Dashboard | Stats cards, quick actions, recent activity feed |
| Teacher Dashboard | Today's schedule, pending approvals, low-attendance alerts |
| Student Dashboard | Attendance gauge charts, subject cards, leave status |
| Face Enrollment | Webcam view, progress bar, instruction cards |
| Attendance Session | Live camera feed, recognized students list, manual override |
| Reports | Filterable tables, charts (Chart.js), export buttons |
| Timetable Grid | Weekly calendar grid view |
| Notifications Panel | Slide-over panel with read/unread grouping |

### 7.2 Software Interfaces

| Interface | Protocol | Format | Auth |
|---|---|---|---|
| Backend ↔ Frontend | HTTPS REST | JSON | JWT Bearer |
| Backend ↔ CV API | HTTPS REST | JSON / multipart | Internal API Key |
| Backend ↔ MongoDB | MongoDB Wire Protocol | BSON | Connection string with credentials |
| Backend ↔ ImageKit.io | HTTPS REST | multipart/form-data | Public + Private Key |
| Backend ↔ SMTP | SMTP/TLS | Email | SMTP credentials |

### 7.3 Hardware Interfaces

| Hardware | Requirement |
|---|---|
| Webcam | Minimum 720p resolution, 30 fps, USB or built-in |
| Display | Minimum 1280×720 resolution for desktop UI |
| Server CPU | Minimum 2 vCPUs for CV API (face encoding is CPU-intensive) |

---

## 8. External Interface Requirements

### 8.1 ImageKit.io API

- **Purpose:** Store face images and user avatars on CDN
- **Integration:** `imagekit` npm package for Node.js; `imagekit-python` package for CV API
- **Key Operations:** `uploader.upload()`, `uploader.destroy()`
- **Config:** `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`

### 8.2 MongoDB Atlas

- **Purpose:** Primary database for all application data
- **Connection:** Mongoose ODM via `MONGODB_URI` connection string
- **Config:** Atlas cluster URL with username/password in URI

### 8.3 SMTP / Email Service

- **Purpose:** Send welcome emails, OTP, low attendance alerts
- **Supported:** Gmail SMTP, SendGrid, Mailtrap (dev)
- **Config:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

### 8.4 CV API (Internal)

- **Purpose:** Face detection, recognition, liveness detection, ML predictions
- **Base URL:** `CV_API_URL` environment variable
- **Auth:** `CV_API_KEY` header on all inter-service requests

---

## 9. Appendix

### 9.1 Requirement Traceability Matrix

| FR | Module | Priority | Related UC | Related NFR |
|---|---|---|---|---|
| FR-01 to FR-05 | Auth | P1/P2 | UC-01/02/03 | NFR-08,09,14 |
| FR-06 to FR-10 | User Mgmt | P1/P2 | – | NFR-11,16 |
| FR-11 to FR-14 | Dept/Course/Subject | P1 | – | – |
| FR-15 to FR-16 | Enrollment | P1/P2 | UC-02 | – |
| FR-17 to FR-22 | Face Dataset | P1/P2 | UC-02 | NFR-15 |
| FR-23 to FR-28 | Attendance | P1 | UC-01 | NFR-01,02,29 |
| FR-29 to FR-31 | Timetable | P1 | – | – |
| FR-32 to FR-34 | Leave | P1/P2 | UC-03 | – |
| FR-35 to FR-38 | Reports | P1/P2 | UC-04 | NFR-05 |
| FR-39 to FR-41 | AI/ML | P2/P3 | UC-05 | – |
| FR-42 to FR-43 | Notifications | P1 | – | – |
| FR-44 to FR-45 | Audit Log | P1/P2 | – | NFR-35 |
| FR-46 to FR-48 | Dashboard | P1 | – | NFR-07 |
| FR-49 to FR-50 | Settings | P2/P3 | – | – |

---

*End of Software Requirements Specification*
*FRAMS Project | B.Tech CS Final Year | Version 1.0 | July 2026*
