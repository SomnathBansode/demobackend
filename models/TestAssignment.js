const mongoose = require('mongoose');

const testAssignmentSchema = new mongoose.Schema({
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true,
    index: true
  },
  userIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  groupIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  availableFrom: { 
    type: Date,
    default: Date.now
  },
  availableTo: { 
    type: Date,
    validate: {
      validator: function(v) {
        return v > this.availableFrom;
      },
      message: 'End date must be after start date'
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { 
  timestamps: true,
  methods: {
    isActive() {
      const now = new Date();
      return now >= this.availableFrom && now <= this.availableTo;
    }
  }
});

// Index for better query performance
testAssignmentSchema.index({ testId: 1, userIds: 1 });
testAssignmentSchema.index({ testId: 1, groupIds: 1 });

module.exports = mongoose.model('TestAssignment', testAssignmentSchema);