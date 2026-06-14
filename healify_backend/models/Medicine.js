const mongoose = require('mongoose');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const doseLogSchema = new mongoose.Schema({
  date: { type: String, required: true, match: DATE_PATTERN },
  time: { type: String, required: true, match: TIME_PATTERN },
  status: { type: String, enum: ['taken', 'skipped'], required: true },
  actionTime: { type: Date, default: Date.now },
}, { _id: false });

const medicineSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  strength: { type: String, default: '', trim: true, maxlength: 80 },
  frequency: { type: String, default: 'once', trim: true, maxlength: 20 },
  times: [{
    type: String,
    required: true,
    match: TIME_PATTERN,
  }],
  startDate: { type: String, required: true, match: DATE_PATTERN },
  doseHistory: { type: [doseLogSchema], default: [] },
}, { timestamps: true });

medicineSchema.index({ user: 1, createdAt: 1 });

module.exports = mongoose.model('Medicine', medicineSchema);
