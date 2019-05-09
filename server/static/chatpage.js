// global variable representing user who is logged in 
var username;
// socket connected to server
var socket = io();

var showNewMessages = false;

$(function () {
    username = document.cookie.match(/username=s%3A(.*)\./)[1];
    $('#entry-div').hide();
    $('#chatpage-div').show();

    // tell the server a new user connected
    socket.emit('user-connect', username);

    // must display cached messages AFTER user logs in
    // so we know which css class to add to the messages
    displayCachedMessages();

    $("#modal-guide").modal({keyboard: true, show:true});

    // send message on submit form
    $('#chat-form').submit((e) => {
        e.preventDefault(); // prevents page reloading

        var msg = $('#chatbox').val();

        // don't send a blank message
        if (msg == '')
            return false;

        var payload = {
            'username': username,
            'message': msg,
            'type': 'message'
        }

        socket.emit('chat-msg', payload); // emit the message
        $('#chatbox').val(""); // clear chatbox
        hasStoppedTyping(); // notify that this user is done typing
        return false;
    });


    /**
     * sets the username of current user (if its not already taken)
     * then displays the chat page if its a valid username
     */
    /*$('#username-form').submit((e) => {
        e.preventDefault() // prevent reload

        // get the username
        var inputName = $('#username-input').val();


        // disallow blank username
        if (inputName == '')
            return false;

        // check to see if a user with this name is already logged in
        $.get(
            `/isUserValid?username=${inputName}`,
            (response) => {
                // if no one has this username...
                if (response == true) {
                    username = inputName;

                    // make username input screen invisible and show the chat page
                    $('#entry-div').hide();
                    $('#chatpage-div').show();

                    // tell the server a new user connected
                    socket.emit('user-connect', username);

                    // must display cached messages AFTER user logs in
                    // so we know which css class to add to the messages
                    displayCachedMessages();

                } else {
                    alert('This username is already taken!');
                }
            }
        )
    });*/


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


    function displayCachedMessages() {
        // get all the previous cached messages, and display
        $.get(
            '/previousMessages',
            (messages) => {
                messages.forEach(msg => {
                    appendMessage(msg);
                });

                // to prevent duplicates
                showNewMessages = true;
            }
        )
    }


    // get all the connected users and display them as online
    // Causes the username to appear twice
    $.get(
        '/getOnlineUsers',
        (usernames) => {
            usernames.forEach((user) => {
                console.log("getOnlineUsers");
                if(username == user){
                    return;
                }else{
                    addOnlineUser(user);
                }
            });
        }
    );

});


//////////////////////
// SOCKET LISTENERS //
//////////////////////
// when a new chat message is received
socket.on('chat-msg', (payload) => {
    if (showNewMessages)
        appendMessage(payload);
});


// when someone starts typing, add a typing msg to list
socket.on('is-typing', (username) => {
    $('#typing-users').append(buildTypingUserElement(username));
});

// when someone stops typing, remove their typing msg from the list
socket.on('stopped-typing', (username) => {
    var id = getTypingId(username);
    $(`#${id}`).remove();
});

// when user connects
// and add them to online users message
socket.on('user-online', (username) => {
    console.log("on user-online");
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
function appendMessage(messageObj) {

    var html;
    // if message type, figure out if this user sent it, or other user sent
    if (messageObj['type'] === 'message') {
        var msgClass = (username == messageObj['username']) ? 'user-msg' : 'other-msg';

        html =
            `<div class="msg ${msgClass}">
                <div><strong>${messageObj['username']}</strong></div>
                <div>${messageObj['message']}</div>
            </div>`;
    }
    // its an info message
    else if (messageObj['type'] === 'info') {
        html =
            `<div class="msg info-msg">
                <div>${messageObj['message']}</div>
            </div>`;
    }

    $('#messages').append(html);
}

// displays a user as online
function addOnlineUser(username) {
    console.log("Adding user: " + username);
    $('#users-list').append(buildOnlineUserElement(username));
}

function buildOnlineUserElement(username) {
    var id = getOnlineId(username);
    return `<div id="${id}">
                <span class="online-dot"></span>
                <span class="username-item" onclick="sendWhisper('${username}')" >${username}</span>
            </div>`;
}

function sendWhisper(targetUser){
    $("#chatbox").val("/w " + targetUser + " ");
    $("#chatbox").focus();
}

function buildTypingUserElement(username) {
    var id = getTypingId(username);
    var msg = getTypingText(username);

    return `<div id="${id}">${msg}</div>`;
}


// all used to build list elements
function getOnlineId(username) { return `${username}-online`; }

function getOnlineText(username) { return username; }

function getTypingId(username) { return `${username}-typing`; }

function getTypingText(username) { return `${username} is typing...`; }


window.onload = function () {
    Particles.init({
        selector: '.background',
        color: 'white'
    });
};
