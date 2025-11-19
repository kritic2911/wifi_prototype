# Smart Campus Wi-Fi System (Prototype)

**Version:** 2.0 (Revised)
**Date:** 19/11/2025

## 📌 Overview
The **Smart Campus Wi-Fi System** is an AI-driven network management simulation designed to replace traditional reactive methods with predictive intelligence. It utilizes Machine Learning (Isolation Forest, ARIMA) and Attribute-Based Access Control (ABAC) to optimize network performance, ensure security, and visualize spatial data.

This project demonstrates a full-stack implementation with a **React** frontend and a **Python (Flask)** backend.

## 🚀 Features

### 1. Intelligent Load Balancing (Predictive QoS)
- **Forecasting**: Uses an **ARIMA** model to predict future traffic load based on historical data.
- **Traffic Shaping**: Visualizes predicted load to help administrators anticipate congestion.

### 2. Automated Anomaly Detection
- **Security**: Implements an **Isolation Forest** algorithm to detect abnormal device behavior (e.g., high jitter, massive data transfer).
- **Auto-Quarantine**: Automatically flags high-risk devices as "Anomalies" in the dashboard.

### 3. Spatial Analytics (Heatmaps)
- **Visualization**: Generates real-time **Heatmaps** using `Seaborn` to visualize network density across Access Points.
- **Insight**: Helps in identifying physical congestion zones in the campus.

### 4. Context-Aware Access Control (ABAC)
- **Rule Engine**: Enforces granular policies based on **Role**, **Location**, and **Time**.
- **Example Rule**: "Students cannot stream video in the Lecture Hall."

## 🛠️ Tech Stack

- **Frontend**: React, Vite, CSS Modules
- **Backend**: Python, Flask, Flask-CORS
- **Database**: SQLite
- **AI/ML**: Scikit-learn (Isolation Forest), Statsmodels (ARIMA), NumPy
- **Visualization**: Matplotlib, Seaborn

## 📂 Project Structure

```
wifi_prototype/
├── backend/                 # Python Flask Backend
│   ├── ai_engine/           # AI Modules
│   │   ├── analytics.py     # Heatmap generation
│   │   ├── forecasting.py   # Traffic prediction
│   │   ├── rules.py         # ABAC Rule Engine
│   │   └── security.py      # Anomaly Detection
│   ├── app.py               # API Entry Point
│   ├── database.py          # SQLite Setup
│   └── wifi_system.db       # SQLite Database
├── wifi-prototype/          # React Frontend
│   ├── src/
│   │   ├── pages/           # UI Pages (AdminPage.jsx)
│   │   └── ...
│   └── ...
└── readme.md                # Project Documentation
```

## ⚡ Installation & Setup

### Prerequisites
- Python 3.9+
- Node.js & npm

### 1. Backend Setup
Navigate to the project root:
```bash
# Create virtual environment
python3 -m venv backend/venv

# Activate virtual environment
source backend/venv/bin/activate  # Linux/Mac
# backend\venv\Scripts\activate   # Windows

# Install dependencies
pip install flask flask-cors scikit-learn numpy statsmodels seaborn matplotlib
```

### 2. Frontend Setup
Navigate to the frontend directory:
```bash
cd wifi-prototype
npm install
```

## 🏃‍♂️ Usage

### Start the Backend
```bash
# From project root
source backend/venv/bin/activate
python backend/app.py
```
The API will run at `http://127.0.0.1:5000`.

### Start the Frontend
```bash
# From wifi-prototype/ directory
npm run dev
```
The UI will open at `http://localhost:5173`.

### Verification Steps
1.  Open the **Admin Panel**.
2.  Observe the **Live Heatmap** and **Traffic Forecast** cards.
3.  Check the **High Usage Monitor** for flagged users.
4.  (Optional) Trigger a security scan via API to force an anomaly detection event.

## 👥 Contributors
- **Akshit S Bansal** (23ucs529)
- **Hussain Haidary** (23ucs596)
- **Ishwi Dhanuka** (23ucs599)
- **Kriti Chaturvedi** (23ucs625)

**Instructors:** Dr. Ashish Kumar Dwivedi, Dr. Anubhav Shivhare
