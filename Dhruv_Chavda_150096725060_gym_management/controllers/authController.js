const passport = require('passport');
const User = require('../models/User');

// Register new member
exports.register = async (req, res, next) => {
  try {
    const { username, email, password, membershipTier, durationMonths, emergencyContact } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ username: username.trim() }, { email: email.trim().toLowerCase() }]
    });

    if (existingUser) {
      const field = existingUser.username.toLowerCase() === username.trim().toLowerCase() ? 'Username' : 'Email';
      return res.status(400).json({
        success: false,
        message: `${field} is already registered`
      });
    }

    // Validate tier if provided
    const validTiers = ['Bronze', 'Silver', 'Gold', 'Platinum'];
    const tier = membershipTier && validTiers.includes(membershipTier) ? membershipTier : 'Bronze';

    // Calculate membershipExpiryDate based on duration in months (30 days per month)
    const months = Number(durationMonths) > 0 ? Number(durationMonths) : 1;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (months * 30));

    const newUser = new User({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password,
      membershipTier: tier,
      membershipStatus: 'active',
      membershipExpiryDate: expiryDate,
      emergencyContact: emergencyContact ? emergencyContact.trim() : undefined
    });

    await newUser.save();

    return res.status(201).json({
      success: true,
      message: 'Member registered successfully',
      user: newUser.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

// Login member via Passport Local
exports.login = (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required'
    });
  }

  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: info && info.message ? info.message : 'Invalid username or password'
      });
    }

    req.login(user, (loginErr) => {
      if (loginErr) {
        return next(loginErr);
      }

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        user: user.toSafeObject()
      });
    });
  })(req, res, next);
};

// Logout member
exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    if (req.session) {
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          return next(destroyErr);
        }
        res.clearCookie('connect.sid');
        return res.status(200).json({
          success: true,
          message: 'Logged out successfully'
        });
      });
    } else {
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    }
  });
};

// Fetch current active member profile & remaining days
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      user: user.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};
