const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  name:        { type: String, default: '' },
  age:         { type: Number },
  gender:      { type: String, enum: ['male', 'female', 'other'], default: 'male' },
  weight:      { type: Number },       // kg
  goalWeight:  { type: Number },       // kg
  height:      { type: Number },       // cm
  activity:    { type: String, default: 'moderate' }, // sedentary, light, moderate, active, veryActive
  goal:        { type: String, default: 'maintain' }, // lose, maintain, gain
  waterGoal:   { type: Number, default: 8 }, // glasses per day

  conditions: [{ type: String }], // e.g. ['Diabetes (Type 2)', 'Hypertension']
  allergies:  [{ type: String }], // e.g. ['Peanuts', 'Dairy']

  calories:       { type: Number, default: 2000 }, // calculated daily calorie target
  proteinTarget:  { type: Number, default: 100 },
}, { timestamps: true });

module.exports = mongoose.model('Profile', profileSchema);
