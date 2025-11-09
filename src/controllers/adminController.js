const Report = require('../models/Report');
const Department = require('../models/Department');
const User = require('../models/User');
const notificationService = require('../services/notificationService');

exports.getAllReports = async (req, res) => {
  try {
    const { status, department, page = 1, limit = 10 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (department) query.departmentId = department;

    const reports = await Report.find(query)
      .populate('userId', 'name email phone')
      .populate('departmentId', 'name category')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Report.countDocuments(query);

    res.json({
      reports,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalReports: count
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const totalReports = await Report.countDocuments();
    const resolvedReports = await Report.countDocuments({ status: 'resolved' });
    const pendingReports = await Report.countDocuments({ 
      status: { $in: ['submitted', 'in_review', 'assigned', 'in_progress'] } 
    });

    const reportsByCategory = await Report.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const reportsByStatus = await Report.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const reportsByDepartment = await Report.aggregate([
      { $group: { _id: '$departmentId', count: { $sum: 1 } } },
      { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'department' } },
      { $unwind: '$department' },
      { $project: { name: '$department.name', count: 1 } }
    ]);

    res.json({
      totalReports,
      resolvedReports,
      pendingReports,
      resolutionRate: totalReports > 0 ? ((resolvedReports / totalReports) * 100).toFixed(2) : 0,
      reportsByCategory,
      reportsByStatus,
      reportsByDepartment
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getDepartmentPerformance = async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true });
    
    const performance = await Promise.all(departments.map(async (dept) => {
      const totalReports = await Report.countDocuments({ departmentId: dept._id });
      const resolvedReports = await Report.countDocuments({ 
        departmentId: dept._id, 
        status: 'resolved' 
      });
      
      const avgResolutionTime = await Report.aggregate([
        { $match: { departmentId: dept._id, status: 'resolved', resolvedAt: { $exists: true } } },
        { $project: { 
          resolutionTime: { $subtract: ['$resolvedAt', '$createdAt'] }
        }},
        { $group: { 
          _id: null, 
          avgTime: { $avg: '$resolutionTime' } 
        }}
      ]);

      return {
        departmentId: dept._id,
        name: dept.name,
        category: dept.category,
        totalReports,
        resolvedReports,
        resolutionRate: totalReports > 0 ? ((resolvedReports / totalReports) * 100).toFixed(2) : 0,
        avgResolutionTimeHours: avgResolutionTime.length > 0 
          ? (avgResolutionTime[0].avgTime / (1000 * 60 * 60)).toFixed(2) 
          : 0
      };
    }));

    res.json(performance);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.sendBulkNotification = async (req, res) => {
  try {
    const { title, body, userRole } = req.body;

    let query = {};
    if (userRole && userRole !== 'all') {
      query.role = userRole;
    }

    const users = await User.find(query).select('_id fcmToken notificationPreferences');
    const eligibleUsers = users.filter(user => 
      user.fcmToken && user.notificationPreferences.systemAnnouncements
    );

    if (eligibleUsers.length === 0) {
      return res.status(400).json({ message: 'No eligible users found' });
    }

    await notificationService.sendBulkNotifications(eligibleUsers, title, body);

    res.json({ 
      message: 'Notifications sent successfully',
      sentTo: eligibleUsers.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};