# AI-Powered Face Recognition Attendance Management System (FRAMS)
## B.Tech Computer Science Final Year Project

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![React.js](https://img.shields.io/badge/React.js-18.x-blue.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB.svg)](https://www.python.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248.svg)](https://www.mongodb.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38B2AC.svg)](https://tailwindcss.com/)
[![ImageKit](https://img.shields.io/badge/ImageKit-CDN-F5A623.svg)](https://imagekit.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An enterprise-grade, three-tier automated attendance tracking application. FRAMS replaces manual register roll-calls with real-time, computer-vision-based facial identification, integrated anti-spoofing liveness detection, custom timetable conflict resolvers, automated leave workflows, and machine learning models for forecasting end-of-semester attendance shortages.

---

## 🌟 Key Features

*   **📷 Automated Face Recognition**: Uses dlib's ResNet model (128-dimensional face embeddings) to identify students via webcam feed with a 99.3% accuracy rate.
*   **👁️ Anti-Spoofing Liveness Checks**: Computes Eye Aspect Ratio (EAR) and monitors 3D head rotation angles to prevent spoofing via photos or video playbacks.
*   **🗓️ Timetable & Conflict Engine**: Tracks lectures and schedules, checking room and teacher availability to prevent double-bookings.
*   **✍️ Manual Override Support**: Allows teachers to manually adjust records in the UI within a 48-hour window to handle exceptions.
*   **📄 Leave Application Workflow**: Automated system that updates student attendance records to `Leave` once leave requests are approved by faculty.
*   **🔮 ML Attendance Forecasting**: Uses a Random Forest Classifier to predict the risk (High, Medium, Low) of a student falling below the 75% attendance threshold.
*   **📊 PDF & Excel Reports**: Generates and downloads detailed reports with custom date, class, and subject filters.
*   **🔔 Real-Time Notifications**: Sends alerts for low attendance, leave request updates, and timetable changes.
*   **🔒 System-Wide Audit Trails**: Logs all administrative and attendance-marking events to an append-only collection.

---

## 🛠️ Technology Stack

| Layer | Component | Technologies |
|---|---|---|
| **Presentation** | Frontend Client | React.js 18, Vite, Tailwind CSS, Redux Toolkit, RTK Query, Lucide Icons, Recharts |
| **Application** | Backend API | Node.js 20, Express.js 4, Mongoose ODM, JWT Auth, Nodemailer, ExcelJS, PDFKit |
| **CV / AI Core** | Computer Vision Engine | Python 3.10, FastAPI, `face_recognition` (dlib), OpenCV, scikit-learn, NumPy |
| **Storage / CDN** | Databases & Cloud CDN | MongoDB Atlas, ImageKit.io CDN (Face Images & Leaves) |
| **Hosting** | Production Cloud | Vercel (Frontend), Render.com (Backend API & FastAPI CV Service) |

---

## 📂 Architecture Overview

The system consists of three main sub-directories:

```
AMS/
├── client/          # React.js SPA (Vite)
│   ├── src/components/ # Shared UI widgets
│   ├── src/pages/      # Role dashboards & forms
│   └── src/store/      # Global state & RTK Query
│
├── server/          # Node.js Express Backend API
│   ├── controllers/    # Express endpoint controllers
│   ├── models/         # Mongoose collection schemas
│   └── routes/         # Express routers
│
└── cv-api/          # FastAPI Computer Vision API
    ├── main.py         # FastAPI routes
    ├── core/           # Face recognition & liveness engines
    └── models/         # Pre-trained scikit-learn classifiers
```

```
[React Frontend] <---(HTTPS REST)---> [Node.js Backend] <---> [MongoDB Atlas]
                                             |
                                     (HTTPS REST Keyed)
                                             |
                                             v
                                       [FastAPI CV API] <---> [ImageKit CDN]
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
Ensure you have the following installed locally:
*   Node.js (v20+)
*   Python (3.10+)
*   MongoDB Community Server (running on port 27017)
*   C++ Compiler & CMake (required for compiling the C++ `dlib` library)

---

### 2. Startup Instructions

```bash
# Terminal 1: Node.js Backend API
cd server
npm install
npm run seed  # Seeds default test profiles
npm run dev   # Runs on http://localhost:5000

# Terminal 2: React Frontend App
cd client
npm install
npm run dev   # Runs on http://localhost:5173

# Terminal 3: FastAPI Computer Vision API
cd cv-api
python -m venv venv
# Windows: venv\Scripts\activate | macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000 # Runs on http://localhost:8000
```

---

## 🔐 Default Test Credentials

If you ran `npm run seed` during installation, log in using the following default test accounts:

*   **Administrator**: `admin@ams.com` | Password: `adminPassword123`
*   **Teacher**: `teacher@ams.com` | Password: `teacherPassword123`
*   **Student**: `student@ams.com` | Password: `studentPassword123`

---

## 📋 API Endpoints Summary

Below is a summary of the primary API endpoints. For detailed request/response schemas, refer to the [API Documentation](docs/API_Documentation.md).

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| **POST** | `/api/v1/auth/login` | 🔓 Public | Login and retrieve tokens |
| **POST** | `/api/v1/auth/refresh` | 🔓 Public | Refresh access tokens |
| **POST** | `/api/v1/admin/users` | 👑 Admin | Create student or teacher profiles |
| **POST** | `/api/v1/admin/users/bulk-import` | 👑 Admin | Bulk import students via CSV |
| **POST** | `/api/v1/attendance/sessions` | 📚 Teacher | Create a new attendance session |
| **POST** | `/api/v1/attendance/sessions/:id/mark-face` | 📚 Teacher | Process student face matches |
| **PATCH** | `/api/v1/attendance/sessions/:id/close` | 📚 Teacher | Close session and write absences |
| **POST** | `/api/v1/leaves` | 🎓 Student | Submit a leave request |
| **PATCH** | `/api/v1/leaves/:id/approve` | 📚 Teacher | Approve or reject leave applications |
| **GET** | `/api/v1/analytics/student/:id` | 🔑 Authenticated | View detailed attendance summaries |
| **GET** | `/api/v1/predictions/student/:id` | 📚 Teacher | Fetch ML shortage warnings |

---

## 🤝 Contributing

This project was developed as a final year academic submission. To submit improvements or fixes:
1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/NewFeature`.
3. Commit your changes: `git commit -m 'Add NewFeature'`.
4. Push the branch: `git push origin feature/NewFeature`.
5. Create a Pull Request.

---

## 📜 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more details.

---

*FRAMS Project | B.Tech CS Final Year | Version 1.0 | July 2026*
