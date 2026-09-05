const User = require('../models/User');
const mongoose = require('mongoose');

// Renew or extend member's membership
exports.renewMembership = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { additionalMonths, tier } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Invalid Member ID'
      });
    }

    const member = await User.findById(id);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    const monthsToAdd = Number(additionalMonths);
    if (isNaN(monthsToAdd) || monthsToAdd <= 0) {
      return res.status(400).json({
        success: false,
        message: 'additionalMonths must be a positive number'
      });
    }

    const now = new Date();
    const currentExpiry = new Date(member.membershipExpiryDate);

    // If currently active, extend from current expiry; if expired, extend from now
    let baseDate = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(baseDate);
    newExpiry.setDate(newExpiry.getDate() + (monthsToAdd * 30));

    member.membershipExpiryDate = newExpiry;
    member.membershipStatus = 'active';

    if (tier) {
      const validTiers = ['Bronze', 'Silver', 'Gold', 'Platinum'];
      if (validTiers.includes(tier)) {
        member.membershipTier = tier;
      }
    }

    await member.save();

    return res.status(200).json({
      success: true,
      message: `Membership renewed successfully for ${monthsToAdd} month(s)`,
      member: member.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

// Get list of all expired memberships
exports.getExpiredMembers = async (req, res, next) => {
  try {
    const now = new Date();

    // Query for members where expiryDate < now OR status is expired
    const expiredMembers = await User.find({
      $or: [
        { membershipExpiryDate: { $lt: now } },
        { membershipStatus: 'expired' }
      ]
    }).select('-password');

    // Make sure status in returned objects reflects expired & remaining days
    const formattedMembers = expiredMembers.map((m) => {
      const safe = m.toSafeObject ? m.toSafeObject() : m.toObject();
      safe.membershipStatus = 'expired';
      safe.remainingDays = 0;
      return safe;
    });

    return res.status(200).json({
      success: true,
      count: formattedMembers.length,
      members: formattedMembers
    });
  } catch (error) {
    next(error);
  }
};

// Get all gym members
exports.getAllMembers = async (req, res, next) => {
  try {
    const members = await User.find().select('-password');
    const formatted = members.map((m) => m.toSafeObject());

    return res.status(200).json({
      success: true,
      count: formatted.length,
      members: formatted
    });
  } catch (error) {
    next(error);
  }
};

// Get member profile by ID
exports.getMemberById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Invalid Member ID'
      });
    }

    const member = await User.findById(id);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    return res.status(200).json({
      success: true,
      member: member.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};
