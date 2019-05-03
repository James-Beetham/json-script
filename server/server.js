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
    socket.emit('prevMessages', allMessages);

    // when a new chat message is received
    // store it 
    // emit it to all users
    socket.on('chatmsg', (payload) => {
        allMessages.push(payload);
        io.emit('chatmsg', payload);
    })

    // when a user is typing
    // emit it to all users except current user
    socket.on('istyping', (user) => {
        io.emit('istyping', user);
    })

    socket.on('stoppedtyping', (user) => {
        io.emit('stoppedtyping', user);
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