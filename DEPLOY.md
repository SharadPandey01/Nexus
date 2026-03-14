# Nexus Deployment Guide

This guide explains how to deploy the **Nexus — Event Intelligence Platform** using a split strategy: **Frontend on Vercel** and **Backend on Render**.

---

## 1. Backend Deployment (Render.com)

1.  **Create a New Web Service**:
    *   Connect your GitHub repository.
    *   Select the `backend` directory as the **Root Directory**.
    *   **Environment**: Select `Python 3`.
    *   **Build Command**: `pip install -r requirements.txt`
    *   **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

2.  **Environment Variables**:
    *   `GEMINI_API_KEY`: Your Google GenAI key.
    *   `DATABASE_URL`: `sqlite:///./data/nexus.db`
    *   `CORS_ORIGINS`: Initially `http://localhost:5173`. You will update this with your Vercel URL once the frontend is deployed.

---

## 2. Frontend Deployment (Vercel)

1.  **Create a New Project**:
    *   Connect the same GitHub repository.
    *   Select the `frontend` directory as the **Root Directory**.
    *   Vercel will automatically detect the **Vite** build settings.

2.  **Environment Variables**:
    *   `VITE_API_URL`: The URL of your Render backend (e.g., `https://nexus-backend.onrender.com`). **Do not add a trailing slash.**

3.  **Deploy**: Hit deploy!

---

## 3. Post-Deployment Link

1.  Copy your new Vercel URL (e.g., `https://nexus-event.vercel.app`).
2.  Go back to your **Render Backend Settings**.
3.  Update the `CORS_ORIGINS` environment variable:
    *   `CORS_ORIGINS=https://nexus-event.vercel.app`
4.  Render will auto-deploy. Now your frontend and backend are securely linked.

---

### Troubleshooting
*   **WebSockets**: Ensure `useWebSocket.js` is correctly parsing the `VITE_API_URL`.
*   **CORS**: If the dashboard shows "Network Error", check that the `CORS_ORIGINS` on Render exactly matches your Vercel URL (including `https://`).
