# User Operation & Reference Manual
## AI-Powered Face Recognition Attendance Management System (FRAMS)

This manual provides detailed instructions on how to use the FRAMS application. It includes step-by-step guides, user interface descriptions, and screenshot placeholders for the Admin, Teacher, and Student roles.

---

## Table of Contents

1. [Introduction & Navigation](#1-introduction--navigation)
2. [Administrator Manual](#2-administrator-manual)
3. [Teacher / Faculty Manual](#3-teacher--faculty-manual)
4. [Student Manual](#4-student-manual)
5. [Frequently Asked Questions (FAQs)](#5-frequently-asked-questions-faqs)
6. [Troubleshooting & Help](#6-troubleshooting--help)

---

## 1. Introduction & Navigation

FRAMS uses a single-page web interface with a responsive layout. Users log in through a single panel, and the system routes them to their role-specific dashboard based on their credentials.

### Accessing the System
Open a browser and navigate to the application URL (e.g., `https://frams-app.vercel.app`).

---

## 2. Administrator Manual

The Administrator manages master data, registers students and faculty, configures timetables, and manages system configurations.

### 2.1 Logging In (Admin Access)
1.  Navigate to the login page.
2.  Enter your administrator email and password.
3.  Click **Log In**. You will be redirected to the Admin Dashboard.

> [!NOTE]
> **Screenshot Placeholder: Admin Dashboard**
> *Description:* Displays system overview metrics: total user counts, active subjects, overall attendance rate, pending leaves gauge, and recent audit activity logs.

---

### 2.2 Adding User Accounts (Teachers & Students)
1.  On the sidebar, click **User Management** → **Create User**.
2.  Fill in the required fields: Full Name, Email, Role (select *Teacher* or *Student*), Department, and Phone Number.
3.  If the role is **Student**, enter additional fields: Roll Number, Course, Batch Year, and Section.
4.  If the role is **Teacher**, enter: Employee ID, Designation, and Qualification.
5.  Click **Submit**. The system saves the record and sends an email to the user with their login details.

> [!NOTE]
> **Screenshot Placeholder: User Registration Form**
> *Description:* Shows the input form with fields for personal, contact, and academic role details.

---

### 2.3 Configuring Academic Structures (Departments & Courses)
1.  Go to the **Academic Management** tab.
2.  Select **Departments** to add a new department (e.g. *CSE*, *ECE*). Set the total semesters and assign the HOD.
3.  Select **Courses** to link a program (e.g. *B.Tech*) to a department, and specify its duration in years.
4.  Select **Subjects** to create a subject card. Enter the Subject Code, Name, Semester, Credit Hours, and assign the teaching faculty.

---

### 2.4 Managing Weekly Timetables
1.  Click **Timetable Setup** in the navigation sidebar.
2.  Click **Add Slot** to open the schedule editor.
3.  Select the Course, Section, Semester, Subject, Teacher, Day of the Week, Period Number, Start/End times, and Classroom.
4.  Click **Validate & Save**. The system checks for scheduling conflicts before saving.

> [!NOTE]
> **Screenshot Placeholder: Timetable Conflict Warning**
> *Description:* Red banner popup indicating a scheduling collision, detailing the conflicting teacher or room assignment.

---

### 2.5 Face Dataset Administration & AI Classifier Retraining
*   To check face registration status, open **Student Rosters** or **Face Datasets Inspector** to view enrolled student datasets.
*   **Retrain AI Classifier**:
    1. Navigate to **Face Datasets Inspector** on the Admin dashboard.
    2. Click **Retrain AI Model**. This triggers `POST /api/v1/face/train` to invoke the Python FastAPI service (`POST /api/ml/train`), which retrains the classifier weights and synchronizes the face vector cache across active nodes.
*   If a student needs to re-register their face:
    1. Open the student's profile.
    2. Click **Reset Face Data**.
    3. Confirm deletion to clear existing templates and update the known faces cache.

---

### 2.6 System Configuration Settings
1.  Click **Settings** on the admin sidebar.
2.  Adjust the configurations:
    *   *Min Attendance Threshold*: Set the percentage limit (default is 75%).
    *   *Face Recognition Tolerance*: Set between 0.3 (strictest) and 0.6 (lenient).
    *   *Liveness Verification*: Toggle to require eye blinks and head movements.
3.  Click **Save Changes** to write to the `system_configs` collection.

---

## 3. Teacher / Faculty Manual

Teachers open attendance sessions, run face recognition, verify student presence, manage leaves, and view reports.

> [!IMPORTANT]
> **Strict Data Isolation for Teachers**: Logged-in teachers can ONLY see subjects assigned to them by Admin, and ONLY see students enrolled in the courses corresponding to those assigned subjects. All dropdowns in Live Attendance, Manual Attendance, and Student Search strictly filter data based on teacher assignments.

### 3.1 Marking Attendance via Webcam

```
Step 1: Open Dashboard → Click "Start Attendance Session"
Step 2: Align Camera Frame → Allow Student Recognition
Step 3: Verify Matches → Use Manual Override if needed
Step 4: Close Session → Commit Absentees & Update Stats
```

#### Step-by-Step Instructions:
1.  From the sidebar, click **Attendance** → **New Session**.
2.  Select your assigned Subject, Section, and Period. (The session will generate an active QR token for student check-in).
3.  Click **Open Camera**. Approve the browser request for webcam permissions.
4.  Position the webcam to cover the classroom. The system will start recognizing students.
5.  Students' names will appear on the right side of the screen with green checkmarks as they are recognized.
6.  *Manual Override*: To manually mark a student, scroll through the list and check the box next to their name.
7.  Once everyone is accounted for, click **Close Session**. The system will mark the remaining students as `Absent` and close the session.

> [!NOTE]
> **Screenshot Placeholder: Live Attendance Session Console**
> *Description:* Displays the live webcam feed with bounding boxes around detected faces on the left, and a list of present, late, and absent students on the right.

---

### 3.2 Processing Student Leave Requests
1.  Go to the **Leave Requests** section. A notification badge displays the number of pending requests.
2.  Click on a request to view details (dates, leave type, and reason).
3.  Click the document link to view uploaded files (e.g. medical certificates).
4.  Click **Approve** or **Reject**. Rejections require a short reason.

---

### 3.3 Accessing Subject Reports & Analytics
1.  Navigate to **Reports**.
2.  Select your Subject, Section, and Date Range.
3.  View the attendance rate on the screen, along with charts showing class attendance trends.
4.  Click **Export PDF** or **Export Excel** to download the report.

> [!NOTE]
> **Screenshot Placeholder: Class Attendance Trend Chart**
> *Description:* Line chart showing daily attendance percentages over time, with horizontal threshold bars indicating the 75% limit.

---

## 4. Student Manual

Students can track their attendance, register face profiles, scan class QR codes, submit leave requests, and view notifications.

### 4.1 Dashboard Overview
Log in to view your dashboard:
*   **Overall Attendance Widget**: Circular gauge indicating your total attendance percentage.
*   **Subject Breakdowns**: Cards for each subject showing your attended classes and required attendance.
*   **ML Prediction Warning**: Shows your risk level for falling below 75% attendance.

---

### 4.2 Registering Student Face Profile (Dual Modes)
1.  Navigate to `/student/face-profile` on the student navigation menu.
2.  Choose your preferred registration mode:
    *   **Mode 1: Live Automated Camera Capture**: Click **Start Auto Capture**. Grant webcam permissions. The system automatically captures 10 high-quality face photos while guiding your posture (front, left, right, up, down).
    *   **Mode 2: Multi-Angle Photo Upload**: Click **Upload Photos**. Use the file picker to select up to 10 clear photos taken from different angles.
3.  Click **Submit Face Profile**. The system validates face quality, uploads images to ImageKit CDN, and updates your enrollment status to Enrolled.

---

### 4.3 QR Attendance Scanner & Geolocation Verification
1.  When a lecture session is active, navigate to `/student/qr-scanner`.
2.  Grant browser permissions for both **Camera** (for optical QR scanner) and **Location Services** (GPS).
3.  Point your camera at the teacher's active lecture QR code.
4.  The `html5-qrcode` scanner reads the session token and sends your GPS coordinates (latitude, longitude) to `POST /api/v1/attendance/mark-qr`.
5.  If your location is within the classroom boundary (default 50 meters radius), your attendance is marked as **Present (`qr_scanner`)**. If you are outside the boundary, the system rejects the check-in with an `INVALID_LOCATION` error to prevent proxy attendance.

---

### 4.4 Submitting Leave Applications
1.  From the sidebar, click **Apply for Leave**.
2.  Enter the start and end dates.
3.  Select the **Leave Type** (Medical, Personal, or Academic).
4.  Enter the reason for leave in the text area.
5.  Upload your supporting document (PDF or JPEG, max 2MB).
6.  Click **Submit Application**. The status will show as `pending` until reviewed by your teachers.

---

## 5. Frequently Asked Questions (FAQs)

#### Q1: What should I do if the camera does not recognize a student's face?
**A**: Ensure there is adequate lighting on the student's face and that they are looking directly at the camera. If the camera still fails to recognize them, the teacher can manually mark them as present using the checkbox on the attendance screen.

#### Q2: Can a student mark attendance using a photo on their phone?
**A**: No. The system has liveness detection features that require eye blinks and head movements, preventing students from using photos or videos to bypass the system.

#### Q3: How do approved leave requests affect attendance calculations?
**A**: Once a leave request is approved, affected attendance records are updated to `Leave`. Leaves are counted as excused absences and are excluded from the total lecture count, so they do not lower the student's attendance percentage.

#### Q4: Can teachers edit attendance records after a session is closed?
**A**: Yes, teachers can edit attendance records within 48 hours of closing a session. After 48 hours, only administrators can make changes. All edits are logged in the audit trail.

---

## 6. Troubleshooting & Help

### Webcam Access Issues
*   **Problem**: The browser displays a "Camera blocked" or "Permission denied" error.
*   **Solution**:
    1. Click the lock icon in your browser's address bar.
    2. Toggle the **Camera** permission to *Allow*.
    3. Refresh the page.
    4. Ensure no other applications (e.g. Zoom, Teams) are using the camera.

### Login Issues
*   **Problem**: You receive an "Invalid Credentials" or "Unauthorized" error message.
*   **Solution**:
    1. Double-check your spelling and caps-lock key.
    2. If you forgot your password, click **Forgot Password** on the login screen to request a reset code.
    3. If your account is deactivated, contact the administrator to reactivate it.

### Warning Alerts
*   **Problem**: A "Low Attendance Alert" email or notification is received.
*   **Solution**: Log in to the student portal to view the affected subjects. If you have valid excuses (e.g. illness), submit a leave request with supporting documents.

---

*End of User Manual*
*FRAMS Project | B.Tech CS Final Year | Version 1.0 | July 2026*
