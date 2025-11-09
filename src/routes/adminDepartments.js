const express = require('express');
const Department = require('../models/Department');
const User = require('../models/User');
const { authenticate, isAdmin } = require('../middlewares/auth');
const router = express.Router();

/**
 * PATCH /api/admin/departments/:deptId/assign-head
 * Assign a head to a department (Admin only)
 */
router.patch('/departments/:deptId/assign-head', authenticate, isAdmin, async (req, res) => {
  try {
    const { headId } = req.body;

    // Validate inputs
    if (!headId) return res.status(400).json({ message: 'Head ID is required.' });

    // Check department
    const department = await Department.findById(req.params.deptId);
    if (!department) return res.status(404).json({ message: 'Department not found.' });

    // Check user
    const user = await User.findById(headId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // Update user role to 'head' if not already
    if (user.role !== 'head') {
      user.role = 'head';
      await user.save();
    }

    // Link head to department
    department.headId = user._id;
    await department.save();

    res.json({
      message: `Assigned ${user.name} as head of ${department.name}`,
      department,
    });
  } catch (error) {
    console.error('Error assigning head:', error.message);
    res.status(500).json({
      message: 'Server error while assigning head.',
      error: error.message,
    });
  }
});

module.exports = router;
