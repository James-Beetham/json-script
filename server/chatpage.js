
// global variable representing user who is logged in 
var username;

function setUsername() {

    // get the username
    username = document.getElementById("username_input").value

    // make username input screen invisible and show the chat page
    document.getElementById("entry_div").style.display = "none";
    document.getElementById("chatpage_div").style.display = "block";
}