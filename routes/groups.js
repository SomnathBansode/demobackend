const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const groupController = require('../controllers/groupController');

// Get all groups (with userIds populated)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const groups = await Group.find().populate('userIds', 'name email');
    res.json({ groups });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch groups', error: err.message });
  }
});

// Create a new group
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Group name is required' });
    const group = new Group({ name });
    await group.save();
    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create group', error: err.message });
  }
});

// Add or set users in a group (replace userIds array)
router.put('/:groupId/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userIds } = req.body; // array of user IDs
    if (!Array.isArray(userIds)) return res.status(400).json({ message: 'userIds must be an array' });
    const group = await Group.findByIdAndUpdate(
      req.params.groupId,
      { userIds },
      { new: true }
    );
    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.json(group);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update users', error: err.message });
  }
});

// Rename group
router.put('/:groupId', authMiddleware, adminMiddleware, groupController.renameGroup);

// Delete group
router.delete('/:groupId', authMiddleware, adminMiddleware, groupController.deleteGroup);

module.exports = router;
