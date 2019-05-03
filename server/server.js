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


// list of all messages
// a message contains a user and the text
var allMessages = [];
var connectedUsers = new Set();


// when a user connects,
// give them all the previous messages
io.on('connection', (socket) => {
    socket.emit('prev-messages', allMessages);

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

    socket.on('stopped-typing', (user) => {
        socket.broadcast.emit('stopped-typing', user);
    })

    socket.on('user-connect', (user) => {
        connectedUsers.add(user); // add user to connected users set
        socket._username = user;  // store the username to access on disconnect
        
        var msg = {
            'username': user,
            'message': `${user} has connected`,
            'messageType': 'connect'
        }
        allMessages.push(msg);
        io.emit('chat-msg', msg);   // emit this new username to everyone
    })

    // when someone logs off
    socket.on('disconnect', () => {
        connectedUsers.delete(socket._username); // delete this user from set
        socket.broadcast.emit('user-disconnect', socket._username); // broadcast that the user left
    })
})

// listen on port 8000
http.listen(8000, () => {
    console.log('server listening');
})


/**
 * method 1:
 * message and user connection will have 2 seperate sockets
 * when this user connects, send all online users to them
 * when other user connects/disconnects call the appropriate socket function
 * 
 * 
 * method 2:
 * pass connection/disconnection as a message, store the messageType in message obj
 * when this user connects, just need to get all messages, go thru every message
 * and set the state of the online users accordingly
 * when get a new message, must check if its a connection/disconnection message
 * type and change state of onlineusers accordingly.
 */