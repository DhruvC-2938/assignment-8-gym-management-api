require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const { connectDB } = require('./config/db');

// Middlewares
const logger = require('./middleware/logger');

// Passport Config
require('./config/passport')(passport);

// Routes
const authRoutes = require('./routes/authRoutes');
const classRoutes = require('./routes/classRoutes');
const memberRoutes = require('./routes/memberRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database (unless running in automated test mode which manages its own connection)
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

// Global Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'supersecret_gym_management_session_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true if running behind HTTPS in production
      maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
  })
);

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// Request Logger
app.use(logger);

// Base Documentation Route
app.get('/', (req, res) => {
  res.status(200).json({
    name: '🏋️‍♂️ Gym & Fitness Club Management REST API',
    version: '1.0.0',
    author: 'Dhruv Chavda',
    status: 'Healthy & Operational',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me (Protected)'
      },
      classes: {
        list: 'GET /api/classes (supports ?trainer=Name & ?upcomingOnly=true)',
        getById: 'GET /api/classes/:id',
        create: 'POST /api/classes',
        book: 'POST /api/classes/:id/book (Protected + Active Membership)',
        cancel: 'DELETE /api/classes/:id/cancel (Protected)'
      },
      members: {
        expired: 'GET /api/members/expired',
        renew: 'PATCH /api/members/:id/renew',
        listAll: 'GET /api/members',
        getById: 'GET /api/members/:id'
      }
    }
  });
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/members', memberRoutes);

// 404 Route Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint '${req.method} ${req.originalUrl}' not found.`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Gym Management API running on port ${PORT} (http://localhost:${PORT})`);
  });
}

module.exports = app;
