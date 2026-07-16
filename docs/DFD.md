# Data Flow Diagrams (DFD)
## AI-Powered Face Recognition Attendance Management System (FRAMS)

This document provides a detailed breakdown of the data flow within the FRAMS application. It includes Level 0 (Context Diagram), Level 1 (System Decomposition), and Level 2 (Detailed Processes) diagrams using Mermaid syntax, accompanied by process descriptions, data store maps, and data flow descriptions.

---

## 1. DFD Level 0: Context Diagram

The Context Diagram defines the system boundary, showing the high-level inputs and outputs between the **FRAMS Core System** and external entities (users and cloud services).

```mermaid
graph TD
    %% Entities
    ADMIN["👤 Administrator"]
    TEACHER["👤 Teacher / Faculty"]
    STUDENT["👤 Student"]
    CDN["☁️ ImageKit.io CDN"]
    SMTP["📧 SMTP Email Service"]

    %% Core System
    SYSTEM(("💻 FRAMS System"))

    %% Data Flows - Admin
    ADMIN -->|"User Creation & Credentials"| SYSTEM
    ADMIN -->|"Course, Subject, & Timetable Data"| SYSTEM
    ADMIN -->|"System Configuration Settings"| SYSTEM
    SYSTEM -->|"Audit Logs & System Reports"| SYSTEM
    SYSTEM -->|"System Statistics & Health Logs"| ADMIN

    %% Data Flows - Teacher
    TEACHER -->|"Attendance Session Details"| SYSTEM
    TEACHER -->|"Manual Attendance Overrides"| SYSTEM
    TEACHER -->|"Leave Approval / Rejection"| SYSTEM
    SYSTEM -->|"Timetable Schedules"| TEACHER
    SYSTEM -->|"Class Attendance Reports"| TEACHER
    SYSTEM -->|"Leave Request Notifications"| TEACHER

    %% Data Flows - Student
    STUDENT -->|"Webcam Face Frames (Enrollment)"| SYSTEM
    STUDENT -->|"Leave Requests"| SYSTEM
    STUDENT -->|"Profile Updates"| SYSTEM
    SYSTEM -->|"Attendance Dashboards"| STUDENT
    SYSTEM -->|"In-App Alerts (Low Attendance)"| STUDENT

    %% Data Flows - Cloud Services
    SYSTEM -->|"Upload Raw Face Images"| CDN
    CDN -->|"Image URLs & File IDs"| SYSTEM
    SYSTEM -->|"Trigger Email (OTP, Welcome)"| SMTP
```

### Entity Interactions

*   **Administrator**: Manages master configuration (users, courses, subjects, timetables, and system-wide settings) and receives consolidated logs and statistics.
*   **Teacher**: Configures and runs attendance sessions, performs manual corrections, reviews leave requests, and generates reports.
*   **Student**: Registers facial datasets, views attendance logs, submits leave requests, and receives automated low-attendance warnings.
*   **ImageKit.io CDN**: Stores face images securely and yields accessible image URLs for the face recognition pipeline.
*   **SMTP Service**: Dispatches system notifications (welcome emails, one-time passwords, and urgent attendance warnings).

---

## 2. DFD Level 1: System Decomposition

The Level 1 DFD decomposes the system into major functional modules, illustrating how data flows between processes, data stores, and external entities.

```mermaid
graph TB
    %% External Entities
    ADMIN["👤 Administrator"]
    TEACHER["👤 Teacher"]
    STUDENT["👤 Student"]
    SMTP["📧 SMTP Service"]
    CDN["☁️ ImageKit.io CDN"]

    %% Process Nodes
    P1(("1.0<br/>Authentication &<br/>Access Control"))
    P2(("2.0<br/>User & Enrollment<br/>Management"))
    P3(("3.0<br/>Timetable<br/>Management"))
    P4(("4.0<br/>Attendance Session<br/>Management"))
    P5(("5.0<br/>Face Dataset<br/>Enrollment"))
    P6(("6.0<br/>Leave Workflow<br/>Processing"))
    P7(("7.0<br/>Analytics & ML<br/>Predictions"))

    %% Data Stores
    D1[("D1: Users")]
    D2[("D2: Students/Teachers")]
    D3[("D3: Timetables")]
    D4[("D4: Attendance Sessions")]
    D5[("D5: Attendances")]
    D6[("D6: Leave Requests")]
    D7[("D7: Face Datasets")]
    D8[("D8: Predictions")]
    D9[("D9: Audit Logs")]

    %% Process 1 Flows
    ADMIN & TEACHER & STUDENT -->|"Credentials"| P1
    P1 -->|"Read/Write User"| D1
    P1 -->|"Log Session Events"| D9
    P1 -->|"Send OTP"| SMTP

    %% Process 2 Flows
    ADMIN -->|"CSV/Form User Data"| P2
    P2 -->|"Write User Info"| D1
    P2 -->|"Write Profiles"| D2
    P2 -->|"Log Administrative Event"| D9

    %% Process 3 Flows
    ADMIN -->|"Schedule Grid Details"| P3
    P3 -->|"Query Teacher Availability"| D2
    P3 -->|"Create/Update Slots"| D3

    %% Process 4 Flows
    TEACHER -->|"Open/Close Session"| P4
    P4 -->|"Check Schedule"| D3
    P4 -->|"Create Session"| D4
    P4 -->|"Mark Attendances"| D5
    P4 -->|"Read Face Encodings"| D7
    TEACHER -->|"Manual Correction"| P4

    %% Process 5 Flows
    STUDENT -->|"Live Video Stream"| P5
    P5 -->|"Upload Image Files"| CDN
    CDN -->|"Secure CDN URL"| P5
    P5 -->|"Save Encodings & URLs"| D7
    P5 -->|"Update FaceEnrolled flag"| D2

    %% Process 6 Flows
    STUDENT -->|"Submit Leave Request"| P6
    P6 -->|"Write Leave Doc"| D6
    TEACHER -->|"Approve/Reject"| P6
    P6 -->|"Update Status"| D6
    P6 -->|"Override Attendance"| D5

    %% Process 7 Flows
    TEACHER & STUDENT -->|"Request Report"| P7
    P7 -->|"Aggregate Attendances"| D5
    P7 -->|"Read Student Features"| D2
    P7 -->|"Load Attendance History"| D5
    P7 -->|"Write predictions"| D8
    P7 -->|"Display Charts & Risks"| TEACHER & STUDENT
```

### Process Explanations

1.  **1.0 Authentication & Access Control**: Verifies user identity via JWT tokens, handles password modification, and logs access security events.
2.  **2.0 User & Enrollment Management**: Manages student and teacher directories, processes bulk CSV files, and structures department links.
3.  **3.0 Timetable Management**: Checks for scheduling collisions (teachers or rooms double-booked) and structures the weekly calendar.
4.  **4.0 Attendance Session Management**: Governs lecture-based sessions, processes automated student detections, and logs manual edits.
5.  **5.0 Face Dataset Enrollment**: Coordinates webcam frames, filters out blurred images, compiles vectors, and logs CDN assets.
6.  **6.0 Leave Workflow Processing**: Processes requests, links files, notifies educators, and updates attendance status records.
7.  **7.0 Analytics & ML Predictions**: Evaluates historical records to compute attendance percentages and runs the Random Forest model to flag students at risk of shortage.

---

## 3. DFD Level 2: Detailed Processes

This section details the sub-processes for **Process 4.0 (Attendance Session)** and **Process 5.0 (Face Dataset Enrollment & Recognition)** to show exact logic flows.

### 3.1 Process 4.0: Detailed Attendance Session Marking

This DFD shows how an attendance session is opened, how face recognition data is processed, and how records are updated.

```mermaid
graph TB
    %% Entities
    TEACHER["👤 Teacher"]
    CV_API["🐍 CV API Module"]

    %% Processes
    P4_1(("4.1<br/>Verify Slot &<br/>Open Session"))
    P4_2(("4.2<br/>Capture & Map<br/>Recognized Face"))
    P4_3(("4.3<br/>Record Manual<br/>Override"))
    P4_4(("4.4<br/>Close Session &<br/>Commit Absentees"))

    %% Data Stores
    D3[("D3: Timetable")]
    D4[("D4: Attendance Sessions")]
    D5[("D5: Attendances")]
    D7[("D7: Face Datasets")]
    D9[("D9: Audit Logs")]

    %% Flow lines
    TEACHER -->|"Select Subject, Period & Room"| P4_1
    P4_1 -->|"Query Schedule Slots"| D3
    P4_1 -->|"Write Session status='open'"| D4

    TEACHER -->|"Start Webcam Stream"| P4_2
    CV_API -->|"Match Stream to Student IDs"| P4_2
    P4_2 -->|"Load Active Encodings"| D7
    P4_2 -->|"Write Present Status"| D5

    TEACHER -->|"Select Student & Status"| P4_3
    P4_3 -->|"Upsert Status"| D5
    P4_3 -->|"Log Correction details"| D9

    TEACHER -->|"Click Close Session"| P4_4
    P4_4 -->|"Query Present Students"| D5
    P4_4 -->|"Auto-mark remaining as Absent"| D5
    P4_4 -->|"Update Session status='closed'"| D4
```

*   **Process 4.1**: Validates that a session for the given date, time, and class section does not already exist. If unique, an `AttendanceSession` document is saved as `open`.
*   **Process 4.2**: The teacher's browser streams webcam frames. The CV API matches detected faces against stored student encodings, running liveness checks in parallel. Confirmed matches are written to the `attendances` collection.
*   **Process 4.3**: Allows the teacher to correct wrong detections, logging each change to the `audit_logs` collection.
*   **Process 4.4**: Compares the student roster against present records, writes `Absent` documents for missing students, and sets the session status to `closed`.

---

### 3.2 Process 5.0: Detailed Face Dataset Enrollment & Verification

This DFD shows the face capture loop, image validation, encoding calculation, and CDM integration.

```mermaid
graph TB
    %% Entities
    STUDENT["👤 Student / Candidate"]
    ADMIN["👤 Admin / Teacher Operator"]
    CDN["☁️ ImageKit.io CDN"]

    %% Processes
    P5_1(("5.1<br/>Initiate Session &<br/>Open Stream"))
    P5_2(("5.2<br/>Detect Face &<br/>Validate Quality"))
    P5_3(("5.3<br/>Compile Encodings &<br/>Calculate Mean"))
    P5_4(("5.4<br/>Commit to CDN &<br/>Update Student status"))

    %% Data Stores
    D2[("D2: Students Profile")]
    D7[("D7: Face Datasets")]

    %% Flow lines
    ADMIN -->|"Select Student Roll"| P5_1
    P5_1 -->|"Verify Student Profile"| D2
    P5_1 -->|"Initialize Camera Overlay"| STUDENT

    STUDENT -->|"Base64 Frames"| P5_2
    P5_2 -->|"Quality Checks (Blur, Lighting)"| P5_2
    P5_2 -->|"If valid: save frame to buffer"| P5_3

    P5_3 -->|"Loop until 100 images captured"| P5_3
    P5_3 -->|"Compute 128-dim vectors"| P5_3
    P5_3 -->|"Calculate mean encoding array"| P5_4

    P5_4 -->|"Upload JPEGs to CDN"| CDN
    CDN -->|"Image CDN URLs"| P5_4
    P5_4 -->|"Create FaceDataset document"| D7
    P5_4 -->|"Set faceEnrolled=true"| D2
```

*   **Process 5.1**: Initializes the enrollment workspace, ensuring the student profile is valid and does not have an active face dataset.
*   **Process 5.2**: Reviews video frames. The camera overlay prompts the user to rotate their head to capture multiple angles. Blurry or poorly-lit frames are rejected.
*   **Process 5.3**: Computes 128-dimensional vectors from the 100 captured frames and averages them to create a mean encoding.
*   **Process 5.4**: Uploads the raw images to ImageKit.io, links the assets in the database, sets the student's `faceEnrolled` flag to `true`, and updates the in-memory Known Faces registry.

---

## 4. Data Dictionary: Key Data Flows

The table below defines the structure and contents of key data flows represented in the DFDs.

| Data Flow Name | Source | Destination | Data Elements (Fields) | Format / Protocol |
|---|---|---|---|---|
| User Credentials | User | P1.0 | `email`, `password` | JSON / HTTPS |
| Welcome Credentials | P2.0 | SMTP Service | `email`, `name`, `tempPassword`, `loginUrl` | Email Template / SMTP |
| Schedule Slot Data | Admin | P3.0 | `subjectId`, `teacherId`, `day`, `period`, `startTime`, `endTime`, `room` | JSON / HTTPS |
| Capture Frame Stream | Browser | P4.2 / P5.2 | `sessionId`, `frame` (Base64 JPEG string) | JSON / HTTPS REST |
| Recognition Matches | CV API | P4.2 | `sessionId`, `matches: [{ studentId, confidence, isLive, bbox }]` | JSON / HTTPS |
| Leave Submission | Student | P6.0 | `studentId`, `startDate`, `endDate`, `leaveType`, `reason`, `document` (PDF/JPEG) | multipart/form-data |
| Attendance Correction | Teacher | P4.3 | `attendanceId`, `status`, `reason` | JSON / HTTPS |
| ML Risk Reports | P7.0 | Teacher / Admin | `studentId`, `riskLevel`, `probability`, `predictedEndAttendance` | JSON / HTTPS |

---

*End of Data Flow Diagrams Document*
*FRAMS Project | B.Tech CS Final Year | Version 1.0 | July 2026*
