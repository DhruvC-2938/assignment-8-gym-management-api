const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');

module.exports = function (passport) {
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'username',
        passwordField: 'password'
      },
      async (username, password, done) => {
        try {
          // Find user by username or email
          const user = await User.findOne({
            $or: [
              { username: username.trim() },
              { email: username.trim().toLowerCase() }
            ]
          });

          if (!user) {
            return done(null, false, { message: 'Invalid username or password' });
          }

          // Compare password
          const isMatch = await user.comparePassword(password);
          if (!isMatch) {
            return done(null, false, { message: 'Invalid username or password' });
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  // Serialize user ID into session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session ID
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};
