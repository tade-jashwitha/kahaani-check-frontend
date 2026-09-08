# Deploying Kahaani-Check on Render

This guide outlines how to deploy both the **FastAPI Backend** and the **Next.js Frontend** on [Render](https://render.com).

---

## Method 1: 1-Click Render Blueprint (Recommended)

The repository includes a ready-to-use [`render.yaml`](./render.yaml) Blueprint that automatically configures both services together.

### Step-by-Step

1. **Sign in to Render**:
   - Go to [dashboard.render.com](https://dashboard.render.com/) and sign in with your GitHub account.

2. **Connect Blueprint**:
   - In the Render Dashboard, click the **New +** button in the top right.
   - Select **Blueprint**.
   - Connect your GitHub repository: `tade-jashwitha/kahaani-check-frontend` (give Render repository access if prompted).

3. **Review & Deploy**:
   - Render will read `render.yaml` and show:
     - `kahaani-backend` (Docker Web Service, Plan: Free)
     - `kahaani-frontend` (Docker Web Service, Plan: Free)
   - Click **Apply**.
   - Render will automatically build both Docker containers and assign public URLs (e.g., `https://kahaani-backend.onrender.com` and `https://kahaani-frontend.onrender.com`).

4. **Verify Live**:
   - Test backend health: `https://<your-backend-name>.onrender.com/healthz` (should return `{"status":"ok"}`).
   - Open frontend in browser: `https://<your-frontend-name>.onrender.com/dashboard/elders`.

---

## Method 2: Manual Dashboard Setup (Without Blueprint)

If you prefer creating services manually from the Render dashboard:

### 1. Deploy the Backend Service

1. In Render Dashboard, click **New +** -> **Web Service**.
2. Select your repository: `tade-jashwitha/kahaani-check-frontend`.
3. Configure the settings:
   - **Name**: `kahaani-backend`
   - **Region**: Oregon (or nearest to your users)
   - **Branch**: `main`
   - **Root Directory**: *(leave blank)*
   - **Runtime**: **Docker**
   - **Dockerfile Path**: `./kahaani-check-backend/Dockerfile`
   - **Docker Context**: `./kahaani-check-backend`
   - **Instance Type**: **Free**
4. Under **Advanced** -> **Health Check Path**, enter: `/healthz`
5. Under **Environment Variables**, add:
   - `PORT`: `10000`
   - `LOCAL_DEV_MODE`: `true`
   - `WHISPER_MODEL_SIZE`: `tiny`
   - `WHISPER_DEVICE`: `cpu`
   - `WHISPER_COMPUTE_TYPE`: `int8`
   - `CORS_ORIGINS`: `https://kahaani-frontend.onrender.com` *(update once frontend URL is created)*
6. Click **Create Web Service**. Wait for the build to finish and copy the assigned backend URL (e.g., `https://kahaani-backend.onrender.com`).

---

### 2. Deploy the Frontend Service

1. Click **New +** -> **Web Service**.
2. Select your repository: `tade-jashwitha/kahaani-check-frontend`.
3. Configure the settings:
   - **Name**: `kahaani-frontend`
   - **Region**: Oregon (same region as backend)
   - **Branch**: `main`
   - **Root Directory**: *(leave blank)*
   - **Runtime**: **Docker**
   - **Dockerfile Path**: `./kahaani-check-frontend-main/Dockerfile`
   - **Docker Context**: `./kahaani-check-frontend-main`
   - **Instance Type**: **Free**
4. Under **Environment Variables**, add:
   - `PORT`: `3000`
   - `HOSTNAME`: `0.0.0.0`
   - `NEXT_PUBLIC_API_URL`: `<YOUR_BACKEND_RENDER_URL>` (e.g. `https://kahaani-backend.onrender.com`)
   - `NEXT_PUBLIC_LOCAL_DEV`: `true`
5. Click **Create Web Service**.

---

## Important Render Tips

### Free Tier Spin-Down
Render's free web services spin down after 15 minutes of inactivity. When a new request arrives, it may take 30–50 seconds for the container to wake up. This is expected behavior on the free tier.

### Connecting Cloud Supabase (Optional)
By default, the backend runs in `LOCAL_DEV_MODE=true` using its built-in SQLite data store and pre-seeded test data.
If you wish to switch to live cloud Supabase:
1. In Render backend settings, add:
   - `SUPABASE_URL`: `https://your-project.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: `your-service-role-key`
   - `LOCAL_DEV_MODE`: `false`
2. In Render frontend settings, add:
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://your-project.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `your-anon-key`
   - `NEXT_PUBLIC_LOCAL_DEV`: `false`
