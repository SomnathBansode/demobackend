const SecuritySettings = require('../models/SecuritySettings');

// Get current security settings
exports.getSettings = async (req, res) => {
  try {
    let settings = await SecuritySettings.findOne();
    if (!settings) {
      settings = await SecuritySettings.create({});
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch security settings', error: error.message });
  }
};

// Update security settings
exports.updateSettings = async (req, res) => {
  try {
    let settings = await SecuritySettings.findOne();
    if (!settings) {
      settings = await SecuritySettings.create({});
    }
    Object.assign(settings, req.body);
    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update security settings', error: error.message });
  }
};
