const FitnessClass = require('../models/FitnessClass');
const mongoose = require('mongoose');

// Fetch all classes (supports ?trainer=John)
exports.getAllClasses = async (req, res, next) => {
  try {
    const { trainer, title, upcomingOnly } = req.query;
    const filter = {};

    if (trainer) {
      filter.trainerName = { $regex: trainer.trim(), $options: 'i' };
    }

    if (title) {
      filter.title = { $regex: title.trim(), $options: 'i' };
    }

    if (upcomingOnly === 'true') {
      filter.scheduleDate = { $gte: new Date() };
    }

    const classes = await FitnessClass.find(filter)
      .populate('enrolledMembers', 'username email membershipTier membershipStatus')
      .sort({ scheduleDate: 1 });

    return res.status(200).json({
      success: true,
      count: classes.length,
      classes
    });
  } catch (error) {
    next(error);
  }
};

// Get class details by ID with enrolled members
exports.getClassById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Invalid Class ID format'
      });
    }

    const fitnessClass = await FitnessClass.findById(id).populate(
      'enrolledMembers',
      'username email membershipTier membershipStatus'
    );

    if (!fitnessClass) {
      return res.status(404).json({
        success: false,
        message: 'Fitness class not found'
      });
    }

    return res.status(200).json({
      success: true,
      fitnessClass
    });
  } catch (error) {
    next(error);
  }
};

// Create a new workout class
exports.createClass = async (req, res, next) => {
  try {
    const { title, trainerName, scheduleDate, durationMinutes, maxCapacity } = req.body;

    if (!title || !trainerName || !scheduleDate || !maxCapacity) {
      return res.status(400).json({
        success: false,
        message: 'Title, trainerName, scheduleDate, and maxCapacity are required'
      });
    }

    const parsedDate = new Date(scheduleDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scheduleDate format'
      });
    }

    const capacity = Number(maxCapacity);
    if (isNaN(capacity) || capacity < 1) {
      return res.status(400).json({
        success: false,
        message: 'maxCapacity must be a positive integer (min: 1)'
      });
    }

    const duration = durationMinutes ? Number(durationMinutes) : 60;
    if (isNaN(duration) || duration < 15) {
      return res.status(400).json({
        success: false,
        message: 'durationMinutes must be at least 15'
      });
    }

    const newClass = new FitnessClass({
      title: title.trim(),
      trainerName: trainerName.trim(),
      scheduleDate: parsedDate,
      durationMinutes: duration,
      maxCapacity: capacity,
      enrolledMembers: []
    });

    await newClass.save();

    return res.status(201).json({
      success: true,
      message: 'Fitness class created successfully',
      fitnessClass: newClass
    });
  } catch (error) {
    next(error);
  }
};

// Book / Enroll logged-in user in a class
exports.bookClass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Invalid Class ID'
      });
    }

    const fitnessClass = await FitnessClass.findById(id);
    if (!fitnessClass) {
      return res.status(404).json({
        success: false,
        message: 'Fitness class not found'
      });
    }

    // Check if user is already enrolled
    if (fitnessClass.isUserEnrolled(userId)) {
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in this class'
      });
    }

    // Check capacity constraint
    if (fitnessClass.enrolledMembers.length >= fitnessClass.maxCapacity) {
      return res.status(400).json({
        success: false,
        message: `Class capacity reached (Max: ${fitnessClass.maxCapacity})`,
        maxCapacity: fitnessClass.maxCapacity,
        enrolledCount: fitnessClass.enrolledMembers.length
      });
    }

    // Enroll member
    fitnessClass.enrolledMembers.push(userId);
    await fitnessClass.save();

    const updatedClass = await FitnessClass.findById(id).populate(
      'enrolledMembers',
      'username email membershipTier'
    );

    return res.status(200).json({
      success: true,
      message: 'Class booked successfully',
      fitnessClass: updatedClass,
      availableSlots: updatedClass.availableSlots
    });
  } catch (error) {
    next(error);
  }
};

// Cancel booking from class
exports.cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Invalid Class ID'
      });
    }

    const fitnessClass = await FitnessClass.findById(id);
    if (!fitnessClass) {
      return res.status(404).json({
        success: false,
        message: 'Fitness class not found'
      });
    }

    // Check if user is actually enrolled
    if (!fitnessClass.isUserEnrolled(userId)) {
      return res.status(400).json({
        success: false,
        message: 'You are not enrolled in this class'
      });
    }

    // Remove user enrollment
    fitnessClass.enrolledMembers = fitnessClass.enrolledMembers.filter(
      (memberId) => memberId.toString() !== userId.toString()
    );

    await fitnessClass.save();

    const updatedClass = await FitnessClass.findById(id).populate(
      'enrolledMembers',
      'username email membershipTier'
    );

    return res.status(200).json({
      success: true,
      message: 'Class booking cancelled successfully',
      fitnessClass: updatedClass,
      availableSlots: updatedClass.availableSlots
    });
  } catch (error) {
    next(error);
  }
};
