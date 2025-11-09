const express = require('express');
const Report = require('../models/Report');
const Department = require('../models/Department');
const User = require('../models/User');
const router = express.Router();

// GET /api/admin/analytics
router.get('/', async (req, res) => {
  try {
    // 📊 Total counts
    const totalReports = await Report.countDocuments();
    const totalDepartments = await Department.countDocuments();
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });

    // 📈 Reports by status
    const reportsByStatus = await Report.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // 🏢 Reports by department
    const reportsByDepartment = await Report.aggregate([
      {
        $lookup: {
          from: "departments",
          localField: "departmentId",
          foreignField: "_id",
          as: "department"
        }
      },
      { $unwind: "$department" },
      {
        $group: { _id: "$department.name", count: { $sum: 1 } }
      },
      { $sort: { count: -1 } }
    ]);

// ✅ Completion rate including departments with 0 reports
const completionByDepartment = await Department.aggregate([
  {
    $lookup: {
      from: "reports",
      localField: "_id",
      foreignField: "departmentId",
      as: "reports",
    },
  },
  {
    $project: {
      department: "$name", // 👈 use consistent name key
      totalReports: { $size: "$reports" },
      resolvedReports: {
        $size: {
          $filter: {
            input: "$reports",
            as: "r",
            cond: { $eq: ["$$r.status", "resolved"] },
          },
        },
      },
    },
  },
  {
    $addFields: {
      completionRate: {
        $cond: [
          { $eq: ["$totalReports", 0] },
          0,
          { $multiply: [{ $divide: ["$resolvedReports", "$totalReports"] }, 100] },
        ],
      },
    },
  },
  { $sort: { completionRate: -1 } },
]);


    // ⏱️ Average resolution time
    const resolvedReports = await Report.find({ status: 'resolved' }, 'createdAt resolvedAt');
    let avgResolutionHours = 0;
    if (resolvedReports.length > 0) {
      const totalHours = resolvedReports.reduce((sum, r) => {
        if (r.resolvedAt) {
          const diff = (r.resolvedAt - r.createdAt) / (1000 * 60 * 60);
          return sum + diff;
        }
        return sum;
      }, 0);
      avgResolutionHours = totalHours / resolvedReports.length;
    }

    // 🧮 Resolution rate
    const resolvedCount = await Report.countDocuments({ status: 'resolved' });
    const resolutionRate = totalReports
      ? ((resolvedCount / totalReports) * 100).toFixed(1) + '%'
      : '0%';

res.json({
  summary: {
    totalReports,
    totalDepartments,
    totalUsers,
    totalAdmins,
    avgResolutionHours: avgResolutionHours.toFixed(2),
  },
  reportsByStatus,
  reportsByDepartment,
  completionByDepartment, // <-- add this line
});


  } catch (error) {
    console.error("Error generating analytics:", error);
    res.status(500).json({ message: "Error generating analytics", error: error.message });
  }
});

module.exports = router;
