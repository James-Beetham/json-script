var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);


app.use(express.static('templates'));
app.use(express.static('static'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/templates/chatpage.html');
})

io.on('connection', (socket) => {
    console.log('user connected');

    socket.on('chatmsg', (payload) => {
        io.emit('chatmsg', payload);
    })

    socket.on('disconnect', () => {
        console.log('someone disconnected');
    })
})

http.listen(8000, () => {
    console.log('server listening');
})