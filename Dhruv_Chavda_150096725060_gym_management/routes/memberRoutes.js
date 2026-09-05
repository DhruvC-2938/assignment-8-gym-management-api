const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');

// @route   GET /api/members/expired
// @desc    Get list of all expired memberships
// @access  Public
router.get('/expired', memberController.getExpiredMembers);

// @route   PATCH /api/members/:id/renew
// @desc    Renew / extend membership expiry date
// @access  Public
router.patch('/:id/renew', memberController.renewMembership);

// @route   GET /api/members
// @desc    Get all gym members
// @access  Public
router.get('/', memberController.getAllMembers);

// @route   GET /api/members/:id
// @desc    Get single member profile by ID
// @access  Public
router.get('/:id', memberController.getMemberById);

module.exports = router;
