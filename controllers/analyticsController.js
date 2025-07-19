const Result = require('../models/Result');

exports.getTestAnalytics = async (req, res) => {
    try {
        const results = await Result.find({ testId: req.params.id });
        if (!results.length) return res.status(404).json({ message: 'No results found' });
        const analytics = {
            totalSubmissions: results.length,
            averageScore: results.reduce((sum, r) => sum + r.score, 0) / results.length,
            correctAnswers: results.reduce((sum, r) => sum + r.correctAnswers, 0) / results.length,
            incorrectAnswers: results.reduce((sum, r) => sum + r.incorrectAnswers, 0) / results.length,
            unanswered: results.reduce((sum, r) => sum + r.unanswered, 0) / results.length
        };
        res.json(analytics);
    } catch (error) {
        console.error('Get test analytics failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};