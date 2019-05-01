var path = require('path')
var express = require('express');
var app = express();

app.use(express.static('templates'));
app.use(express.static('static'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + "/templates/chatpage.html");
})

var server = app.listen(8000, () => {
    console.log('server listening at ' + server.address().port);
})