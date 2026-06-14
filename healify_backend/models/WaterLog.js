const mongoose = require('mongoose');

// One document per user per calendar day
const waterLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // 'YYYY-MM-DD'
  glasses: { type: Number, default: 0 },   // glasses consumed that day
}, { timestamps: true });

// One water log per user per date
waterLogSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('WaterLog', waterLogSchema);
