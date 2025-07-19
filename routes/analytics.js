    const express = require('express');
    const router = express.Router();
    const User = require('../models/User');
    const Result = require('../models/Result');
    const { authMiddleware, adminMiddleware } = require('../middleware/auth');

    router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
        try {
            const users = await User.find().select('name email role createdAt');
            res.json(users);
        } catch (error) {
            console.error('analytics/users: Error:', error.message, error.stack);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    });

    router.get('/tests/:id', authMiddleware, adminMiddleware, async (req, res) => {
        try {
            const results = await Result.find({ testId: req.params.id })
                .populate('userId', 'name email');
            res.json(results);
        } catch (error) {
            console.error('analytics/tests: Error:', error.message, error.stack);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    });

    module.exports = router;