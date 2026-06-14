const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const auth = require('../middleware/auth');
const Medicine = require('../models/Medicine');
const {
  cleanString,
  isValidDateKey,
  isValidObjectId,
  isValidTime,
} = require('../utils/validation');

const router = express.Router();
router.use(auth);

const localDateKey = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

router.get('/', asyncHandler(async (req, res) => {
  const medicines = await Medicine.find({ user: req.userId }).sort({ createdAt: 1 });
  res.json(medicines);
}));

router.post('/', asyncHandler(async (req, res) => {
  const name = cleanString(req.body.name, 120);
  const strength = cleanString(req.body.strength, 80);
  const frequency = cleanString(req.body.frequency, 20) || 'once';
  const times = Array.isArray(req.body.times)
    ? [...new Set(req.body.times.filter(isValidTime))].sort()
    : [];

  if (!name || times.length === 0 || times.length !== req.body.times?.length) {
    return res.status(400).json({ error: 'Provide a medicine name and unique valid dose times.' });
  }
  if (times.length > 12) {
    return res.status(400).json({ error: 'A medicine cannot have more than 12 daily dose times.' });
  }

  const medicine = await Medicine.create({
    user: req.userId,
    name,
    strength,
    frequency,
    times,
    startDate: localDateKey(),
    doseHistory: [],
  });
  res.status(201).json(medicine);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid medicine identifier.' });
  }
  const medicine = await Medicine.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!medicine) return res.status(404).json({ error: 'Medicine not found.' });
  return res.json({ message: 'Medicine removed.' });
}));

router.post('/:id/dose', asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid medicine identifier.' });
  }

  const { date, time, status } = req.body;
  if (!isValidDateKey(date) || !isValidTime(time) || !['taken', 'skipped'].includes(status)) {
    return res.status(400).json({ error: 'Provide a valid date, time, and taken/skipped status.' });
  }

  const medicine = await Medicine.findOne({ _id: req.params.id, user: req.userId });
  if (!medicine) return res.status(404).json({ error: 'Medicine not found.' });
  if (date < medicine.startDate) {
    return res.status(400).json({ error: 'A dose cannot be recorded before the medicine start date.' });
  }
  if (!medicine.times.includes(time)) {
    return res.status(400).json({ error: 'This time is not part of the medicine schedule.' });
  }

  const entry = { date, time, status, actionTime: new Date() };
  const existingIndex = medicine.doseHistory.findIndex(
    (item) => item.date === date && item.time === time,
  );
  if (existingIndex >= 0) medicine.doseHistory.set(existingIndex, entry);
  else medicine.doseHistory.push(entry);

  await medicine.save();
  return res.json(medicine);
}));

module.exports = router;
