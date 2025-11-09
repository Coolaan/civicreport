const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Aadhaar = require('../models/Aadhaar');
const { sendEmailOTP } = require('../utils/emailService');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const OTP_STORE = new Map(); // Temporary in-memory OTP store
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// ✅ Aadhaar: Send OTP via Email
router.post('/aadhaar/send-otp', async (req, res) => {
  try {
    const { aadhaarNumber } = req.body;

    if (!aadhaarNumber) {
      return res.status(400).json({ message: 'Aadhaar number is required.' });
    }

    const aadhaar = await Aadhaar.findOne({ aadhaarNumber });
    if (!aadhaar) {
      return res.status(404).json({ message: 'Aadhaar number not found.' });
    }

    if (!aadhaar.email) {
      return res.status(400).json({ message: 'No email linked to this Aadhaar number.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    OTP_STORE.set(aadhaarNumber, { otp, expires: Date.now() + OTP_EXPIRY_MS });

    await sendEmailOTP(aadhaar.email, otp);
    console.log(`📧 OTP for ${aadhaarNumber}: ${otp}`);

    res.json({ message: `OTP sent to email linked with Aadhaar: ${aadhaar.email}` });
  } catch (error) {
    console.error('❌ Error sending OTP:', error);
    res.status(500).json({ message: 'Error sending OTP', error: error.message });
  }
});

// ✅ Aadhaar: Verify OTP
router.post('/aadhaar/verify-otp', async (req, res) => {
  try {
    const { aadhaarNumber, otp } = req.body;

    const record = OTP_STORE.get(aadhaarNumber);
    if (!record) return res.status(400).json({ message: 'No OTP found for this Aadhaar number.' });

    if (Date.now() > record.expires)
      return res.status(400).json({ message: 'OTP expired. Please request a new one.' });

    if (record.otp !== otp)
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });

    OTP_STORE.delete(aadhaarNumber);

    res.json({ message: 'Aadhaar verification successful.' });
  } catch (error) {
    console.error('❌ Error verifying OTP:', error);
    res.status(500).json({ message: 'Error verifying OTP', error: error.message });
  }
});

// ✅ Register new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, aadhaarNumber } = req.body;

    if (!name || !email || !password || !aadhaarNumber)
      return res.status(400).json({ message: 'All fields are required.' });

    const aadhaar = await Aadhaar.findOne({ aadhaarNumber });
    if (!aadhaar)
      return res.status(400).json({ message: 'Invalid Aadhaar number.' });

    if (aadhaar.email !== email)
      return res.status(400).json({ message: 'Email does not match Aadhaar records.' });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: 'User with this email already exists.' });

    const user = new User({ name, email, password });
    await user.save();

    res.status(201).json({ message: 'User registered successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during registration.', error: err.message });
  }
});

// ✅ Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials.' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials.' });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login.', error: err.message });
  }
});
// ✅ Create Aadhaar record manually (for testing/demo)
router.post('/aadhaar', async (req, res) => {
  try {
    const { aadhaarNumber, email } = req.body;

    if (!aadhaarNumber || !email)
      return res.status(400).json({ message: 'Aadhaar number and email required.' });

    const existing = await Aadhaar.findOne({ aadhaarNumber });
    if (existing)
      return res.status(400).json({ message: 'Aadhaar number already exists.' });

    const record = new Aadhaar({ aadhaarNumber, email });
    await record.save();

    res.status(201).json({ message: 'Aadhaar record created successfully.', record });
  } catch (error) {
    console.error('❌ Error creating Aadhaar record:', error);
    res.status(500).json({ message: 'Error creating Aadhaar record.', error: error.message });
  }
});
// ✅ Update Aadhaar email (in case it was missing)
router.put('/aadhaar', async (req, res) => {
  try {
    const { aadhaarNumber, email } = req.body;

    if (!aadhaarNumber || !email)
      return res.status(400).json({ message: 'Aadhaar number and email required.' });

    const updated = await Aadhaar.findOneAndUpdate(
      { aadhaarNumber },
      { email },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ message: 'Aadhaar number not found.' });

    res.json({ message: 'Aadhaar email updated successfully.', record: updated });
  } catch (error) {
    console.error('❌ Error updating Aadhaar record:', error);
    res.status(500).json({ message: 'Error updating Aadhaar record.', error: error.message });
  }
});



module.exports = router;
