var socket = io();

socket.on('chatmsg', (payload) => {
    var text = payload['username'] + ': ' + payload['message'];
    $('#messages').append($('<li>').text(text));
})

// global variable representing user who is logged in 
var username;

function setUsername() {

    // get the username
    username = document.getElementById('username_input').value;
    console.log(username);

    // make username input screen invisible and show the chat page
    document.getElementById('entry_div').style.display = 'none';
    document.getElementById('chatpage_div').style.display = 'block';
}

function sendMessage() {
    var msg = document.getElementById('chatbox').value;

    var payload = {
        'username': username,
        'message': msg
    }

    socket.emit('chatmsg', payload);
    document.getElementById('chatbox').value = "";
}