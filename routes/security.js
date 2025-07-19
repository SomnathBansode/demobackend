const express = require('express');
const router = express.Router();
const securityController = require('../controllers/securityController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Get security settings (admin only)
router.get('/', authMiddleware, adminMiddleware, securityController.getSettings);
// Update security settings (admin only)
router.put('/', authMiddleware, adminMiddleware, securityController.updateSettings);

module.exports = router;
