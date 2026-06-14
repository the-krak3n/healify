require('dotenv').config();
const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errors');

const authRoutes = require('./routes/auth');
const emergencyRoutes = require('./routes/emergency');
const foodRoutes = require('./routes/food');
const medicineRoutes = require('./routes/medicines');
const profileRoutes = require('./routes/profile');
const waterRoutes = require('./routes/water');
const aiRoutes = require('./routes/ai');

const requiredEnv = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]?.trim());
if (missingEnv.length) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be at least 32 characters long.');
  process.exit(1);
}

const app = express();
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/water', waterRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Healify backend is running' });
});

app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 5000;
let server;

async function start() {
  try {
    await connectDB();
    server = app.listen(PORT, () => {
      console.log(`Healify backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Backend startup failed:', err.message);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down...`);
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.connection.close();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection:', err);
});

start();

module.exports = app;
