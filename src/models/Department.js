const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ['garbage', 'streetlight', 'road', 'water', 'electricity', 'other'],
    },
    description: String,
    contactEmail: String,
    contactPhone: String,
    headId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isActive: { type: Boolean, default: true },

    // ✅ Optional GeoJSON field with fallback to null
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: undefined, // null keeps MongoDB from indexing invalid data
      },
      address: String,
      city: String,
      state: String,
    },
  },
  { timestamps: true }
);

// ✅ Create index only on valid documents
departmentSchema.index(
  { location: '2dsphere' },
  { partialFilterExpression: { 'location.coordinates': { $exists: true, $type: 'array' } } }
);

module.exports = mongoose.model('Department', departmentSchema);
