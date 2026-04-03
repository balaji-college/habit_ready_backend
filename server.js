require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const habitRoutes = require('./routes/habits');

const app = express();

// ── Middleware ─────────────────────────────────────────────
app.use(cors({
  origin: function (origin, callback) {
    // Dynamically allow origins to avoid CORS issues with Vercel frontend deployments
    callback(null, true);
  },
  credentials: true
}));
app.use(express.json());

// ── Routes ─────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'This Time For Real API is running' });
});

// ── 404 Handler ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ── Error Handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// ── Database & Server ──────────────────────────────────────
const PORT = process.env.PORT || 5000;

// Global connection for serverless/Vercel
mongoose
  .connect(process.env.MONGO_URI, { dbName: 'ttfr_habit_tracker' })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err.message));

// Only bind to a local port if we are NOT running in Vercel's serverless environment
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

module.exports = app;
