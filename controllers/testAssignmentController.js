const TestAssignment = require('../models/TestAssignment');
const User = require('../models/User');
const Group = require('../models/Group'); // If you have a Group model
const Test = require('../models/Test');

// Assign a test to users/groups
exports.assignTest = async (req, res) => {
  try {
    const { testId, userIds = [], groupIds = [], availableFrom, availableTo } = req.body;
    if (!testId || (userIds.length === 0 && groupIds.length === 0)) {
      return res.status(400).json({ message: 'testId and at least one user or group required' });
    }
    const assignment = new TestAssignment({
      testId,
      userIds,
      groupIds,
      availableFrom,
      availableTo,
    });
    await assignment.save();
    res.status(201).json({ message: 'Test assigned successfully', assignment });
  } catch (error) {
    res.status(500).json({ message: 'Assignment failed', error: error.message });
  }
};

// Get assignments for a user or group
exports.getAssignments = async (req, res) => {
  try {
    const { userId, groupId } = req.query;
    let filter = {};
    if (userId) filter.userIds = userId;
    if (groupId) filter.groupIds = groupId;
    const assignments = await TestAssignment.find(filter).populate('testId');
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: 'Fetch failed', error: error.message });
  }
};
