/**
 * server.js
 * ──────────
 * CP Arena – Express Application Entry Point
 *
 * Responsibilities:
 *  - Load environment variables
 *  - Configure middleware (CORS, JSON parsing, request logging)
 *  - Mount API routes
 *  - Connect to MongoDB
 *  - Start the HTTP server
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

// ─── App Initialization ───────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 5000;

// ─── CORS Configuration ───────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (Postman, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin '${origin}' not allowed.`));
      }
    },
    credentials: true, // Allow cookies & Authorization headers
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));        // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// HTTP request logger (dev: colourful, production: Apache combined)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CP Arena API is running 🚀',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));

// Contest management + Problem discovery
const { contestRouter, problemsRouter } = require('./routes/contest');
app.use('/api/contests', contestRouter);
app.use('/api/problems', problemsRouter);

// User analytics (stats, rating history, heatmap)
app.use('/api/users', require('./routes/user'));

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[GlobalError]', err.stack || err.message);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ─── MongoDB Connection + Server Start ────────────────────────────────────────
const startServer = async () => {
  try {
    mongoose.set('strictQuery', true); // Suppress Mongoose 7 deprecation warning
    await mongoose.connect(process.env.MONGO_URI, {
      // Mongoose 6+ handles these internally, but listed for clarity
      serverSelectionTimeoutMS: 5000,
    });

    console.log('✅  MongoDB connected:', mongoose.connection.host);

    app.listen(PORT, () => {
      console.log(`🚀  CP Arena API running on http://localhost:${PORT}`);
      console.log(`📋  Environment: ${process.env.NODE_ENV}`);
    });
  } catch (err) {
    console.error('❌  MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
process.on('SIGINT', async () => {
  console.log('\n🛑  Shutting down gracefully...');
  await mongoose.connection.close();
  console.log('✅  MongoDB connection closed.');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️  Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();

module.exports = app; // Exported for testing
