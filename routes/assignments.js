const express = require('express');
const router = express.Router();
const { assignTest, getAssignments } = require('../controllers/testAssignmentController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Assign test to users/groups
router.post('/', authMiddleware, adminMiddleware, assignTest);
// Get assignments for user/group
router.get('/', authMiddleware, adminMiddleware, getAssignments);

module.exports = router;
