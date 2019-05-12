// global variable representing user who is logged in 
var username;
// socket connected to server
var socket = io();

var showNewMessages = false;

var msgIndex = 0;

var usernameToImgURL;

$(function () {
    username = document.cookie.match(/username=s%3A(.*)\./)[1];

    // tell the server a new user connected
    socket.emit('user-connect', username);

    // must display cached messages AFTER user logs in
    // so we know which css class to add to the messages
    displayCachedMessages();

    $("#modal-guide").modal({ keyboard: true, show: true });

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
        // get all profile image urls
        $.get(
            '/profileURLs',
            (map) => {
                usernameToImgURL = map;

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
        )

    }


    // get all the connected users and display them as online
    // Causes the username to appear twice
    $.get(
        '/getOnlineUsers',
        (usernames) => {
            usernames.forEach((user) => {
                if (username == user) {
                    return;
                } else {
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
    var msg = messageObj['message'];
    // if message type, figure out if this user sent it, or other user sent
    if (messageObj['type'] === 'message') {

        var msgUser = messageObj['username'];
        var msgImgURL = usernameToImgURL[msgUser];
        // msgs made by current user appear on right side, all other appear on left side
        var msgClass = (username == msgUser) ? 'user-msg' : 'other-msg';    

        html =
            `<div id="msg${msgIndex}" class="msg ${msgClass}">
                <div>
                    <img class="profile-img" src="${msgImgURL}">
                    <strong>${username}</strong>
                </div>
                <div>${msg}</div>
            </div>`;
    }
    // its an info message
    else if (messageObj['type'] === 'info') {
        html =
            `<div id="msg${msgIndex}" class="msg info-msg">
                <div>${msg}</div>
            </div>`;
    }

    $('#messages').append(html);
    document.getElementById(`msg${msgIndex}`).scrollIntoView(); // make sure newest message is visible

    msgIndex++;
}

// displays a user as online
function addOnlineUser(username) {
    $('#users-list').append(buildOnlineUserElement(username));
}

function buildOnlineUserElement(username) {
    var id = getOnlineId(username);
    return `<div id="${id}">
                <span class="online-dot"></span>
                <span class="username-item" onclick="sendWhisper('${username}')" >${username}</span>
            </div>`;
}

function sendWhisper(targetUser) {
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



function logout() {
    document.cookie = "username= ; expires = Thu, 01 Jan 1970 00:00:00 GMT";
    window.location.href = "/a/login";
}