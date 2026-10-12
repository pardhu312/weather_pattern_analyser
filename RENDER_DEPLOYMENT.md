# Render Deployment Guide

This guide explains how to deploy the **Weather Pattern Analyzer** full-stack application to [Render](https://render.com/).

---

## Architecture Overview

| Component | Technology | Render Service Type | Root Directory |
|---|---|---|---|
| **Database** | PostgreSQL 16 | PostgreSQL Database | N/A |
| **Backend API** | Spring Boot 4 (Java 17) | Web Service (Docker) | `weather-api` |
| **ML Service** | FastAPI (Python 3.11) | Web Service (Docker) | `ml-service` |
| **Frontend** | React / Vite SPA | Static Site | `frontend` |

---

## Deployment Option 1: Automatic Blueprint (Recommended)

Render Blueprints allow you to deploy the entire stack—PostgreSQL, Spring Boot backend, FastAPI ML service, and React frontend—with a single click using the [`render.yaml`](./render.yaml) file.

### Step 1: Push your code to GitHub or GitLab
Make sure your project repository is pushed to GitHub or GitLab.

### Step 2: Create a Blueprint Instance on Render
1. Go to the [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** in the top right and select **Blueprint**.
3. Connect your repository containing this project.
4. Render will parse `render.yaml` and show the resources to be created:
   - `weather-db` (PostgreSQL Database)
   - `weather-api` (Docker Web Service)
   - `weather-ml-service` (Docker Web Service)
   - `weather-frontend` (Static Site)
5. Fill in the required environment variables when prompted:
   - `OPENWEATHER_API_KEY`: Your OpenWeather API key.
   - `ADMIN_PASSWORD`: A strong password for the initial admin user.
6. Click **Apply**. Render will automatically provision the database and start building all services.

### Step 3: Connect Frontend to Backend URLs
Because Vite injects environment variables **at build time**:
1. Once `weather-api` and `weather-ml-service` finish deploying, copy their public Render URLs:
   - Backend URL: `https://<your-weather-api>.onrender.com`
   - ML Service URL: `https://<your-weather-ml-service>.onrender.com`
2. Navigate to your **`weather-frontend`** Static Site settings in Render > **Environment**.
3. Set the environment variables:
   - `VITE_WEATHER_API_URL`: `https://<your-weather-api>.onrender.com`
   - `VITE_ML_API_URL`: `https://<your-weather-ml-service>.onrender.com`
4. Click **Save Changes** and trigger **Manual Deploy > Deploy latest commit** for the frontend so Vite builds with the new URLs.

---

## Deployment Option 2: Manual Step-by-Step Setup

If you prefer setting up services individually through the Render UI, follow these steps:

### 1. Create the PostgreSQL Database
1. In Render Dashboard, click **New +** > **PostgreSQL**.
2. **Name**: `weather-db`
3. **Database**: `weather_db`
4. **User**: `weather_user`
5. **Region**: Choose a region (e.g., `Oregon (US West)`).
6. **Plan**: `Free`.
7. Click **Create Database**.
8. Once created, note down:
   - **Internal Database URL** (e.g., `postgresql://weather_user:...@dpg-...:5432/weather_db`)
   - Or the individual Host, Port, Database, User, Password values.

---

### 2. Deploy `weather-api` (Spring Boot Backend)
1. In Render Dashboard, click **New +** > **Web Service**.
2. Connect your Git repository.
3. Configure the service:
   - **Name**: `weather-api`
   - **Region**: Same region as database (e.g., `Oregon`)
   - **Root Directory**: `weather-api`
   - **Runtime**: `Docker`
   - **Plan**: `Free`
   - **Health Check Path**: `/api/health`
4. Add **Environment Variables**:
   | Key | Value | Notes |
   |---|---|---|
   | `DATABASE_URL` | *Your internal Postgres URL* | Format: `postgresql://user:pass@host:5432/db` |
   | `OPENWEATHER_API_KEY` | *Your OpenWeather API Key* | Required for live weather fetching |
   | `JWT_SECRET` | *32+ byte base64 string* | Example: `nu33bwXYTaeIPeuAN9aW1jN1pomUA0pg97Iv4FnW/Cs=` |
   | `ADMIN_USERNAME` | `admin` | Initial admin username |
   | `ADMIN_EMAIL` | `admin@weather.local` | Initial admin email |
   | `ADMIN_PASSWORD` | *Your chosen admin password* | Initial admin password |
   | `CORS_ALLOWED_ORIGINS` | `*` (or your frontend URL) | Comma-separated or `*` |
5. Click **Create Web Service**.

---

### 3. Deploy `ml-service` (FastAPI ML Service)
1. In Render Dashboard, click **New +** > **Web Service**.
2. Connect your Git repository.
3. Configure the service:
   - **Name**: `weather-ml-service`
   - **Region**: Same region as database (e.g., `Oregon`)
   - **Root Directory**: `ml-service`
   - **Runtime**: `Docker`
   - **Plan**: `Free`
   - **Health Check Path**: `/health`
4. Add **Environment Variables**:
   | Key | Value | Notes |
   |---|---|---|
   | `DATABASE_URL` | *Your internal Postgres URL* | Direct connection to database |
   | `CORS_ALLOWED_ORIGINS` | `*` (or your frontend URL) | Allows cross-origin requests |
5. Click **Create Web Service**.

---

### 4. Deploy `frontend` (React / Vite Static Site)
1. In Render Dashboard, click **New +** > **Static Site**.
2. Connect your Git repository.
3. Configure the static site:
   - **Name**: `weather-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add **Environment Variables**:
   | Key | Value |
   |---|---|
   | `VITE_WEATHER_API_URL` | `https://<your-weather-api>.onrender.com` |
   | `VITE_ML_API_URL` | `https://<your-weather-ml-service>.onrender.com` |
5. Click **Create Static Site**.
*(The `public/_redirects` file automatically handles client-side React routing rewrites so direct navigation and refreshes work without 404 errors).*

---

## Key Files Created and Configured

- **`render.yaml`**: Root Infrastructure-as-Code blueprint configuring all 4 components.
- **`.gitignore`**: Project-wide gitignore protecting secrets, dependencies (`node_modules/`, `venv/`), and build artifacts (`target/`, `dist/`).
- **`weather-api/Dockerfile`**: Multi-stage Docker build packaging Spring Boot with Eclipse Temurin JDK 17.
- **`weather-api/src/main/java/com/weather_api/DatabaseConfig.java`**: Automatically converts Render's `DATABASE_URL` into standard JDBC format at runtime.
- **`weather-api/src/main/resources/application.properties`**: Dynamic environment configuration supporting `${PORT}`, `${SPRING_DATASOURCE_URL}`, and `${CORS_ALLOWED_ORIGINS}`.
- **`ml-service/Dockerfile`**: Production Dockerfile including `libgomp1` for XGBoost and running Uvicorn.
- **`ml-service/requirements.txt`**: Added `xgboost`, `python-dotenv`, and `gunicorn`.
- **`ml-service/app/main.py`**: Added dynamic `DATABASE_URL` resolution, wildcard/custom CORS support, and `PORT` handling.
- **`frontend/public/_redirects`**: Single Page Application rewrite rule (`/* /index.html 200`) preventing 404 errors on browser page reloads.
- **`.env.example`** files: Provided in `weather-api/`, `ml-service/`, and `frontend/` as clear references.

---

## Important Render Tips

1. **Free Tier Cold Starts**: Render's free tier spins down web services after 15 minutes of inactivity. When a request arrives, the service may take 30–50 seconds to wake up.
2. **Internal vs External Database URLs**:
   - Web services in the same Render region can use the **Internal Database URL** (faster and free of bandwidth costs).
   - If connecting from your local machine, use the **External Database URL**.
3. **Database SSL**: Render PostgreSQL requires SSL in production. The JDBC driver and `psycopg` handle SSL automatically.
