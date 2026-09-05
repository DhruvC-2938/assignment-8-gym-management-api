const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');
const checkActiveMember = require('../middleware/checkActiveMember');

// @route   GET /api/classes
// @desc    Fetch all upcoming/available workout classes (supports ?trainer=Name)
// @access  Public
router.get('/', classController.getAllClasses);

// @route   GET /api/classes/:id
// @desc    Get class details with enrolled members list
// @access  Public
router.get('/:id', classController.getClassById);

// @route   POST /api/classes
// @desc    Create a new workout class
// @access  Public (or Admin)
router.post('/', classController.createClass);

// @route   POST /api/classes/:id/book
// @desc    Enroll logged-in user into class (fails if full or member expired)
// @access  Private (Authenticated + Active Member)
router.post('/:id/book', ensureAuthenticated, checkActiveMember, classController.bookClass);

// @route   DELETE /api/classes/:id/cancel
// @desc    Cancel logged-in user booking from class
// @access  Private (Authenticated)
router.delete('/:id/cancel', ensureAuthenticated, classController.cancelBooking);

module.exports = router;
