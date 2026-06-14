const dns = require('dns');
const mongoose = require('mongoose');

dns.setDefaultResultOrder('ipv4first');

async function connectDB() {
  mongoose.set('strictQuery', true);

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 0,
    retryWrites: true,
  });

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err.message);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected.');
  });

  console.log('MongoDB connected successfully');
}

module.exports = connectDB;
