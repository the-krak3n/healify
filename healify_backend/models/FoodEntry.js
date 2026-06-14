const mongoose = require('mongoose');

const foodEntrySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  food_name:   { type: String, required: true },
  calories:    { type: Number, default: 0 },
  protein:     { type: Number, default: 0 },
  carbs:       { type: Number, default: 0 },
  fiber:       { type: Number, default: 0 },
  fat:         { type: Number, default: 0 },

  portion_note:     { type: String, default: '' },
  confidence:       { type: String, default: '' },
  alternative_foods: [{ type: String }],
  food_tags:        [{ type: String }],

  thumb: { type: String, default: null }, // base64 data URL or null

  time: { type: Date, default: Date.now }, // when the food was logged
}, { timestamps: true });

module.exports = mongoose.model('FoodEntry', foodEntrySchema);
