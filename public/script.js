function isBlank(str) {
    return (!str || /^\s*$/.test(str));
}

$(function () {
    var STOAGE_USERNAME_KEY = "username";
    var STOAGE_LOBBY_ID_KEY = "lobby";

    var socket = io.connect();

    var $users = $('#users');
    var $yourUsername = $('#yourUsername');
    var $userCount = $('#UserCount');

    var $messageForm = $('#messageForm');
    var $message = $('#message');
    var $chat = $('#chat');

    var $username = $('#username');
    var $userForm = $('#userForm');


    /* ======================================================= */
    /* ======================= General ======================= */
    /* ======================================================= */

    if(sessionStorage.hasOwnProperty(STOAGE_USERNAME_KEY)) {
        $yourUsername.html(sessionStorage.getItem(STOAGE_USERNAME_KEY));
    }

    if(sessionStorage.hasOwnProperty(STOAGE_USERNAME_KEY) && sessionStorage.hasOwnProperty(STOAGE_LOBBY_ID_KEY)) {
        socket.emit('getUsers', sessionStorage.getItem(STOAGE_LOBBY_ID_KEY), function (data) {

        });
    }

    socket.on('receive_users', function (data) {
        if(data.lobbyId == sessionStorage.getItem(STOAGE_LOBBY_ID_KEY)) {
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
        socket.emit('send_message', {lobbyId: sessionStorage.getItem(STOAGE_LOBBY_ID_KEY), msg: $($message.val()).text(), user:sessionStorage.getItem(STOAGE_USERNAME_KEY)});
        $message.val('');
    });

    socket.on('new_message', function (data) {
        if(data.lobbyId == sessionStorage.getItem(STOAGE_LOBBY_ID_KEY)) {
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
            sessionStorage.setItem(STOAGE_USERNAME_KEY, $username.val());
            window.parent.document.getElementById('contentController').src = 'lobby/choose-lobby.html';
        }

        $username.val('');
    });

    /* ======================================================= */
    /* ==================== CHOOSE LOBBY ===================== */
    /* ======================================================= */

    $('button[class=lobbyButton]').click(function() {
        let buttonId = $(event.target).attr('id');
        let lobbyId = buttonId.replace(/[^\d.-]/g, ''); // get number

        console.log('join lobby ' + lobbyId);
        sessionStorage.setItem(STOAGE_LOBBY_ID_KEY, lobbyId);

        socket.emit('new_user',  {username: sessionStorage.getItem(STOAGE_USERNAME_KEY), lobby: sessionStorage.getItem(STOAGE_LOBBY_ID_KEY)}, function () {

        });

        window.parent.document.getElementById('contentController').src = 'lobby/lobby.html';
    });

    /* ======================================================= */
    /* ======================== LOBBY ======================== */
    /* ======================================================= */

    socket.on("autostart", () => {
        window.parent.document.getElementById('contentController').src = 'game/game.html';
    });

    socket.on("full_lobby", data => {
        alert("Lobby " + data.lobbyId + " is already full!");
        window.parent.document.getElementById('contentController').src = 'lobby/choose-lobby.html';
    });

    /* ======================================================= */
    /* ======================= INGAME ======================== */
    /* ======================================================= */
});
