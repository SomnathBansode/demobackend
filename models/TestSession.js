const mongoose = require('mongoose');

const testSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true,
    index: true
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date,
    validate: {
      validator: function(v) {
        return v > this.startTime;
      },
      message: 'End time must be after start time'
    }
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'expired'],
    default: 'active'
  },
  ipAddress: String,
  userAgent: String
}, { 
  timestamps: true,
  statics: {
    async createTestSession(userId, testId, req) {
      return this.create({
        userId,
        testId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    }
  }
});

// Compound index for better query performance
testSessionSchema.index({ userId: 1, testId: 1, status: 1 });

module.exports = mongoose.model('TestSession', testSessionSchema);