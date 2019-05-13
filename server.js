var express = require('express');
var app = express();
var path = require("path");
var server = require('http').Server(app);
var io = require('socket.io')(server);
var flash = require("connect-flash");
var morgan = require("morgan");
var session = require("express-session");
var mongoose = require("mongoose");
var passport = require("passport");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var User = require("./model/user-model.js");

var coreJS = require("./core.js");

mongoose.connect("mongodb+srv://admin_1:password_1@livechatdb-f6agq.mongodb.net/test", { useNewUrlParser: true });
mongoose.set('useCreateIndex', true);

app.set("view engine", "ejs");
app.use(express.static('templates'));
app.use(express.static('static'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser("secretkey"));
app.use(morgan("dev"));

var sessionStore = new session.MemoryStore();
var sessionSetup = session({
    secret: "simplesecretkey",
    resave: true,
    saveUninitialized: true,
    store: sessionStore
});


app.use(sessionSetup);

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

require("./config/passport-config");

var authRouter = require("./router/authentication-router");
app.use("/a", authRouter);

app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        return res.sendFile(
            path.resolve(__dirname, "./templates/chatpage.html"));
    } else {
        return res.redirect("/a/login");
    }
});

app.get("/chat", (req, res) => {
    if (!req.isAuthenticated()) {
        res.redirect("/a/login");
    } else {
        res.sendFile(path.resolve(__dirname, "./templates/chatpage.html"));
    }
});

/*app.get(/^\/login$|^\/register$/, (req, res)=>{
    var registerMessage = req.flash("registerMessage");
    var loginMessage    = req.flash("loginMessage");

    console.log("registerMessage", registerMessage);
    console.log("loginMessage", loginMessage);
    res.sendFile(path.resolve(__dirname, "./templates/authentication.html"));
});*/


app.get('/getOnlineUsers', (req, res) => {
    res.send(Array.from(connectedUsers));
});

app.get('/previousMessages', (req, res) => {
    res.send(allMessages);
});

// returns dictionary mapping username of users to their profile image URL
app.get('/profileURLs', (req, res) => {
    var map = {};

    User.find({}, 'username pictureURL', (err, docs) => {

        // for each document, add their profile img to the map
        docs.forEach((doc) => {
            var user = doc.username;
            var url = doc.pictureURL;

            map[user] = url;
        });

        res.send(map);
    });
});


app.put('/profileURLs', (req, res) => {
    var username = req.query.username;
    var url = req.query.profileURL;

    User.findOneAndUpdate({ 'username': username }, { $set: { 'pictureURL': url } }, (err, docs) => {
        res.send('success');
    });
});

// list of all messages
// a message contains a user and the text
var allMessages = [];
var connectedUsers = new Set();
var connectedSockets = [];

// when a user connects,
// give them all the previous messages
io.on('connection', (socket) => {
    // when a new chat message is received
    // store it and emit it to all users
    socket.on('chat-msg', (payload) => {
        // console.log(payload.message);
        // console.log(payload.message.match(/\/w/));
        // console.log(payload.message.match(/\/w (\w+) \w+/));

        if (payload.message.match(/\/w/)) {
            var targetUser = payload.message.match(/\/w +(\w+)/)[1];
            var message = payload.message.match(/\/w +\w+ (.*)/)[1];
            // console.log("target is: " + connectedUsers.get(targetUser));

            if (targetUser == payload.username) {
                return;
            }

            for (const userSocket of connectedSockets) {
                if (userSocket.username == targetUser) {
                    // A new payload is created to avoid mutation.
                    var newPayload = {
                        username: payload.username,
                        message: "** " + message + " **",
                        type: "message"
                    };

                    socket.emit("chat-msg", newPayload);
                    userSocket.socket.emit("chat-msg", newPayload);
                }
            }
            return;
        } else if (payload.message.startsWith("`")) {
            var msg = payload.message.substring(1);
            var mode = 2;
            if (msg.startsWith("tree")) { mode = 1; msg = msg.substring(4); } 
            if (msg.startsWith("silent")) { mode *= -1; msg = msg.substring(6); }
            console.log("parsing (%d): %s", mode, msg);
            try {
                var tree = coreJS.parseExpr(coreJS.rules, msg);
                if (mode != 1 && mode != -1) {
                    env.data = {};
                    coreJS.parseTree(env, tree);
                    msg = JSON.stringify(env.data);
                    if (mode == -1) {
                        socket.emit("chat-msg", {username: payload.username, message: "**silent** " + msg, type: "message"});
                        return;
                    } else payload.message = msg;
                } else {
                    if (mode == -1) {
                        socket.emit("chat-msg", {username: payload.username, message: "**silent** " + JSON.stringify(tree), type: "message"});
                        return;
                    } else payload.message = JSON.stringify(tree);
                }
            } catch (e) {
                if (mode >= 0) socket.emit("chat-msg", {username: payload.username, message: "error: " + (typeof(e) == "string" ? e : e.message), type: "message"});
                return;
            }
            // console.log(payload);

            allMessages.push(payload);
        } else {
            allMessages.push(payload);
        }

        io.emit('chat-msg', payload);
    })

    // when a user is typing
    // emit it to all users except current user
    socket.on('is-typing', (user) => {
        socket.broadcast.emit('is-typing', user);
    })

    // when user stops typing
    // emit it to all users except current user
    socket.on('stopped-typing', (user) => {
        socket.broadcast.emit('stopped-typing', user);
    })

    // when current user enters their username
    socket.on('user-connect', (user) => {
        connectedUsers.add(user); // add user to connected users set

        // The socket object is used to receive the target message.
        // The username is used to identify the user.
        var userSocket = {
            username: user,
            socket: socket,
        };
        connectedSockets.push(userSocket);

        socket._username = user;  // store the username to access on disconnect
        socket._env = {};

        var msg = {
            'message': `${user} has connected`,
            'type': 'info'
        }
        io.emit('chat-msg', msg);   // emit user join msg
        io.emit('user-online', user); // say that this user is now online

        allMessages.push(msg); // store the user join msg
    })

    // when someone logs off
    socket.on('disconnect', () => {
        var user = socket._username;
        connectedUsers.delete(user); // delete this user from set

        // Remove the connectedSocket object.
        removeConnectedUser(connectedSockets, user);

        socket.broadcast.emit('user-offline', user); // broadcast that the user left

        var msg = {
            'message': `${user} has disconnected`,
            'type': 'info'
        };

        allMessages.push(msg); // store this message
        io.emit('chat-msg', msg); // emit disconnection message
    })
});

function removeConnectedUser(arr, username) {
    connectedSockets = arr.filter(function(sock){
        return sock.username !== username;
    });
 }
 

// listen on port 8000
server.listen(process.env.PORT || 8000, () => {
    console.log('server listening');
});


var env = {data: {}, 
    events: {
        /**
         * events:
         *      warning: {l: level, m: message}
         */
        on: function(event, entry) {
            // TODO
        }, 
        execute: function(event, args) {
            // TODO
        }
    },
    definitions: {
        "=": function(a, b) { // a = b
            if (a == undefined || b == undefined) {
                env.events.execute("warning", {l: 3, m: "Tried to '=' an undefined expression"});
                return a == undefined ? b : a;
            }
            if (a.type != b.type) 
                env.events.execute("warning", {l: 5, m: "Converting variable to different type"});
            a.type = b.type;
            a.value = b.value;
            return a;
        },
        "+": function(a, b) { // a + b (combines array, doesn't append)
            if (a == undefined || b == undefined) {
                env.events.execute("warning", {l: 3, m: "Tried to add an undefined expression"});
                return a == undefined ? b : a;
            }
            if (a.type == "number" && b.type == "number")
                return {type: "number", value: a.value + b.value};
            if (a.type + b.type == "stringstring" || a.type + b.type == "stringnumber" || a.type + b.type == "numberstring")
                return {type: "string", value: a.value + b.value};
            if (a.type + b.type == "arrayarray") {
                var ret = {type: "array", value: []};
                for (i = 0; i < a.value.length || i < b.value.length; i++)
                    ret.value.push(i < a.value.length ? a.value[i] + (i < b.value.length ? b.value[i] : 0) : b.value[i]);
                return {type: "array", value: a.value.concat(b.value)};
            }
            env.events.execute("warning", {l: 1, m: "Invalid addition operation, tried to add: " + a.type + " and " + b.type});
        },
        "-": function(a, b) {
            if (a.type == "number" && b.type == "number")
                return {type: "number", value: a.value - b.value};
            return {type: a.type, value: a.value};
        },
        "var": function(a) {
            return a;
        },
        ";": function(a) {
            return a;
        },
        "(": function(a) { return a; },
    }
};