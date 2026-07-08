# 🔨 Algo Forge

> A premium, high-performance dashboard for competitive programming. Track your progress, analyze your Codeforces performance, and host custom ICPC-style mashups with friends.

---

## 🧠 What is Algo Forge?

Algo Forge is a full-stack web application designed for competitive programmers. It integrates seamlessly with the public Codeforces API to provide real-time rating progression, submission heatmaps, and global statistics. Beyond analytics, it features a custom backend engine that allows users to create private, ICPC-style contests with custom durations, problem sets, and real-time penalty scoring.

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React (Vite), TypeScript, Tailwind CSS |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB, Mongoose |
| **Authentication**| JSON Web Tokens (JWT) |
| **External API** | Codeforces API |
| **Deployment** | Vercel (Frontend), Render (Backend) |

---

## ✨ Features

### 1. Real-time Analytics Dashboard
* Live Codeforces API integration fetching current ratings, highest ratings, and recent contest history.
* GitHub-style submission heatmap to track daily problem-solving streaks.

### 2. Custom ICPC Mashups
* Host private contests using any Codeforces problems.
* Custom backend scoring engine that accurately replicates standard ICPC penalty rules.
* Live updating leaderboards for real-time team battles.

### 3. Advanced Problem Browser
* Filter and sort thousands of Codeforces problems by tag, difficulty, and solve count.
* **"Surprise Me"** feature dynamically selects a random problem from your currently filtered list for spontaneous practice.

### 4. Premium Developer UI
* Built with a strict, high-contrast dark mode aesthetic inspired by top-tier developer tools (Vercel, Linear).
* Fully responsive layout with custom typographic mapping (Inter for UI, JetBrains Mono for data).

---

## 🗂️ Project Structure

```text
Algo-Forge/
├── backend/         # Node/Express server, MongoDB models, Auth routes
│   └── README.md    # Backend setup and environment variables
├── frontend/        # React application, Tailwind config, API hooks
│   └── README.md    # Frontend setup and Vite configuration
└── README.md        # This file
```

---

## 🚀 Getting Started

To run this project locally, you will need two terminal windows.

### 1. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_secret
```

Start the server:

```bash
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:5001
```

Start the Vite development server:

```bash
npm run dev
```
