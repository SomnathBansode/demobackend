const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// List users (with search & pagination)
router.get('/', authMiddleware, adminMiddleware, userController.listUsers);

// Update user details
router.put('/:id', authMiddleware, adminMiddleware, userController.updateUser);

// Activate/deactivate user (toggle isVerified)
router.patch('/:id/activate', authMiddleware, adminMiddleware, userController.toggleUserStatus);

// Delete user
router.delete('/:id', authMiddleware, adminMiddleware, userController.deleteUser);

module.exports = router;
