# Algo Forge - Backend API

This is the Node.js and Express backend for Algo Forge. It handles user authentication, custom contest creation, live leaderboards, and ICPC-style penalty calculations.

## 🚀 Tech Stack
* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB (via Mongoose)
* **Authentication:** JSON Web Tokens (JWT) & bcrypt

## 🛠️ Environment Variables
Create a `.env` file in the root of the `backend` directory. The following variables are required:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
NODE_ENV=development
```

## 🏃 Available Scripts

In the backend directory, you can run:

* `npm install`: Installs all required dependencies.
* `npm run dev`: Runs the app in development mode using nodemon. The server will restart if you make edits.
* `npm start`: Runs the app in production mode.

## 🔌 Core API Routes
* `/api/auth`: Registration, login, and session validation.
* `/api/users`: Profile data and settings.
* `/api/contests`: CRUD operations for custom mashup contests and leaderboard scoring.
