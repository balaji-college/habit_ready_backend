const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const OtpVerification = require('../models/OtpVerification');
const { protect } = require('../middleware/auth');
const { sendOtpEmail } = require('../utils/sendEmail');

const router = express.Router();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// Helper — generate a 6-digit OTP string
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

// ─────────────────────────────────────────────────────────────
// POST /api/auth/register
// Step 1: Validate details → send OTP (does NOT create user yet)
// ─────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: 'Please provide name, email, and password' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    // Check if a verified account already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser)
      return res.status(400).json({ message: 'An account with this email already exists' });

    // Remove any previous pending OTP for this email
    await OtpVerification.deleteMany({ email: email.toLowerCase() });

    // Generate OTP and hash it
    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Hash the password now so we can create the user instantly after verification
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save pending verification
    await OtpVerification.create({
      email: email.toLowerCase(),
      name,
      hashedPassword,
      hashedOtp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Send OTP email
    await sendOtpEmail(email, name, otp);

    res.status(200).json({ message: 'OTP sent to your email. Please verify to complete registration.' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Failed to send OTP. Please try again.', error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/verify-otp
// Step 2: Verify OTP → create account → return JWT
// ─────────────────────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp)
      return res.status(400).json({ message: 'Email and OTP are required' });

    const record = await OtpVerification.findOne({ email: email.toLowerCase() });

    if (!record)
      return res.status(400).json({ message: 'No pending verification for this email. Please register again.' });

    if (new Date() > record.expiresAt)
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });

    const isMatch = await record.compareOtp(otp);
    if (!isMatch)
      return res.status(400).json({ message: 'Incorrect OTP. Please try again.' });

    // Create the user — bypass the pre-save hash since password is already hashed
    const user = new User({
      name: record.name,
      email: record.email,
      password: record.hashedPassword,
    });
    // Skip the pre-save hook for password (already hashed)
    user.$locals.skipHashPassword = true;
    await user.save();

    // Clean up the OTP record
    await OtpVerification.deleteOne({ _id: record._id });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isPremium: user.isPremium,
      preferences: user.preferences,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/resend-otp
// Resend a fresh OTP for a pending registration
// ─────────────────────────────────────────────────────────────
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const record = await OtpVerification.findOne({ email: email.toLowerCase() });
    if (!record)
      return res.status(400).json({ message: 'No pending registration found. Please sign up again.' });

    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    record.hashedOtp = hashedOtp;
    record.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await record.save();

    await sendOtpEmail(email, record.name, otp);

    res.json({ message: 'A new OTP has been sent to your email.' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Failed to resend OTP.', error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: 'Please provide email and password' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user)
      return res.status(401).json({ message: 'No account found with that email address.' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(401).json({ message: 'Incorrect password. Please try again.' });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isPremium: user.isPremium,
      preferences: user.preferences,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/auth/me  (protected)
router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

// PUT /api/auth/preferences (protected)
router.put('/preferences', protect, async (req, res) => {
  try {
    const { pushNotifications, dailyReminders, darkMode, reminderTime } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { preferences: { pushNotifications, dailyReminders, darkMode, reminderTime } } },
      { new: true, runValidators: true }
    );
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/auth/profile (protected)
router.put('/profile', protect, async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { name } },
      { new: true }
    );
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/auth/change-password (protected)
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Please provide current and new password' });
    if (newPassword.length < 6)
      return res.status(400).json({ message: 'New password must be at least 6 characters' });

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch)
      return res.status(400).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Please provide your email' });
    // Always return success for security (don't reveal if email exists)
    res.json({ message: 'If this email exists, a reset link will be sent.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
