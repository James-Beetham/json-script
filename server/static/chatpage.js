// global variable representing user who is logged in 
var username;
// socket connected to server
var socket = io();


$(function () {
    // send message on submit form
    $('#chat-form').submit((e) => {
        e.preventDefault(); // prevents page reloading

        var msg = $('#chatbox').val();

        // don't send a blank message
        if(msg == '')
            return false;

        var payload = {
            'username': username,
            'message': msg
        }

        socket.emit('chat-msg', payload);  // emit the message
        $('#chatbox').val(""); // clear chatbox
        hasStoppedTyping(); // notify that this user is done typing
        return false;
    });


    /**
    * sets the username of current user (if its not already taken)
    * then displays the chat page if its a valid username
    */
    $('#username-form').submit((e) => {
        e.preventDefault() // prevent reload

        // get the username
        var inputName = $('#username-input').val();

        // check to see if a user with this name is already logged in
        $.get(
            '/isUserValid?username=' + inputName,
            (response) => {
                // if no one has this username...
                if (response == true) {
                    username = inputName;

                    // make username input screen invisible and show the chat page
                    $('#entry-div').hide();
                    $('#chatpage-div').show();

                    // tell the server a new user connected
                    socket.emit('user-connect', username);
                } else {
                    alert('This username is already taken!');
                }
            }
        )
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
        if ($('#chatbox').val() === '')
            return;

        // if was not typing, emit typing message to socket
        if (!typing) {
            typing = true;
            socket.emit('is-typing', username);
            timeout = setTimeout(hasStoppedTyping, 1000);
        }
        // if user is still typing, reset the timeout
        else {
            clearTimeout(timeout);
            timeout = setTimeout(hasStoppedTyping, 1000);;
        }
    });


    // get all the previous cached messages, and display
    $.get(
        '/previousMessages',
        (messages) => {
            messages.forEach(msg => {
                appendMessage(msg);
            });
        }
    )

    // get all the connected users and display them as online
    $.get(
        '/getOnlineUsers',
        (usernames) => {
            console.log(typeof (usernames));
            usernames.forEach((user) => {
                addOnlineUser(user);
            });
        }
    );

});


//////////////////////
// SOCKET LISTENERS //
//////////////////////
// when a new chat message is received
socket.on('chat-msg', (payload) => {
    appendMessage(payload);
});


// when someone starts typing, add a typing msg to list
socket.on('is-typing', (username) => {
    $('#typing-users').append(buildListElement(username, getTypingId, getTypingText));
});

// when someone stops typing, remove their typing msg from the list
socket.on('stopped-typing', (username) => {
    var id = getTypingId(username);
    $(`#${id}`).remove();
});

// when user connects
// and add them to online users message
socket.on('user-online', (username) => {
    addOnlineUser(username);
});

// when user disconnects, remove from online users
socket.on('user-offline', (username) => {
    var id = getOnlineId(username);
    $(`#${id}`).remove();
})


/////////////////
// UPDATE VIEW //
/////////////////
// displays a given message
function appendMessage(payload) {
    var text = payload['username'] + ': ' + payload['message'];
    $('#messages').append($('<li>').text(text));
}

// displays a user as online
function addOnlineUser(username) {
    $('#users-list').append(buildListElement(username, getOnlineId, getOnlineText));
}

// builds a generic list element 
// with username, function to get element id, and function to get text
function buildListElement(username, getId, getMsg) {
    var id = getId(username);
    var msg = getMsg(username);
    return `<li id=${id}>${msg}</id>`;
}

// all passed into buildListElement
function getOnlineId(username) { return `${username}-online`; }

function getOnlineText(username) { return username; }

function getTypingId(username) { return `${username}-typing`; }

function getTypingText(username) { return `${username} is typing...`; }
