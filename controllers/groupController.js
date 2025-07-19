const Group = require('../models/Group');

// Rename group
exports.renameGroup = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Group name is required' });
    const group = await Group.findByIdAndUpdate(req.params.groupId, { name }, { new: true });
    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.json(group);
  } catch (err) {
    res.status(500).json({ message: 'Failed to rename group', error: err.message });
  }
};

// Delete group
exports.deleteGroup = async (req, res) => {
  try {
    const group = await Group.findByIdAndDelete(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.json({ message: 'Group deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete group', error: err.message });
  }
};
