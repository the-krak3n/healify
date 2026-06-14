const express = require('express');
const EmergencyLog = require('../models/EmergencyLog');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// ═══════════════════════════════════════
// GET /api/emergency - all past emergency incidents (newest first)
// ═══════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const logs = await EmergencyLog.find({ user: req.userId }).sort({ time: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════
// POST /api/emergency - save a new emergency incident + AI response
// ═══════════════════════════════════════
router.post('/', async (req, res) => {
  try {
    const log = await EmergencyLog.create({ ...req.body, user: req.userId, time: new Date() });
    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════
// DELETE /api/emergency/:id
// ═══════════════════════════════════════
router.delete('/:id', async (req, res) => {
  try {
    const log = await EmergencyLog.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!log) return res.status(404).json({ error: 'Emergency log not found.' });
    res.json({ message: 'Emergency log removed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
