# Deployment Guide

This guide explains how to deploy the Smart Campus Wi-Fi System.

## 1. Backend Deployment (Render)
We will use **Render** to host the Python Flask backend.

1.  **Push your code to GitHub**.
2.  Log in to [Render](https://render.com/).
3.  Click **New +** -> **Web Service**.
4.  Connect your GitHub repository.
5.  Configure the service:
    - **Root Directory**: `backend`
    - **Runtime**: `Python 3`
    - **Build Command**: `pip install -r requirements.txt`
    - **Start Command**: `gunicorn app:app`
6.  Click **Create Web Service**.
7.  Wait for deployment. Once live, copy the **Service URL** (e.g., `https://wifi-backend.onrender.com`).

## 2. Frontend Deployment (Vercel)
We will use **Vercel** to host the React frontend.

1.  Log in to [Vercel](https://vercel.com/).
2.  Click **Add New...** -> **Project**.
3.  Import your GitHub repository.
4.  Configure the project:
    - **Root Directory**: `wifi-prototype` (Click Edit to change this!)
    - **Framework Preset**: Vite
    - **Environment Variables**:
        - Key: `VITE_API_URL`
        - Value: Your Render Backend URL (e.g., `https://wifi-backend.onrender.com`)
5.  Click **Deploy**.

## 3. Verification
1.  Open your Vercel deployment URL.
2.  Verify that the Admin Dashboard loads and displays live data from the backend.
