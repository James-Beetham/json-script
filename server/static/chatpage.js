// global variable representing user who is logged in 
var username;
// socket connected to server
var socket = io();


$(function () {

    // send message on submit form
    $('form').submit(function (e) {
        e.preventDefault(); // prevents page reloading
        var msg = document.getElementById('chatbox').value;
        var payload = {
            'username': username,
            'message': msg
        }

        socket.emit('chat-msg', payload);  // emit the message
        document.getElementById('chatbox').value = ""; // clear chatbox
        hasStoppedTyping(); // notify that this user is done typing
        return false;
    });


    var typing = false;
    var timeout = undefined;

    // called by timeout function
    function hasStoppedTyping() {
        typing = false;
        socket.emit('stopped-typing', username);
    }

    // send an istyping message if input is changing
    $('#chatbox').on('change keyup paste', () => {
        
        // if the box is empty (user clicked enter recently), then return
        if($('#chatbox').val() === '')
            return;

        // if was not typing, emit typing message to socket
        if(!typing) {
            typing = true;
            socket.emit('is-typing', username);
            timeout = setTimeout(hasStoppedTyping, 1000);
        } 
        // if user is still typing, reset the timeout
        else {
            clearTimeout(timeout);
            timeout = setTimeout(hasStoppedTyping, 1000);;
        }
    })
});

socket.on('chat-msg', (payload) => {
    appendMessage(payload);
});


socket.on('is-typing', (username) => {
    $('#typing-users').append(buildTypingListElement(username));
});

socket.on('stopped-typing', (username) => {
    var id = getTypingId(username);
    $(`#${id}`).remove();
});

socket.on('prev-messages', (prevMessages) => {
    prevMessages.forEach(msg => {
        appendMessage(msg);
    });
});

socket.on('user-connect', (username) => {

});



function setUsername() {

    // get the username
    username = document.getElementById('username-input').value;

    // make username input screen invisible and show the chat page
    document.getElementById('entry-div').style.display = 'none';
    document.getElementById('chatpage-div').style.display = 'block';
}

function appendMessage(payload) {
    var text = payload['username'] + ': ' + payload['message'];
    $('#messages').append($('<li>').text(text));
}


function buildTypingListElement(username) {
    var id = getTypingId(username);
    return `<li id=${id}>${username} is typing...</id>`;
}

function getTypingId(username) {
    return `${username}-typing`;
}