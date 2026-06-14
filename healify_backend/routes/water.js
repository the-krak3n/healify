const express = require('express');
const WaterLog = require('../models/WaterLog');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// ═══════════════════════════════════════
// GET /api/water/today - today's water count
// ═══════════════════════════════════════
router.get('/today', async (req, res) => {
  try {
    const log = await WaterLog.findOne({ user: req.userId, date: todayKey() });
    res.json({ date: todayKey(), glasses: log?.glasses || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════
// PUT /api/water/today - set today's water count
// body: { glasses: number }
// ═══════════════════════════════════════
router.put('/today', async (req, res) => {
  try {
    const { glasses } = req.body;
    if (typeof glasses !== 'number' || glasses < 0) {
      return res.status(400).json({ error: 'glasses must be a non-negative number.' });
    }

    const log = await WaterLog.findOneAndUpdate(
      { user: req.userId, date: todayKey() },
      { glasses },
      { new: true, upsert: true }
    );
    res.json({ date: log.date, glasses: log.glasses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════
// GET /api/water/history - last 30 days of water logs
// ═══════════════════════════════════════
router.get('/history', async (req, res) => {
  try {
    const logs = await WaterLog.find({ user: req.userId }).sort({ date: -1 }).limit(30);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
