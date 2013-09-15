var passport = require('passport')
  , TwitterStrategy = require('passport-twitter').Strategy
  , credentials = require('../../credentials.js');


var strategy = new TwitterStrategy(
  {
    consumerKey: credentials.consumer_key,
    consumerSecret: credentials.consumer_secret,
    callbackURL: "http://clearstream.herokuapp.com/auth/twitter/callback"
  },

  function(token, tokenSecret, profile, done) {
    process.nextTick(function () {
      
      // To keep the example simple, the user's Twitter profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Twitter account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });
  }
);


passport.use(strategy);

exports.authenticate = function() {
  console.log('authenticate!');
  passport.authenticate('twitter');
};

exports.redirect = function() {
  console.log('twitter response...!');
  passport.authenticate('twitter', { successRedirect: '/',
  failureRedirect: '/login' });
};