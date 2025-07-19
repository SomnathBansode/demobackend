const express = require('express');
const router = express.Router();
const Result = require('../models/Result');

// Optionally require User and Test for population
const User = require('../models/User');
const Test = require('../models/Test');

// GET /results - list all results, with optional filters
// In routes/results.js
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.userId) query.userId = req.query.userId;
    if (req.query.testId) query.testId = req.query.testId;

    const results = await Result.find(query)
      .populate('userId', 'name email')
      .populate('testId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Result.countDocuments(query);
    
    res.json({
      results,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (err) {
    console.error('Error fetching results:', err);
    res.status(500).json({ message: 'Failed to fetch results', error: err.message });
  }
});

// (Optional) Download results as CSV
router.get('/download', async (req, res) => {
  try {
    const query = {};
    if (req.query.userId) query.user = req.query.userId;
    if (req.query.testId) query.test = req.query.testId;
    if (req.query.date) {
      const date = new Date(req.query.date);
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);
      query.date = { $gte: date, $lt: nextDay };
    }
    const results = await Result.find(query)
      .populate('user', 'name email')
      .populate('test', 'title')
      .sort({ date: -1 });
    if (!results || results.length === 0) {
      return res.status(404).json({ message: 'No results to download' });
    }
    let csv = 'User,Email,Test,Date,Score,Status\n';
    results.forEach(r => {
      csv += `"${r.user?.name || ''}","${r.user?.email || ''}","${r.test?.title || ''}","${r.date ? r.date.toISOString() : ''}","${r.score ?? ''}","${r.status ?? ''}"\n`;
    });
    res.header('Content-Type', 'text/csv');
    res.attachment('results.csv');
    res.send(csv);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ message: 'Failed to download results', error: err.message });
  }
});

// GET /results/:id - get a single result by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await Result.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('testId', 'title');
    if (!result) return res.status(404).json({ message: 'Result not found' });
    res.json({ result });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch result' });
  }
});

module.exports = router;
