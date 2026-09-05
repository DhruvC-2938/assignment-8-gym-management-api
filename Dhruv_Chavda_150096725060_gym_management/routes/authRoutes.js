const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

// @route   POST /api/auth/register
// @desc    Register new member
// @access  Public
router.post('/register', authController.register);

// @route   POST /api/auth/login
// @desc    Login member via Passport Local
// @access  Public
router.post('/login', authController.login);

// @route   POST /api/auth/logout
// @desc    Logout member & destroy session
// @access  Public
router.post('/logout', authController.logout);

// @route   GET /api/auth/me
// @desc    Get current member profile & remaining membership days
// @access  Private
router.get('/me', ensureAuthenticated, authController.getMe);

module.exports = router;
