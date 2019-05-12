var passport      = require("passport");
var LocalStrategy = require("passport-local").Strategy;
var User          = require("../model/user-model.js");

passport.serializeUser(function(user, done){
	return done(null, user.id);
});

passport.deserializeUser(function(id, done){
	User.findById(id, function(err, user){
		return done(err, user);
	});
});

var loginStrategy = new LocalStrategy({
	usernameField: "username",
	passwordField: "password",
	passReqToCallback: true
}, function(req, username, password, done) {

	User.findOne({username: username}, function(err, user) {
		if(err){
			return done(err, null);
		}

		if(!user){
			return done(null, false, 
				req.flash("loginMessage", "Username doesn't exist"));
		}

		if(!user.verifyPassword(password)){
			console.log("Wrong password");
			return done(null, false, 
				req.flash("loginMessage", "Wrong password"));
		}
		console.log("Logged in");
		return done(null, user);
	});
});

passport.use("login", loginStrategy);

var registerStrategy = new LocalStrategy({
	usernameField: "username", 
	passwordField: "password",
	passReqToCallback: true
}, function(req, username, password, done) {

	User.findOne({username: username}, function(err, oldUser) {
		if(err){
			return done(err, null);
		}

		if(oldUser){
			console.log("Username is already taken");
			return done(null, null, 
				req.flash("registerMessage", "Username is already taken"));
		}

		if(!username || username.length < 3 || !password || 
			password.length < 4)
		{
			return done(null, null, req.flash("registerMessage", 
				"Username and password are required"));
		}

		var user = new User();

		user.username = username;
		user.password = User.hashPassword(password);

		user.save(function(err) {
			if(err){throw err;}
			console.log("User created" , user);
			return done(null, user);
		})
	});
});

passport.use("register", registerStrategy);