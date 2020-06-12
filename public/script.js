function isBlank(str) {
    return (!str || /^\s*$/.test(str));
}

$(function () {
    var STORAGE_USERNAME_KEY = "username";
    var STORAGE_LOBBY_ID_KEY = "lobby";

    var socket = io.connect();

    var $users = $('#users');
    var $yourUsername = $('#yourUsername');
    var $userCount = $('#UserCount');

    var $messageForm = $('#messageForm');
    var $message = $('#message');
    var $chat = $('#chat');

    var $username = $('#username');
    var $userForm = $('#userForm');

    let $adjectives = [];

    fetch("/adjectives.json").then(response => response.json()).then(json =>  {
        json.adjectives.forEach(element => {
            $adjectives.push(element);
        });
    });
        

    /* ======================================================= */
    /* ======================= General ======================= */
    /* ======================================================= */

    document.addEventListener("beforeunload", e => {
        // e.preventDefault();
        e.returnValue = "";
        socket.emit('CustomDisconnect', {lobbyId: sessionStorage.getItem(STORAGE_LOBBY_ID_KEY), user:sessionStorage.getItem(STORAGE_USERNAME_KEY)});
    });

    if(sessionStorage.hasOwnProperty(STORAGE_USERNAME_KEY)) {
        $yourUsername.html(sessionStorage.getItem(STORAGE_USERNAME_KEY));
    }

    if(sessionStorage.hasOwnProperty(STORAGE_USERNAME_KEY) && sessionStorage.hasOwnProperty(STORAGE_LOBBY_ID_KEY)) {
        socket.emit('getUsers', sessionStorage.getItem(STORAGE_LOBBY_ID_KEY), function (data) {

        });
    }

    socket.on('receive_users', function (data) {
        if(data.lobbyId == sessionStorage.getItem(STORAGE_LOBBY_ID_KEY)) {
            var html = '';
            for (i = 0; i < data.data.length; i++) {
                html += '<li class="list-group-item">' + data.data[i] + '</li>';

            }
            $users.html(html);
            $userCount.html(data.data.length + ' / 6');
        }
    });

    $messageForm.submit(function (e) {
        e.preventDefault();
        socket.emit('send_message', {lobbyId: sessionStorage.getItem(STORAGE_LOBBY_ID_KEY), msg: $("<p>"+$message.val()+"</p>").text(), user:sessionStorage.getItem(STORAGE_USERNAME_KEY)});
        $message.val('');
    });

    socket.on('new_message', function (data) {
        if(data.lobbyId == sessionStorage.getItem(STORAGE_LOBBY_ID_KEY)) {
            $chat.append('<b>'+data.user+'</b>'+': '+data.msg+'<br>');
        }
    });

    /* ======================================================= */
    /* ======================= LOGIN ========================= */
    /* ======================================================= */

    $userForm.submit(function (e) {
        e.preventDefault();
        if ($username.val().replace(/\s/g, "") === "") {
            alert("No username!")
        }
        else {
            console.log("Test")
            sessionStorage.setItem(STORAGE_USERNAME_KEY, $username.val());
            document.getElementById("loginContent").style.display = "none";
            document.getElementById("chooseLobby").style.display = "block";
        }
    });

    /* ======================================================= */
    /* ==================== CHOOSE LOBBY ===================== */
    /* ======================================================= */

    $('button[class=lobbyButton]').click(function() {
        let buttonId = $(event.target).attr('id');
        let lobbyId = buttonId.replace(/[^\d.-]/g, ''); // get number

        console.log('join lobby ' + lobbyId);
        sessionStorage.setItem(STORAGE_LOBBY_ID_KEY, lobbyId);

        sessionStorage.setItem(STORAGE_USERNAME_KEY, $adjectives[Math.floor(Math.random() * $adjectives.length)] + "_" + sessionStorage.getItem(STORAGE_USERNAME_KEY)); // returns a random integer from 1 to 100 ]
        socket.emit('new_user',  {username: sessionStorage.getItem(STORAGE_USERNAME_KEY), lobby: sessionStorage.getItem(STORAGE_LOBBY_ID_KEY)}, function (callback) {
            if(callback) {
                document.getElementById("chooseLobby").style.display = "none";
                document.getElementById("lobby").style.display = "block";
            }
            else {
                alert("Lobby is already full!");
                window.parent.document.getElementById('contentController').src = 'lobby/choose-lobby.html';
            }
        });

        
    });

    /* ======================================================= */
    /* ======================== LOBBY ======================== */
    /* ======================================================= */

    $('button[class=rdyBtn]').click(function() {

        // sessionStorage.setItem(STORAGE_LOBBY_ID_KEY, lobbyId);

        socket.emit('ready_user',  sessionStorage.getItem(STORAGE_LOBBY_ID_KEY), function () {
            
        });

        window.parent.document.getElementById('contentController').contentWindow.document.getElementById('usrRdyBtn').style.visibility = "hidden";
    });

    socket.on("autostart", data => {
        if(data == sessionStorage.getItem(STORAGE_LOBBY_ID_KEY)) {
            window.parent.document.getElementById('contentController').src = 'game/game.html';
        }
    });

    /* ======================================================= */
    /* ======================= INGAME ======================== */
    /* ======================================================= */
});
