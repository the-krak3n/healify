const express = require('express');
const FoodEntry = require('../models/FoodEntry');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// ═══════════════════════════════════════
// GET /api/food - all food entries for current user (newest first)
// Optional query: ?limit=20
// ═══════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 0;
    let query = FoodEntry.find({ user: req.userId }).sort({ time: -1 });
    if (limit > 0) query = query.limit(limit);
    const entries = await query;
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════
// GET /api/food/today - just today's entries + totals
// ═══════════════════════════════════════
router.get('/today', async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const entries = await FoodEntry.find({
      user: req.userId,
      time: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ time: -1 });

    const totals = entries.reduce((acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      protein:  acc.protein  + (e.protein  || 0),
      carbs:    acc.carbs    + (e.carbs    || 0),
      fiber:    acc.fiber    + (e.fiber    || 0),
      fat:      acc.fat      + (e.fat      || 0),
    }), { calories: 0, protein: 0, carbs: 0, fiber: 0, fat: 0 });

    res.json({ entries, totals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════
// POST /api/food - log a new food entry
// ═══════════════════════════════════════
router.post('/', async (req, res) => {
  try {
    const requestedTime = new Date(req.body.time);
    const entry = await FoodEntry.create({
      user: req.userId,
      food_name: req.body.food_name,
      calories: req.body.calories,
      protein: req.body.protein,
      carbs: req.body.carbs,
      fiber: req.body.fiber,
      fat: req.body.fat,
      portion_note: req.body.portion_note,
      confidence: req.body.confidence,
      alternative_foods: req.body.alternative_foods,
      food_tags: req.body.food_tags,
      thumb: req.body.thumb,
      time: Number.isNaN(requestedTime.getTime()) ? new Date() : requestedTime,
    });
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════
// PUT /api/food/:id - correct/update a food entry
// ═══════════════════════════════════════
router.put('/:id', async (req, res) => {
  try {
    const entry = await FoodEntry.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      req.body,
      { new: true }
    );
    if (!entry) return res.status(404).json({ error: 'Food entry not found.' });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════
// DELETE /api/food/:id
// ═══════════════════════════════════════
router.delete('/:id', async (req, res) => {
  try {
    const entry = await FoodEntry.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!entry) return res.status(404).json({ error: 'Food entry not found.' });
    res.json({ message: 'Food entry removed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
