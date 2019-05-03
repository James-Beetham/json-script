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
    $('#typing-users').append(buildListElement(username, getTypingId, getTypingText));
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

// when user connects
// show a user connect message
// and add them to online users message
socket.on('user-connect', (payload) => {
    $('#users-list').append(buildListElement(payload, getOnlineId, getOnlineText));
});

socket.on('user-disconnect', (username) => {
    
})


function setUsername() {

    // get the username
    var inputName = document.getElementById('username-input').value;

    $.get(
        '/isUserValid?username=' + inputName,
        (response) => {
            if(response == true) {
                username = inputName;

                // make username input screen invisible and show the chat page
                document.getElementById('entry-div').style.display = 'none';
                document.getElementById('chatpage-div').style.display = 'block';
            
                // tell the server a new user connected
                socket.emit('user-connect', username);
            } else {
                alert('This username is already taken!');
            }
         }
    )
}

function appendMessage(payload) {
    var text = payload['username'] + ': ' + payload['message'];
    $('#messages').append($('<li>').text(text));
}


function buildListElement(username, getId, getMsg) {
    var id = getId(username);
    var msg = getMsg(username);
    return `<li id=${id}>${msg}</id>`;
}


function getOnlineId(username) { return `${username}-online`; }

function getOnlineText(username) { return username; }

function getTypingId(username) { return `${username}-typing`; }

function getTypingText(username) { return `${username} is typing...`; }
