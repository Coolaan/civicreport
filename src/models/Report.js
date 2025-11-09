const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,

    category: {
      type: String,
      enum: ['garbage', 'streetlight', 'road', 'water', 'electricity', 'other'],
      required: true,
    },

    status: {
      type: String,
      enum: ['submitted', 'in_review', 'assigned', 'in_progress', 'resolved', 'rejected'],
      default: 'submitted',
    },

    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },

    // ✅ Both image fields
    imageUrl: { type: String, default: null },
    completedImageUrl: { type: String, default: null },

    // ✅ GeoJSON location
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: false },
      address: String,
      city: String,
      state: String,
    },

    statusHistory: [
      {
        status: String,
        note: String,
        updatedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

reportSchema.index(
  { location: '2dsphere' },
  { partialFilterExpression: { 'location.coordinates': { $exists: true, $type: 'array' } } }
);

module.exports = mongoose.model('Report', reportSchema);
