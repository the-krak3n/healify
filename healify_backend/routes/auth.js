const express = require('express');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../middleware/asyncHandler');
const auth = require('../middleware/auth');
const Profile = require('../models/Profile');
const User = require('../models/User');
const { cleanString } = require('../utils/validation');

const router = express.Router();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const generateToken = (userId) => jwt.sign(
  { userId: userId.toString() },
  process.env.JWT_SECRET,
  {
    algorithm: 'HS256',
    expiresIn: '30d',
    issuer: 'healify-api',
    audience: 'healify-web',
  },
);

router.post('/signup', asyncHandler(async (req, res) => {
  const name = cleanString(req.body.name, 80);
  const email = cleanString(req.body.email, 254).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are all required.' });
  }
  if (!EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
  }

  const existing = await User.exists({ email });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const user = await User.create({ name, email, password });
  try {
    await Profile.create({ user: user._id, name });
  } catch (err) {
    await User.deleteOne({ _id: user._id });
    throw err;
  }

  return res.status(201).json({ token: generateToken(user._id), user: user.toJSON() });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const email = cleanString(req.body.email, 254).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  return res.json({ token: generateToken(user._id), user: user.toJSON() });
}));

router.post('/logout', auth, (req, res) => {
  res.json({ message: 'Logged out successfully.' });
});

router.get('/me', auth, asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ error: 'Account no longer exists.' });
  return res.json({ user: user.toJSON() });
}));

module.exports = router;
