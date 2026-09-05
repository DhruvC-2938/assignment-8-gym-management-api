const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters']
    },
    membershipTier: {
      type: String,
      enum: ['Bronze', 'Silver', 'Gold', 'Platinum'],
      default: 'Bronze'
    },
    membershipStatus: {
      type: String,
      enum: ['active', 'expired', 'frozen'],
      default: 'active'
    },
    membershipExpiryDate: {
      type: Date,
      required: [true, 'Membership expiry date is required']
    },
    emergencyContact: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Pre-save middleware for password hashing and dynamic expiry status check
userSchema.pre('save', async function () {
  // Hash password if modified
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Check if membership is expired (unless frozen)
  if (this.membershipStatus !== 'frozen') {
    if (this.membershipExpiryDate && new Date(this.membershipExpiryDate) < new Date()) {
      this.membershipStatus = 'expired';
    }
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Calculate remaining days in membership
userSchema.methods.getRemainingDays = function () {
  const now = new Date();
  const expiry = new Date(this.membershipExpiryDate);
  const diffTime = expiry - now;
  if (diffTime <= 0) return 0;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Check if membership is currently active
userSchema.methods.isMembershipActive = function () {
  return this.membershipStatus === 'active' && new Date(this.membershipExpiryDate) >= new Date();
};

// Return safe user representation excluding password
userSchema.methods.toSafeObject = function () {
  const user = this.toObject();
  delete user.password;
  user.remainingDays = this.getRemainingDays();
  return user;
};

module.exports = mongoose.model('User', userSchema);
