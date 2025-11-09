const express = require('express');
const Report = require('../models/Report');
const Department = require('../models/Department');
const { authenticate, isHead } = require('../middlewares/auth');
const router = express.Router();



// ✅ GET /api/head/reports — fetch reports for the department linked to the logged-in head
router.get('/reports', authenticate, isHead, async (req, res) => {
  try {
    // 🔍 Add these two debug lines here
    console.log('User:', req.user);
    console.log('DepartmentId:', req.user.departmentId);

    const departmentId = req.user.departmentId;
    if (!departmentId) {
      return res.status(404).json({ message: 'No department assigned to this head.' });
    }

    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found.' });
    }

    const reports = await Report.find({ departmentId })
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });

    res.json({ department: department.name, reports });
  } catch (error) {
    console.error('Error fetching department reports:', error);
    res.status(500).json({ message: 'Error fetching department reports.', error: error.message });
  }
});


// ✅ PATCH /api/head/reports/:reportId/status — update report status
router.patch('/reports/:reportId/status', authenticate, isHead, async (req, res) => {
  try {
    const { status, note } = req.body;
    const departmentId = req.user.departmentId;

    if (!departmentId) {
      return res.status(404).json({ message: 'No department assigned to this head.' });
    }

    const report = await Report.findOne({
      _id: req.params.reportId,
      departmentId
    });

    if (!report) {
      return res.status(404).json({ message: 'Report not found or not in your department.' });
    }

    if (status) report.status = status;
    if (note)
      report.statusHistory.push({
        status: status || report.status,
        note
      });

    await report.save();

    res.json({ message: 'Report updated successfully.', report });
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ message: 'Error updating report.', error: error.message });
  }
});

module.exports = router;
