var router = require("express").Router();
var passport = require("passport");

var loginMiddleware = passport.authenticate("login", {
    failureRedirect: "/a/login",
    // successRedirect: "/chat",
    failureFlash   : true
});

var registerMiddleware = passport.authenticate("register", {
    failureRedirect: "/a/register",
    // successRedirect: "/chat",
    failureFlash   : true
});


router.get("/login", (req, res)=>{
	var loginMessage = req.flash("loginMessage");
	console.log(loginMessage);
    res.render("login"); 
});


router.post("/login", loginMiddleware, (req, res)=>{
	console.log("-"+ req.body.username + "-" );

    // Success redirect:
    req.session.username = req.body.username;
    res.cookie("username", req.body.username, {
    	maxAge: 24 * 60 * 60 * 1000,
		signed: true
    });
    res.redirect("/chat");

});

router.get("/register", (req, res)=>{
	var registerMessage = req.flash("registerMessage");
	console.log(registerMessage);
    res.render("register"); 
});

router.post("/register", registerMiddleware, (req, res)=>{
	console.log(req.body.username);
    
    // Success redirect:
    req.session.username = req.body.username;
    res.cookie("username", req.body.username, {
    	maxAge: 24 * 60 * 60 * 1000,
		signed: true
    });
    res.redirect("/chat");
});

module.exports = router;