var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);


app.use(express.static('templates'));
app.use(express.static('static'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/templates/chatpage.html');
})


// list of all messages
// a message contains a user and the text
var allMessages = [];


// when a user connects,
// give them all the previous messages
io.on('connection', (socket) => {
    console.log('user connected');
    socket.emit('prev-messages', allMessages);

    // when a new chat message is received
    // store it 
    // emit it to all users
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

    // when someone logs off
    socket.on('disconnect', () => {
        console.log('someone has disconnected');
    })
})

// listen on port 8000
http.listen(8000, () => {
    console.log('server listening');
})