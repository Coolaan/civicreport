const mongoose = require('mongoose');

const aadhaarSchema = new mongoose.Schema({
  aadhaarNumber: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
});

module.exports = mongoose.model('Aadhaar', aadhaarSchema);
