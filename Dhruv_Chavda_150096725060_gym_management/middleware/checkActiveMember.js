const User = require('../models/User');

// Middleware to ensure logged-in member has an active, non-expired membership
const checkActiveMember = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No active session found.'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Member profile not found.'
      });
    }

    const now = new Date();
    const isExpired = new Date(user.membershipExpiryDate) < now;

    if (isExpired || user.membershipStatus === 'expired') {
      if (user.membershipStatus !== 'expired') {
        user.membershipStatus = 'expired';
        await user.save();
      }
      return res.status(400).json({
        success: false,
        message: 'Membership has expired. Please renew your membership to book classes.',
        membershipStatus: 'expired',
        membershipExpiryDate: user.membershipExpiryDate
      });
    }

    if (user.membershipStatus === 'frozen') {
      return res.status(400).json({
        success: false,
        message: 'Your membership is currently frozen. Please contact gym administration.',
        membershipStatus: 'frozen'
      });
    }

    // Attach fresh user object to request
    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error verifying membership status',
      error: error.message
    });
  }
};

module.exports = checkActiveMember;
