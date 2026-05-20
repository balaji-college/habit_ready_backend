const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  name: { type: String, required: true },
  hashedPassword: { type: String, required: true },
  hashedOtp: { type: String, required: true },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
  },
});

// MongoDB TTL index — auto-deletes documents once expiresAt passes
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

otpSchema.methods.compareOtp = async function (candidate) {
  return bcrypt.compare(String(candidate), this.hashedOtp);
};

module.exports = mongoose.model('OtpVerification', otpSchema);
