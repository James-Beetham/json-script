var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static('templates'));
app.use(express.static('static'));


app.get('/', (req, res) => {
    res.sendFile(__dirname + '/templates/chatpage.html');
});


// return true if username not taken
app.get('/isUserValid', (req, res) => {
    var username = req.query.username;
    res.send(!connectedUsers.has(username));
});

app.get('/getOnlineUsers', (req, res) => {
    res.send(Array.from(connectedUsers));
});

app.get('/previousMessages', (req, res) => {
    res.send(allMessages);
});



// list of all messages
// a message contains a user and the text
var allMessages = [];
var connectedUsers = new Set();


// when a user connects,
// give them all the previous messages
io.on('connection', (socket) => {
    // when a new chat message is received
    // store it and emit it to all users
    socket.on('chat-msg', (payload) => {
        allMessages.push(payload);
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
        socket._username = user;  // store the username to access on disconnect

        var msg = {
            'username': user,
            'message': `${user} has connected`
        }
        allMessages.push(msg); // store the user join msg
        io.emit('chat-msg', msg);   // emit user join msg
        io.emit('user-online', user); // say that this user is now online
    })

    // when someone logs off
    socket.on('disconnect', () => {
        var user = socket._username;
        connectedUsers.delete(user); // delete this user from set
        socket.broadcast.emit('user-offline', user); // broadcast that the user left

        var msg = {
            'username': user,
            'message': `${user} has disconnected`
        };

        allMessages.push(msg); // store this message
        io.emit('chat-msg', msg); // emit disconnection message
    })
});

// listen on port 8000
http.listen(8000, () => {
    console.log('server listening');
});