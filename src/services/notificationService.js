const admin = require('firebase-admin');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Department = require('../models/Department');

class NotificationService {
  async sendNotification(userId, fcmToken, title, body, data = {}) {
    try {
      if (!fcmToken) {
        console.log(`⚠️ No FCM token for user ${userId}`);
        return null;
      }

      const message = {
        notification: { title, body },
        data: { ...data, userId: userId.toString() },
        token: fcmToken
      };

      const response = await admin.messaging().send(message);
      console.log(`✅ FCM sent to ${userId}: ${response}`);

      await Notification.create({
        userId,
        title,
        body,
        type: data.type || 'system_announcement',
        data
      });

      return response;
    } catch (error) {
      console.error('❌ Error sending FCM:', error.message);
    }
  }

  async sendReportUpdateNotification(userId, fcmToken, reportId, status, message) {
    const title = 'Report Status Updated';
    const body = message || `Your report status has been updated to: ${status}`;

    await this.sendNotification(userId, fcmToken, title, body, {
      type: 'report_update',
      reportId: reportId.toString(),
      status
    });
  }

  async notifyDepartmentHead(departmentId, report) {
    const department = await Department.findById(departmentId).populate('headId', 'name fcmToken');
    if (department?.headId?.fcmToken) {
      await this.sendNotification(
        department.headId._id,
        department.headId.fcmToken,
        'New Report Submitted',
        `A new ${report.category} report has been submitted.`,
        {
          type: 'new_report',
          reportId: report._id.toString()
        }
      );
    }
  }

  async getUserNotifications(userId, limit = 20, page = 1) {
    const skip = (page - 1) * limit;
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('reportId', 'title status category');

    const total = await Notification.countDocuments({ userId });
    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    return { notifications, total, unreadCount, page, totalPages: Math.ceil(total / limit) };
  }

  async markAsRead(notificationId) {
    return await Notification.findByIdAndUpdate(notificationId, { isRead: true }, { new: true });
  }

  async markAllAsRead(userId) {
    return await Notification.updateMany({ userId, isRead: false }, { isRead: true });
  }

  async deleteNotification(notificationId) {
    return await Notification.findByIdAndDelete(notificationId);
  }
}

module.exports = new NotificationService();
