# 🚀 Vercel Deployment & Hosting Guide

This project has been fully configured for deployment on **Vercel** (both Frontend and Backend), as well as seamless local development.

---

## 📋 What Was Fixed & Configured

1. **Root Directory Support (`package.json` & `start-dev.js`)**:
   - Fixed the missing root configuration that was causing terminal errors when running `npm start`.
   - Running `npm start` at root now launches both Backend and Frontend together.

2. **Frontend Dynamic API Configuration**:
   - Removed all hardcoded `http://localhost:5000` URLs across all React pages (`Login`, `Register`, `Header`, `StudentDashboard`, `TeacherDashboard`, `CreateSession`, `QRScanner`, `AttendanceHistory`).
   - Created [`src/apiConfig.js`](file:///d:/mini-project/student-attendace/src/apiConfig.js) which dynamically reads `REACT_APP_API_URL` on Vercel and falls back to `http://localhost:5000` locally.
   - Added [`student-attendace/vercel.json`](file:///d:/mini-project/student-attendace/vercel.json) to handle React Router client-side SPA routing rewrites (prevents 404 errors on page refresh).

3. **Backend Serverless & Cloud Compatibility**:
   - Upgraded MySQL connection in [`backend/server.js`](file:///d:/mini-project/backend/server.js) from single connection to connection pooling (`mysql2.createPool`), essential for serverless environments.
   - Added cloud database environment variables (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `DB_SSL`, `DATABASE_URL`).
   - Added root diagnostics `/` and `/health` endpoints to verify deployment and database connectivity.
   - Added serverless export `module.exports = app;` and conditional listener for Vercel.
   - Added [`backend/vercel.json`](file:///d:/mini-project/backend/vercel.json) with `@vercel/node` runtime configuration.
   - Created [`backend/schema.sql`](file:///d:/mini-project/backend/schema.sql) for 1-click cloud database table creation.

---

## ☁️ Step 1: Set Up Cloud MySQL Database (Free)

> **Important**: Vercel hosts code and serverless functions, but does not host MySQL databases directly. You need a free cloud MySQL database.

### Recommended Free Providers:
1. **TiDB Cloud (Recommended - Free Serverless MySQL)**:
   - Go to [https://tidbcloud.com](https://tidbcloud.com) and create a free account.
   - Click **Create Cluster** -> Select **Serverless (Free)**.
   - In the cluster overview, click **Connect** to get your connection details:
     - `DB_HOST`
     - `DB_PORT` (usually `4000`)
     - `DB_USER`
     - `DB_PASSWORD`
     - `DB_NAME` (set to `attendance_system`)
     - `DB_SSL` = `true`
   - Open the **SQL Editor** tab in TiDB Cloud and execute the contents of [`backend/schema.sql`](file:///d:/mini-project/backend/schema.sql).

2. **Alternative Providers**:
   - [Aiven MySQL](https://aiven.io/mysql) (Free tier)
   - [Clever Cloud MySQL](https://www.clever-cloud.com) (Free tier)
   - [Railway](https://railway.app) (MySQL add-on)

---

## ⚡ Step 2: Deploy Backend to Vercel

1. Push your repository to **GitHub** (if not already pushed).
2. Go to the [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..."** -> **"Project"**.
3. Select your GitHub repository.
4. In the configuration screen:
   - **Project Name**: `attendance-backend` (or your preferred name)
   - **Root Directory**: Click **Edit** and select `backend`
   - **Framework Preset**: Other
5. Expand **Environment Variables** and add:
   | Key | Value | Description |
   |---|---|---|
   | `DB_HOST` | *(your cloud DB host)* | Cloud database host |
   | `DB_USER` | *(your cloud DB username)* | Cloud database username |
   | `DB_PASSWORD` | *(your cloud DB password)* | Cloud database password |
   | `DB_NAME` | `attendance_system` | Database name |
   | `DB_PORT` | `3306` (or `4000` for TiDB) | Database port |
   | `DB_SSL` | `true` | Enable SSL for cloud DB |
   | `JWT_SECRET` | `attendance_system_secret_2024` | Secret key for JWT |
6. Click **Deploy**.
7. Once deployed, test your backend:
   - Visit: `https://your-backend-project.vercel.app/` -> should return `{"status":"ok", ...}`
   - Visit: `https://your-backend-project.vercel.app/health` -> should return `{"status":"ok","database":"connected"}`
8. **Copy your Backend URL** (e.g. `https://attendance-backend-xxxx.vercel.app`).

---

## 🎨 Step 3: Deploy Frontend to Vercel

1. In the [Vercel Dashboard](https://vercel.com/dashboard), click **"Add New..."** -> **"Project"** again.
2. Select the **same GitHub repository**.
3. In the configuration screen:
   - **Project Name**: `attendance-frontend` (or your preferred name)
   - **Root Directory**: Click **Edit** and select `student-attendace`
   - **Framework Preset**: **Create React App**
4. Expand **Environment Variables** and add:
   | Key | Value |
   |---|---|
   | `REACT_APP_API_URL` | `https://your-backend-project.vercel.app` *(from Step 2)* |
5. Click **Deploy**.
6. Once deployed, open your frontend URL (e.g., `https://attendance-frontend-xxxx.vercel.app`).

---

## 💻 Running Locally

To run the project locally on your machine:
```bash
# In the root mini-project directory:
npm start
```
This runs both the Express backend on `http://localhost:5000` and the React frontend on `http://localhost:3000` concurrently.
