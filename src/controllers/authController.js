const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, fcmToken } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    user = new User({
      name,
      email,
      password,
      phone,
      fcmToken
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, fcmToken } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (fcmToken) {
      user.fcmToken = fcmToken;
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role,
        notificationPreferences: req.user.notificationPreferences
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    
    req.user.fcmToken = fcmToken;
    await req.user.save();

    res.json({ message: 'FCM token updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateNotificationPreferences = async (req, res) => {
  try {
    const { reportUpdates, systemAnnouncements, departmentMessages } = req.body;
    
    req.user.notificationPreferences = {
      reportUpdates: reportUpdates !== undefined ? reportUpdates : req.user.notificationPreferences.reportUpdates,
      systemAnnouncements: systemAnnouncements !== undefined ? systemAnnouncements : req.user.notificationPreferences.systemAnnouncements,
      departmentMessages: departmentMessages !== undefined ? departmentMessages : req.user.notificationPreferences.departmentMessages
    };
    
    await req.user.save();

    res.json({ 
      message: 'Notification preferences updated',
      preferences: req.user.notificationPreferences
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};