const mongoose = require('mongoose');

const fitnessClassSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Class title is required'],
      trim: true
    },
    trainerName: {
      type: String,
      required: [true, 'Trainer name is required'],
      trim: true
    },
    scheduleDate: {
      type: Date,
      required: [true, 'Schedule date is required']
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      default: 60,
      min: [15, 'Duration must be at least 15 minutes']
    },
    maxCapacity: {
      type: Number,
      required: [true, 'Max capacity is required'],
      min: [1, 'Capacity must be at least 1']
    },
    enrolledMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for available seats/slots
fitnessClassSchema.virtual('availableSlots').get(function () {
  const enrolledCount = this.enrolledMembers ? this.enrolledMembers.length : 0;
  return Math.max(0, this.maxCapacity - enrolledCount);
});

// Virtual for full status
fitnessClassSchema.virtual('isFull').get(function () {
  const enrolledCount = this.enrolledMembers ? this.enrolledMembers.length : 0;
  return enrolledCount >= this.maxCapacity;
});

// Helper method to check if user is already enrolled
fitnessClassSchema.methods.isUserEnrolled = function (userId) {
  if (!this.enrolledMembers || !userId) return false;
  return this.enrolledMembers.some(
    (memberId) => memberId.toString() === userId.toString()
  );
};

module.exports = mongoose.model('FitnessClass', fitnessClassSchema);
