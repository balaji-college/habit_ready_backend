const mongoose = require('mongoose');

const completionSchema = new mongoose.Schema({
  date: { type: String, required: true }, // "YYYY-MM-DD"
  completedAt: { type: Date, default: Date.now },
  note: { type: String, maxlength: 280, default: '' }
});

const habitSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: [true, 'Habit name is required'],
      trim: true,
      maxlength: 100
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
      default: ''
    },
    icon: {
      type: String,
      default: 'bolt' // Material Symbols icon name
    },
    category: {
      type: String,
      enum: ['mindfulness', 'health', 'focus', 'fitness', 'learning', 'other'],
      default: 'other'
    },
    color: {
      type: String,
      enum: ['primary', 'secondary', 'tertiary'],
      default: 'primary'
    },
    targetDays: {
      type: [String], // ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
      default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    },
    completions: [completionSchema],
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Virtual: current streak
habitSchema.virtual('currentStreak').get(function () {
  if (!this.completions.length) return 0;
  const dates = this.completions.map(c => c.date).sort().reverse();
  let streak = 0;
  let current = new Date();
  current.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const dateStr = current.toISOString().split('T')[0];
    if (dates.includes(dateStr)) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else if (i === 0) {
      // Today not done yet — check yesterday
      current.setDate(current.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
});

// Virtual: is completed today
habitSchema.virtual('isCompletedToday').get(function () {
  const today = new Date().toISOString().split('T')[0];
  return this.completions.some(c => c.date === today);
});

habitSchema.set('toJSON', { virtuals: true });
habitSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Habit', habitSchema);
