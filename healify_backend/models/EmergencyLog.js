const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  description: { type: String, required: true }, // what the user typed
  imageThumb:  { type: String, default: null },   // optional base64 image

  // AI response, stored as-is for history display
  emergency_type:   { type: String, default: '' },
  severity:         { type: String, default: '' }, // mild | moderate | severe
  severity_reason:  { type: String, default: '' },
  condition_alerts: [{ type: String }],
  steps:            [{ type: String }],
  do_not:           [{ type: String }],
  prevention:       [{ type: String }],
  see_doctor:       { type: String, default: '' },

  time: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('EmergencyLog', emergencySchema);
