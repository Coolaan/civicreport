const express = require('express');
const notificationService = require('../services/notificationService');
const router = express.Router();

router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  const { limit = 20, page = 1 } = req.query;
  try {
    const data = await notificationService.getUserNotifications(userId, +limit, +page);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching notifications', error: err.message });
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    const updated = await notificationService.markAsRead(req.params.id);
    res.json({ message: 'Notification marked as read', updated });
  } catch (err) {
    res.status(500).json({ message: 'Error updating notification', error: err.message });
  }
});

router.patch('/read-all/:userId', async (req, res) => {
  try {
    const result = await notificationService.markAllAsRead(req.params.userId);
    res.json({ message: 'All notifications marked as read', result });
  } catch (err) {
    res.status(500).json({ message: 'Error updating notifications', error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await notificationService.deleteNotification(req.params.id);
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting notification', error: err.message });
  }
});

module.exports = router;
