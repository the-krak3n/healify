const express = require('express');
const { callGemini, fallbackFor } = require('../utils/gemini');

const router = express.Router();
const TASKS = new Set([
  'foodAnalysis',
  'foodInteractions',
  'correctFood',
  'medicineInfo',
  'emergency',
  'dailySummary',
]);

router.post('/:task', async (req, res) => {
  const { task } = req.params;
  if (!TASKS.has(task)) return res.status(404).json({ error: 'Unknown AI task.' });
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ result: fallbackFor(task), fallback: true });
  }

  // AI failures intentionally return 200 with a safe result so UI workflows stay usable.
  const response = await callGemini(task, req.body);
  return res.json(response);
});

module.exports = router;
