const express = require('express');
const Habit = require('../models/Habit');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes require auth
router.use(protect);

// GET /api/habits - Get all user habits with today's status
router.get('/', async (req, res) => {
  try {
    const habits = await Habit.find({ user: req.user._id, isActive: true }).sort({ createdAt: 1 });
    res.json(habits);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/habits - Create a new habit
router.post('/', async (req, res) => {
  try {
    const { name, description, icon, category, color, targetDays } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Habit name is required' });
    }

    const habit = await Habit.create({
      user: req.user._id,
      name,
      description,
      icon: icon || 'bolt',
      category: category || 'other',
      color: color || 'primary',
      targetDays: targetDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    });

    res.status(201).json(habit);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/habits/:id/complete - Toggle completion for today
router.put('/:id/complete', async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, user: req.user._id });

    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    const today = new Date().toISOString().split('T')[0];
    const completionIndex = habit.completions.findIndex(c => c.date === today);

    if (completionIndex > -1) {
      // Un-complete today
      habit.completions.splice(completionIndex, 1);
    } else {
      // Complete today
      habit.completions.push({ date: today });
    }

    await habit.save();
    res.json(habit);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/habits/history - Calendar/streak data for history page
router.get('/history', async (req, res) => {
  try {
    const habits = await Habit.find({ user: req.user._id, isActive: true });

    // Build 90-day completion map (date -> count of habits done)
    const completionMap = {};
    habits.forEach(habit => {
      habit.completions.forEach(c => {
        if (!completionMap[c.date]) completionMap[c.date] = 0;
        completionMap[c.date]++;
      });
    });

    // Build last 7 days performance
    const weekPerf = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const completed = completionMap[dateStr] || 0;
      const total = habits.length || 1;
      weekPerf.push({ date: dateStr, day: dayName, completed, total, pct: Math.round((completed / total) * 100) });
    }

    // Overall best streak across all habits
    const bestStreak = habits.reduce((max, h) => Math.max(max, h.currentStreak || 0), 0);
    const totalDone = Object.values(completionMap).reduce((sum, n) => sum + n, 0);

    // Achievements
    const achievements = [];
    if (bestStreak >= 7) achievements.push({ id: 'consistency_king', name: 'Consistency King', desc: 'Completed habits for 7 days straight', icon: 'emoji_events', color: 'secondary' });
    if (bestStreak >= 14) achievements.push({ id: 'iron_focus', name: 'Iron Focus', desc: '14-day streak achieved', icon: 'military_tech', color: 'tertiary' });
    if (totalDone >= 10) achievements.push({ id: 'early_bird', name: 'Early Bird', desc: '10+ habit completions logged', icon: 'auto_awesome', color: 'primary' });
    if (bestStreak >= 100) achievements.push({ id: 'marathoner', name: 'Marathoner', desc: '100-day streak achieved', icon: 'directions_run', color: 'secondary', locked: false });
    else achievements.push({ id: 'marathoner', name: 'Marathoner', desc: 'Complete a 100-day streak', icon: 'directions_run', locked: true });

    res.json({
      completionMap,
      weekPerf,
      currentStreak: bestStreak,
      bestStreak,
      totalDone,
      achievements
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/habits/:id - Update habit details
router.put('/:id', async (req, res) => {
  try {
    const { name, description, icon, category, color, targetDays } = req.body;
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { name, description, icon, category, color, targetDays } },
      { new: true, runValidators: true }
    );

    if (!habit) return res.status(404).json({ message: 'Habit not found' });
    res.json(habit);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/habits/:id - Soft-delete habit
router.delete('/:id', async (req, res) => {
  try {
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!habit) return res.status(404).json({ message: 'Habit not found' });
    res.json({ message: 'Habit deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
