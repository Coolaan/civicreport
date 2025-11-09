const express = require('express');
const Report = require('../models/Report');
const Department = require('../models/Department');
const User = require('../models/User');
const { upload } = require('../config/cloudinary');
const router = express.Router();

// ✅ Upload completed image (for department head)
router.post('/:reportId/complete', upload.single('completedImage'), async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ message: 'Report not found.' });

    if (!req.file) return res.status(400).json({ message: 'No image uploaded.' });

    // ✅ Cloudinary returns `path` or `secure_url` depending on multer-storage-cloudinary version
    report.completedImageUrl = req.file.path || req.file.secure_url;
    report.status = 'resolved';
    report.statusHistory.push({
      status: 'resolved',
      note: 'Issue marked as completed by department head.',
      updatedAt: Date.now(),
    });

    await report.save();

    // ✅ Populate updated report for frontend display
    const updatedReport = await Report.findById(reportId)
      .populate('userId', 'name email')
      .populate('departmentId', 'name category');

    res.status(200).json({
      message: 'Completed image uploaded successfully.',
      completedImageUrl: updatedReport.completedImageUrl,
      report: updatedReport,
    });
  } catch (error) {
    console.error('❌ Error uploading completed image:', error);
    res.status(500).json({
      message: 'Error uploading completed image.',
      error: error.message,
    });
  }
});

// ✅ Create a new report with auto department assignment
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { userId, title, description, category, location, priority } = req.body;

    if (!userId || !title || !category || !location) {
      return res.status(400).json({ message: 'Missing required fields (userId, title, category, location).' });
    }

    // Validate user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // ✅ Parse location safely
    const userLocation = typeof location === 'string' ? JSON.parse(location) : location;
    const lat = userLocation.latitude || userLocation.lat;
    const lon = userLocation.longitude || userLocation.lon;

    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return res.status(400).json({ message: 'Invalid location format. Must include latitude and longitude.' });
    }

    // ✅ Find nearest department of same category
    const nearestDepartment = await Department.findOne({
      category: category.toLowerCase(),
      isActive: true,
      'location.coordinates': { $exists: true },
    }).findOne({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lon, lat] },
          $maxDistance: 50000, // 50 km radius
        },
      },
    });

    if (!nearestDepartment) {
      return res.status(404).json({
        message: `No nearby department found for category: ${category}`,
      });
    }

    // ✅ Handle optional image upload
    const imageUrl = req.file ? req.file.path || req.file.secure_url : null;

    // ✅ Create new report
    const newReport = new Report({
      userId,
      title,
      description,
      category: category.toLowerCase(),
      departmentId: nearestDepartment._id,
      imageUrl,
      location: { latitude: lat, longitude: lon },
      priority: priority || 'medium',
      statusHistory: [{ status: 'submitted', note: 'Report submitted by user.' }],
    });

    await newReport.save();

    res.status(201).json({
      message: `Report successfully submitted and assigned to "${nearestDepartment.name}".`,
      assignedDepartment: nearestDepartment.name,
      report: newReport,
    });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({
      message: 'Server error while creating report.',
      error: error.message,
    });
  }
});

// ✅ Get all reports submitted by a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const reports = await Report.find({ userId: req.params.userId })
      .populate('departmentId', 'name category')
      .sort({ createdAt: -1 });

    res.status(200).json(reports);
  } catch (error) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({
      message: 'Server error while fetching user reports.',
      error: error.message,
    });
  }
});

// ✅ Get all reports for a specific department (for heads)
router.get('/department/:deptId', async (req, res) => {
  try {
    const reports = await Report.find({ departmentId: req.params.deptId })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json(reports);
  } catch (error) {
    console.error('Error fetching department reports:', error);
    res.status(500).json({
      message: 'Server error while fetching department reports.',
      error: error.message,
    });
  }
});

module.exports = router;
