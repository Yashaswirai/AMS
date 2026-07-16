# Walkthrough: AI-Powered Attendance Management System (AMS)

The B.Tech final year project—an AI-powered Attendance Management System—has been successfully architected and built from scratch. 

## 1. Project Structure & Architecture
The project was designed as a monorepo containing three distinct services:
- **`d:\AMS\client`**: The React.js frontend application (Vite, Tailwind CSS, Recharts).
- **`d:\AMS\server`**: The Node.js/Express backend API (MongoDB, JWT Auth).
- **`d:\AMS\ml-api`**: The Python Flask Data Science/Machine Learning API.

## 2. Machine Learning & Data Science Module (`ml-api`)
Built using Python, Flask, Pandas, and Scikit-learn.
- **Data Generation**: `generate_sample_data.py` creates realistic historical attendance data with built-in correlations (e.g., lower attendance on Mondays/Fridays, weather impacts).
- **Predictive Models**: 
  - **Attendance Predictor**: Classification models (RandomForest, XGBoost) to predict if a student will be absent.
  - **Risk Detector**: Multi-class model identifying students at low/medium/high/critical risk of falling below the 75% threshold.
  - **Performance Predictor**: Regression models mapping attendance patterns to expected CGPA.
- **Clustering**: KMeans clustering to group students by attendance behavior (e.g., "Consistent Attenders", "Friday Skippers").
- **API Endpoints**: Fully RESTful endpoints for real-time predictions (`/api/ml/predict/attendance`) and data visualizations (`/api/ds/charts`).

## 3. Node.js Backend API (`server`)
A highly scalable Express.js backend using MVC architecture.
- **Mongoose Models**: Designed 9 optimized schemas with proper indexing (`User`, `Department`, `Course`, `Subject`, `Student`, `Teacher`, `Attendance`, `Timetable`, `LeaveRequest`). The `Attendance` model features a compound unique index to definitively prevent duplicate attendance entries.
- **Authentication & Security**: Implemented secure JWT authentication (Access & Refresh tokens via HTTP-only cookies), password hashing (bcrypt), and role-based access control (`admin`, `teacher`, `student`). Integrated `helmet`, `hpp`, and `express-rate-limit`.
- **Advanced API Features**: Built an `advancedResults` middleware providing out-of-the-box filtering, sorting, pagination, and regex-based searching for all CRUD operations.
- **Attendance Core**: Robust logic for Manual Marking, Bulk Marking, and QR Code generation with Geolocation verification boundaries (radius calculation).

## 4. Premium React Frontend (`client`)
A visually stunning, responsive UI built to "wow" the user.
- **Design System**: Configured Tailwind CSS with a premium color palette (Deep Indigo & Emerald), glassmorphism effects (`.glass-card`), subtle CSS micro-animations (`animate-float`, `animate-slide-up`), and comprehensive Dark Mode support.
- **Authentication Flow**: Beautiful, framer-motion animated Login and Registration pages.
- **Role-based Dashboards**:
  - **Admin Dashboard**: Comprehensive overview with Recharts (Area charts for trends, Pie charts for department breakdown) and AI-generated insight alerts.
  - **Teacher Dashboard**: Schedule overview with quick actions for marking attendance for upcoming and ongoing classes.
  - **Student Dashboard**: Visual feedback via circular progress indicators, subject-wise breakdown bars, and predictive ML warnings.

## 5. Next Steps for Deployment
The codebase is production-ready.
- **Frontend**: Deploy `client` to Vercel (`npm run build`).
- **Backend**: Deploy `server` to Render or Heroku, connected to MongoDB Atlas.
- **ML API**: Deploy `ml-api` using Gunicorn to Render or AWS EC2.
