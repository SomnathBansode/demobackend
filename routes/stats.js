const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Test = require('../models/Test');
const Result = require('../models/Result');

// GET /stats - key stats for dashboard
router.get('/', async (req, res) => {
  try {
    const [userCount, testCount, attemptCount, passCount] = await Promise.all([
      User.countDocuments(),
      Test.countDocuments(),
      Result.countDocuments(),
      Result.countDocuments({ status: 'pass' })
    ]);
    const passRate = attemptCount > 0 ? ((passCount / attemptCount) * 100).toFixed(1) : '0.0';
    res.json({
      users: userCount,
      tests: testCount,
      attempts: attemptCount,
      passes: passCount,
      passRate
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch stats', error: err.message });
  }
});

module.exports = router;
