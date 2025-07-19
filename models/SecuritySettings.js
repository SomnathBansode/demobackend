const mongoose = require('mongoose');

const securitySettingsSchema = new mongoose.Schema({
  singleDeviceLogin: { type: Boolean, default: false },
  disableCopyPaste: { type: Boolean, default: false },
  disableScreenshot: { type: Boolean, default: false },
  allowedIPs: [String],
  allowedTimeWindows: [
    {
      start: String, // e.g. '09:00'
      end: String,   // e.g. '18:00'
    }
  ],
}, { timestamps: true });

module.exports = mongoose.model('SecuritySettings', securitySettingsSchema);
