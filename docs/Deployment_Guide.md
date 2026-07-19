# Deployment Guide
## AI-Powered Face Recognition Attendance Management System (FRAMS)

This document provides step-by-step instructions for deploying the FRAMS system to cloud platforms. It covers the configuration of **MongoDB Atlas** (Database), **Render.com** (Backend API & Computer Vision API), and **Vercel** (Frontend SPA).

---

## 1. Prerequisites & Accounts Required

To deploy the production-ready system, register accounts on the following platforms:
*   **GitHub**: Repository hosting for CI/CD integrations.
*   **MongoDB Atlas**: Managed MongoDB cluster (Free M0 Shared Tier).
*   **Render.com**: Backend and Python/FastAPI web hosting (Free Web Service tier).
*   **Vercel**: Static frontend web hosting (Free Hobby tier).
*   **ImageKit**: Image and asset CDN storage (Free plan is sufficient).
*   **Gmail / SMTP Service**: Send notification emails and password reset OTPs.

---

## 2. MongoDB Atlas Database Setup

MongoDB Atlas hosts all collections except raw facial images. Follow these steps to configure your database:

1.  **Create a Project & Cluster**:
    *   Log in to MongoDB Atlas and click **New Project** (name it `FRAMS`).
    *   Click **Create Cluster**, choose **M0 Free Shared Tier**, select a provider (AWS), and pick a region close to your users (e.g., `us-east-1` or `ap-south-1`).
    *   Click **Create**.
2.  **Configure Network Access**:
    *   Navigate to **Security** → **Network Access** in the left menu.
    *   Click **Add IP Address**.
    *   Select **Allow Access From Anywhere** (`0.0.0.0/0`) for development/staging.
    *   *Note: For production, you can restrict access to Render's outbound IP addresses if you use Render's paid static IP service.*
3.  **Configure Database Access (Credentials)**:
    *   Navigate to **Security** → **Database Access**.
    *   Click **Add New Database User**.
    *   Choose **Password Authentication**. Set the username (e.g., `frams_db_user`) and a secure password.
    *   Assign the user the **Read and write to any database** role.
    *   Click **Add User**.
4.  **Retrieve Connection URI**:
    *   Go to **Deployment** → **Database**.
    *   Click **Connect** on your cluster.
    *   Choose **Drivers** under *Connect to your application*.
    *   Copy the connection string. It will look like this:
        ```
        mongodb+srv://frams_db_user:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
        ```
    *   Replace `<password>` with the database user's password and append the database name `frams` before `?retryWrites=true`.

---

## 3. Backend Node.js API Deployment (Render)

Deploy the Express.js API server to Render. Render will connect to your GitHub repository and redeploy automatically whenever you push to your main branch.

1.  **Create Web Service**:
    *   Log in to Render and click **New** → **Web Service**.
    *   Connect your GitHub account and select your repository.
2.  **Service Settings**:
    *   **Name**: `frams-backend-api`
    *   **Region**: Select the same region as your MongoDB cluster.
    *   **Branch**: `main` (or your production branch)
    *   **Root Directory**: `server`
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install`
    *   **Start Command**: `npm start`
    *   **Instance Type**: `Free`
3.  **Add Environment Variables**:
    *   Click **Advanced** and add the variables listed in the *Environment Variables* section below.

---

## 4. Computer Vision Python API Deployment (Render)

The CV API runs FastAPI, OpenCV, and dlib. Because dlib requires a C++ compiler to compile, Render needs a custom build configuration to install cmake and build-essential packages.

1.  **Create Web Service**:
    *   Click **New** → **Web Service** on Render.
    *   Connect the same GitHub repository.
2.  **Service Settings**:
    *   **Name**: `frams-cv-api`
    *   **Root Directory**: `cv-api`
    *   **Runtime**: `Python`
    *   **Build Command**:
        ```bash
        pip install --upgrade pip && pip install cmake && pip install -r requirements.txt
        ```
    *   **Start Command**:
        ```bash
        uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1
        ```
    *   **Instance Type**: `Free` (or `Starter` to prevent cold starts).
3.  **Mitigate Free Tier Memory Limits**:
    > [!IMPORTANT]
    > Render's Free tier provides 512 MB of RAM. The `face_recognition` (dlib) library loads model files directly into RAM. To avoid Out-Of-Memory (OOM) crashes:
    > 1. Set the uvicorn workers parameter to `--workers 1` to run a single process.
    > 2. Limit the database query size during startup model rebuilding. Only load encodings for active students rather than the entire institution.

---

## 5. React.js Frontend Deployment (Vercel)

Deploy your frontend to Vercel to distribute your static assets globally via CDN.

1.  **Import Project**:
    *   Log in to Vercel and click **Add New** → **Project**.
    *   Import your GitHub repository.
2.  **Project Settings**:
    *   **Framework Preset**: `Vite` (or `Other` if using custom build configurations).
    *   **Root Directory**: `client`
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `dist`
3.  **Add Environment Variables**:
    *   Expand **Environment Variables** and add:
        *   `VITE_API_URL` = `https://frams-backend-api.onrender.com/api/v1`
4.  **Configure Routing (SPA Fallback)**:
    Create a `vercel.json` file in the root of your `client` folder to route all requests back to `index.html` for React Router to handle:
    ```json
    {
      "rewrites": [
        { "source": "/(.*)", "destination": "/index.html" }
      ]
    }
    ```
5.  **Deploy**: Click **Deploy**. Vercel will build the React SPA and provide a live URL (e.g., `frams-app.vercel.app`).

> [!NOTE]
> **HTTPS Security Requirement**: Modern web browsers mandate an HTTPS connection to enable optical camera APIs (`html5-qrcode` / `MediaDevices.getUserMedia()`) and HTML5 Geolocation APIs (`navigator.geolocation`). Vercel provides SSL certificates out-of-the-box, ensuring both features operate seamlessly in production.

---

## 6. Environment Variables Reference Guide

Store these variables securely in your deployment control panels. Do not commit `.env` files to git repositories.

### 6.1 Backend API Server (`server/.env`)

| Key | Example Value | Description |
|---|---|---|
| `PORT` | `5000` | Port the backend runs on |
| `NODE_ENV` | `production` | Set to `production` or `development` |
| `MONGODB_URI` | `mongodb+srv://frams_db_user:password@cluster.mongodb.net/frams` | MongoDB database connection string |
| `JWT_ACCESS_SECRET` | `super_secret_access_key_12345` | Random 256-bit string to sign access tokens |
| `JWT_REFRESH_SECRET` | `super_secret_refresh_key_67890` | Random 256-bit string to sign refresh tokens |
| `JWT_ACCESS_EXPIRY` | `15m` | Expiry duration for access tokens |
| `JWT_REFRESH_EXPIRY` | `7d` | Expiry duration for refresh tokens |
| `IMAGEKIT_PUBLIC_KEY` | `public_vK8912Jks...` | ImageKit.io Public API Key |
| `IMAGEKIT_PRIVATE_KEY` | `private_u21KJs90...` | ImageKit.io Private API Key |
| `IMAGEKIT_URL_ENDPOINT` | `https://ik.imagekit.io/frams/` | ImageKit.io URL Endpoint |
| `CV_API_URL` | `https://frams-cv-api.onrender.com` | Base URL of the CV API Web Service |
| `CV_API_KEY` | `secure_token_for_internal_api_use` | Shared key for authorization headers |
| `SMTP_HOST` | `smtp.gmail.com` | Outgoing email server |
| `SMTP_PORT` | `587` | Port for SMTP (usually 587 for TLS) |
| `SMTP_USER` | `frams.alerts@gmail.com` | Username for the sender email |
| `SMTP_PASS` | `xxxx xxxx xxxx xxxx` | App Password generated in Gmail settings |
| `CLIENT_URL` | `https://frams-app.vercel.app` | URL of the frontend for CORS settings |

### 6.2 Computer Vision API (`cv-api/.env`)

| Key | Example Value | Description |
|---|---|---|
| `PORT` | `8000` | Port fastapi runs on |
| `CV_API_KEY` | `secure_token_for_internal_api_use` | Shared key that must match the backend API |
| `BACKEND_API_URL` | `https://frams-backend-api.onrender.com/api/v1` | URL of the backend API for data lookups |
| `IMAGEKIT_PUBLIC_KEY` | `public_vK8912Jks...` | ImageKit.io Public API Key |
| `IMAGEKIT_PRIVATE_KEY` | `private_u21KJs90...` | ImageKit.io Private API Key |
| `IMAGEKIT_URL_ENDPOINT` | `https://ik.imagekit.io/frams/` | ImageKit.io URL Endpoint |

---

## 7. Post-Deployment Verification Checklist

Perform these steps to verify that the deployed system is working correctly:

1.  **Check Service Availability**:
    *   Verify you get a welcome JSON response from the backend: `https://frams-backend-api.onrender.com/api/v1/health`
    *   Verify the CV API is active: `https://frams-cv-api.onrender.com/api/cv/health`
2.  **Verify Authentication**:
    *   Navigate to your frontend site, register a test administrator account, and verify that you are redirected to the login panel.
    *   Log in and check that a `refreshToken` cookie is set and that your JWT access token is stored in memory.
3.  **Run Database Seeding**:
    *   Use the administrator dashboard to create departments, courses, and subjects. Verify that they are saved in your MongoDB Atlas collections.
4.  **Test Face Registration**:
    *   Create a test student profile.
    *   Start a face registration session. Allow webcam permissions and complete the wizard (turn your head left, right, up, down).
    *   Verify that your raw photos appear in ImageKit.io and that the student's `faceEnrolled` flag changes to `true` in the database.
5.  **Test Attendance Marking**:
    *   Create a subject and assign a teacher.
    *   Log in as the teacher and click **Open Session**.
    *   Face the webcam to the student. Verify that the student is recognized in real time.
    *   Click **Close Session**. Verify that other student records update to `Absent` and that their overall attendance rates are updated.

---

*End of Deployment Guide*
*FRAMS Project | B.Tech CS Final Year | Version 1.0 | July 2026*
