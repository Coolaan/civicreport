const Report = require('../models/Report');
const User = require('../models/User');
const notificationService = require('../services/notificationService');

exports.createReport = async (req, res) => {
  try {
    const { title, description, category, departmentId, imageUrl, location } = req.body;

    const report = new Report({
      userId: req.user._id,
      title,
      description,
      category,
      departmentId,
      imageUrl,
      location,
      statusHistory: [{
        status: 'submitted',
        timestamp: new Date(),
        note: 'Report submitted'
      }]
    });

    await report.save();
    await report.populate('departmentId', 'name category');

    // Send notification
    if (req.user.fcmToken && req.user.notificationPreferences.reportUpdates) {
      await notificationService.sendReportUpdateNotification(
        req.user._id,
        req.user.fcmToken,
        report._id,
        'submitted',
        'Your report has been submitted successfully!'
      );
    }

    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getMyReports = async (req, res) => {
  try {
    const reports = await Report.find({ userId: req.user._id })
      .populate('departmentId', 'name category')
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('departmentId', 'name category contactEmail contactPhone')
      .populate('userId', 'name email phone');

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    if (report.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateReportStatus = async (req, res) => {
  try {
    const { status, note } = req.body;

    const report = await Report.findById(req.params.id).populate('userId');
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    report.status = status;
    report.statusHistory.push({
      status,
      timestamp: new Date(),
      note: note || `Status updated to ${status}`
    });

    if (status === 'resolved') {
      report.resolvedAt = new Date();
    }

    await report.save();
    await report.populate('departmentId', 'name category');

    // Send notification to user
    const user = await User.findById(report.userId._id);
    if (user && user.fcmToken && user.notificationPreferences.reportUpdates) {
      await notificationService.sendReportUpdateNotification(
        user._id,
        user.fcmToken,
        report._id,
        status,
        note || `Your report status has been updated to: ${status}`
      );
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};