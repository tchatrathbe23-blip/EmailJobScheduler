# 🚀 Deployment Guide — ReachInbox Scheduler (24/7 Cloud Hosting)

This guide shows how to deploy the entire ReachInbox Full-Stack Email Scheduler to run **24/7 in the cloud** without needing your laptop or local terminal.

---

## 🌟 Option A: Render Blueprint (Easiest — 1 Click)

Render uses the included [`render.yaml`](./render.yaml) file to automatically provision:
- Managed Redis (for BullMQ queues & rate limits)
- Managed PostgreSQL Database
- Express Backend API + Worker
- Next.js Frontend Dashboard

### Steps:
1. Log in to [Render.com](https://dashboard.render.com/) with your GitHub account.
2. Click **New +** ➔ **Blueprint**.
3. Connect your repository: `tchatrathbe23-blip/EmailJobScheduler`.
4. Click **Apply**.
5. Render will build and deploy all services and give you permanent URLs:
   - Frontend: `https://reachinbox-scheduler-frontend.onrender.com`
   - Backend: `https://reachinbox-scheduler-backend.onrender.com`

---

## ⚡ Option B: Vercel (Frontend) + Render / Railway (Backend)

The industry-standard setup:

### Step 1: Deploy Frontend to Vercel (1 min)
1. Go to [Vercel.com](https://vercel.com/) ➔ Click **Add New Project**.
2. Import `tchatrathbe23-blip/EmailJobScheduler`.
3. Set **Root Directory** to `frontend`.
4. Click **Deploy**. Vercel will give you a permanent `*.vercel.app` URL.

### Step 2: Deploy Backend to Render (2 min)
1. In [Render.com](https://dashboard.render.com/), click **New +** ➔ **Web Service**.
2. Select your repository.
3. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npx prisma db push && npm run build`
   - **Start Command:** `npm run start`
   - **Environment Variables:**
     - `REDIS_URL`: URL of your cloud Redis (or create free Redis on Render/Upstash)
     - `DATABASE_URL`: URL of your PostgreSQL database (or SQLite `file:./dev.db`)
     - `JWT_SECRET`: `reachinbox_super_secret_jwt_key_2026`
     - `SLACK_DEFAULT_WEBHOOK_URL`: `https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK`

---

## 🚂 Option C: Railway (Fastest All-in-One)

1. Go to [Railway.app](https://railway.app/).
2. Click **New Project** ➔ **Deploy from GitHub repo**.
3. Select `tchatrathbe23-blip/EmailJobScheduler`.
4. Add **Redis** service (1 click).
5. Add **PostgreSQL** service (1 click).
6. Set the `REDIS_URL` and `DATABASE_URL` in backend environment variables.
7. Railway will deploy all services with a permanent public URL.

---

## 🖥️ Option D: Local + Cloudflare Tunnel (Current)

If you keep your terminal open:
```powershell
.\bin\cloudflared.exe tunnel --url http://127.0.0.1:3000
```
Public URL: `https://stress-riverside-builds-far.trycloudflare.com`
