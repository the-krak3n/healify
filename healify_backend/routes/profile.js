const express = require('express');
const Profile = require('../models/Profile');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth); // all profile routes require login

// ═══════════════════════════════════════
// GET /api/profile - get current user's profile
// ═══════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    let profile = await Profile.findOne({ user: req.userId });
    if (!profile) {
      profile = await Profile.create({ user: req.userId });
    }
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════
// PUT /api/profile - create or update profile
// ═══════════════════════════════════════
router.put('/', async (req, res) => {
  try {
    const update = { ...req.body, user: req.userId };
    delete update._id; // never let client overwrite the doc id

    const profile = await Profile.findOneAndUpdate(
      { user: req.userId },
      update,
      { new: true, upsert: true, runValidators: true }
    );
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
