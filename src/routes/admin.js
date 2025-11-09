const express = require('express');
const User = require('../models/User');
const Report = require('../models/Report');
const Department = require('../models/Department');
const Notification = require('../models/Notification');
const router = express.Router();

// Optional: import Firebase if push notifications are needed
// const admin = require('firebase-admin');

/**
 * GET /api/admin/overview
 * Fetch overall system statistics
 */
router.get('/overview', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalReports = await Report.countDocuments();
    const totalDepartments = await Department.countDocuments();
    const resolvedReports = await Report.countDocuments({ status: 'resolved' });

    const response = {
      totalUsers,
      totalDepartments,
      totalReports,
      resolvedReports,
      resolutionRate:
        totalReports > 0 ? ((resolvedReports / totalReports) * 100).toFixed(2) + '%' : '0%'
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching admin overview:', error);
    res.status(500).json({ message: 'Error fetching overview data.', error: error.message });
  }
});

/**
 * GET /api/admin/reports
 * Fetch all reports (optionally filter by status or department)
 */
router.get('/reports', async (req, res) => {
  try {
    const { status, departmentId } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (departmentId) filter.departmentId = departmentId;

    const reports = await Report.find(filter)
      .populate('userId', 'name email phone')
      .populate('departmentId', 'name category');

    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: 'Error fetching reports.', error: error.message });
  }
});

/**
 * PATCH /api/admin/reports/:id/reassign
 * Reassign a report to another department
 */
router.patch('/reports/:id/reassign', async (req, res) => {
  try {
    const { newDepartmentId, note } = req.body;
    if (!newDepartmentId) {
      return res.status(400).json({ message: 'New department ID is required.' });
    }

    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found.' });

    const department = await Department.findById(newDepartmentId);
    if (!department) return res.status(404).json({ message: 'New department not found.' });

    // Update report
    report.departmentId = newDepartmentId;
    report.statusHistory.push({
      status: 'assigned',
      note: note || `Reassigned to ${department.name}`
    });
    await report.save();

    // Create notification for user
    const notification = new Notification({
      userId: report.userId,
      reportId: report._id,
      title: 'Report Reassigned',
      body: `Your report "${report.title}" has been reassigned to ${department.name}.`,
      type: 'report_update'
    });
    await notification.save();

    res.json({ message: 'Report reassigned successfully.', report });
  } catch (error) {
    console.error('Error reassigning report:', error);
    res.status(500).json({ message: 'Error reassigning report.', error: error.message });
  }
});

/**
 * GET /api/admin/users
 * Get all users
 */
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('name email phone createdAt');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users.', error: error.message });
  }
});

/**
 * PATCH /api/admin/users/:id/deactivate
 * Deactivate (or reactivate) a user
 */
router.patch('/users/:id/deactivate', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      message: `User ${user.isActive ? 'reactivated' : 'deactivated'} successfully.`,
      user
    });
  } catch (error) {
    console.error('Error toggling user state:', error);
    res.status(500).json({ message: 'Error updating user.', error: error.message });
  }
});

/**
 * GET /api/admin/analytics/departments
 * Department performance metrics
 */
router.get('/analytics/departments', async (req, res) => {
  try {
    const departments = await Department.find();

    const metrics = await Promise.all(
      departments.map(async (dept) => {
        const totalReports = await Report.countDocuments({ departmentId: dept._id });
        const resolvedReports = await Report.countDocuments({
          departmentId: dept._id,
          status: 'resolved'
        });
        const resolutionRate =
          totalReports > 0 ? ((resolvedReports / totalReports) * 100).toFixed(2) + '%' : '0%';

        return {
          department: dept.name,
          category: dept.category,
          totalReports,
          resolvedReports,
          resolutionRate
        };
      })
    );

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching department analytics:', error);
    res.status(500).json({ message: 'Error fetching department analytics.', error: error.message });
  }
});

router.patch('/users/:id/assign-head', async (req, res) => {
  try {
    const { departmentId } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const department = await Department.findById(departmentId);
    if (!department) return res.status(404).json({ message: 'Department not found.' });

    user.role = 'head';
    user.departmentId = departmentId; // add this field in User model if not present
    await user.save();

    res.json({ message: `User assigned as head of ${department.name}`, user });
  } catch (error) {
    res.status(500).json({ message: 'Error assigning department head', error: error.message });
  }
});


module.exports = router;
