# Local Installation & Configuration Guide
## AI-Powered Face Recognition Attendance Management System (FRAMS)

This document provides step-by-step instructions for installing and running the MERN + Python/FastAPI codebase on local development machines (Windows, macOS, and Linux).

---

## 1. System Requirements & Prerequisites

Verify that the following tools are installed and match the required versions:

| Tool / Runtime | Required Version | Purpose | Verify Command |
|---|---|---|---|
| **Node.js** | v20.x or higher | Runs backend and frontend environments | `node -v` |
| **npm** | v10.x or higher | Package manager for Node modules | `npm -v` |
| **Python** | v3.10.x to v3.11.x | Runs the CV API and prediction models | `python --version` |
| **Git** | v2.40.x or higher | Version control and repository access | `git --version` |
| **MongoDB** | Community Server 6.0+ | Local NoSQL database store | `mongod --version` |
| **CMake** | v3.22 or higher | Required to compile the C++ `dlib` library | `cmake --version` |

---

## 2. Operating System Specific Tooling (Critical for `dlib`)

The `face_recognition` library relies on `dlib`, which is written in C++. It compiles during installation and requires a C++ compiler.

### 2.1 Windows (C++ Build Tools Setup)
1.  Download the **Visual Studio Community Installer** (vs_community.exe).
2.  Open the installer, select **Workloads**, and check **Desktop development with C++**.
3.  Ensure the following individual components are selected:
    *   *MSVC v143 - VS 2022 C++ x64/x86 build tools*
    *   *Windows 11 SDK* (or Windows 10 SDK)
    *   *C++ CMake tools for Windows*
4.  Complete the installation and restart your system.
5.  Add CMake to your path: `C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE\CommonExtensions\Microsoft\CMake\Bin`.

### 2.2 macOS (Xcode Tools Setup)
Install the command-line developer tools by running the following command in terminal:
```bash
xcode-select --install
```
If you use Homebrew, verify that cmake is installed:
```bash
brew install cmake
```

### 2.3 Linux (Debian/Ubuntu Setup)
Install the build-essential and development headers:
```bash
sudo apt-get update
sudo apt-get install -y build-essential cmake libopenblas-dev liblapack-dev libx11-dev libgtk-3-dev
```

---

## 3. Installation Step-by-Step

### Step 3.1: Clone the Repository
Open a terminal and clone the repository:
```bash
git clone https://github.com/username/AMS.git
cd AMS
```

---

### Step 3.2: Configure & Run the Backend API

1.  Navigate to the server directory:
    ```bash
    cd server
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create your environment file:
    *   Copy `.env.example` to `.env`.
    *   Configure the database string (`MONGODB_URI = mongodb://localhost:27017/frams`).
    *   Configure your ImageKit credentials and email SMTP credentials (refer to the Deployment Guide for details).
4.  Seed the database (creates default Administrator and courses):
    ```bash
    npm run seed
    ```
5.  Start the backend API in development mode:
    ```bash
    npm run dev
    ```
    The server will start on `http://localhost:5000`.

---

### Step 3.3: Configure & Run the Frontend React App

1.  Open a new terminal window and navigate to the client directory:
    ```bash
    cd client
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create your environment file:
    *   Copy `.env.example` to `.env`.
    *   Verify the API URL variable:
        ```env
        VITE_API_URL=http://localhost:5000/api/v1
        ```
    *   *Note on `html5-qrcode` & Camera/Geolocation permissions*: Ensure your browser is allowed access to both Camera and Location Services for `/student/qr-scanner` and `/student/face-profile`.
4.  Start the Vite local development server:
    ```bash
    npm run dev
    ```
    Open `http://localhost:5173` in your browser.

---

### Step 3.4: Configure & Run the Computer Vision API

1.  Open a new terminal and navigate to the CV API directory:
    ```bash
    cd cv-api
    ```
2.  Create a Python virtual environment:
    ```bash
    # Windows
    python -m venv venv
    venv\Scripts\activate

    # macOS/Linux
    python3 -m venv venv
    source venv/bin/activate
    ```
3.  Install dependencies:
    ```bash
    pip install --upgrade pip
    pip install cmake
    pip install -r requirements.txt
    ```
4.  Configure your environment variables:
    *   Copy `.env.example` to `.env`.
    *   Configure the variables to match the backend configurations:
        ```env
        PORT=8000
        CV_API_KEY=secure_token_for_internal_api_use
        BACKEND_API_URL=http://localhost:5000/api/v1
        ```
5.  Start the FastAPI local application:
    ```bash
    uvicorn main:app --host 127.0.0.1 --port 8000 --reload
    ```
    Verify that the FastAPI interactive docs load at `http://127.0.0.1:8000/docs`.

---

## 4. Troubleshooting & Common Installation Errors

### Error 4.1: `dlib` Compilation Fails (Windows / macOS)
*   **Symptom**: Long tracebacks during `pip install -r requirements.txt` showing compiler warnings, followed by `Failed building wheel for dlib`.
*   **Cause**: The installer cannot find C++ build tools or CMake.
*   **Solution**:
    1. Verify CMake is installed: `cmake --version`.
    2. (Windows) Ensure Visual Studio C++ build tools are active.
    3. Install dlib directly from pre-compiled wheels if compilation fails:
       ```bash
       pip install https://github.com/slepe/dlib-wheels/raw/master/dlib-19.22.99-cp310-cp310-win_amd64.whl
       ```
       *(Make sure to download the version matching your Python version. `cp310` is for Python 3.10).*

### Error 4.2: MongoDB Connection Timeout
*   **Symptom**: Backend startup logs show: `MongoParseError` or `MongooseServerSelectionError: connection timed out`.
*   **Cause**: Either the local `mongod` service is inactive or your MongoDB Atlas IP access list is blocking the request.
*   **Solution**:
    1. (Local) Start the MongoDB service:
       * *Windows*: Run `net start MongoDB` in admin command prompt.
       * *Linux*: Run `sudo systemctl start mongod`.
    2. (Atlas) Check that your IP is whitelisted (`Network Access` in MongoDB Atlas console).

### Error 4.3: Webcam WebRTC Permissions Blocked
*   **Symptom**: The browser displays a warning icon on the webcam feed and reads: `NotAllowedError: Permission denied`.
*   **Cause**: WebRTC camera access requires a secure connection. Browsers block webcam access on insecure connections, except on `localhost` or `127.0.0.1`.
*   **Solution**:
    1. Access the local app via `http://localhost:5173` instead of the local network IP (e.g., `http://192.168.1.15:5173`).
    2. For external testing over a local network, configure the dev server to run with HTTPS or use a tunneling service like `ngrok`.

### Error 4.4: Render Memory Limit Exceeded (FastAPI)
*   **Symptom**: Log prints show `SIGKILL` or `Out of Memory (OOM)` followed by application restart.
*   **Cause**: Loading too many face encodings into memory during start-up on Render's 512 MB Free tier.
*   **Solution**:
    1. Edit `cv-api/main.py` to fetch encodings lazily (on demand) rather than loading the entire registry at startup.
    2. Reduce uvicorn processes to 1 (`--workers 1`).

---

*End of Local Installation Guide*
*FRAMS Project | B.Tech CS Final Year | Version 1.0 | July 2026*
