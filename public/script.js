function isBlank(str) {
    return (!str || /^\s*$/.test(str));
}

$(function () {
    var socket = io.connect();
    var $messageForm = $('#messageForm');
    var $message = $('#message');
    var $chat = $('#chat');
    var $messageArea = $('#messageArea');
    var $userFormArea = $('#userFormArea');
    var $userForm = $('#userForm');
    var $users = $('#users');
    var $username = $('#username');
    var $btnLobby1 = $('#btnLobby1');
    var $btnLobby2 = $('#btnLobby2');
    var $btnLobby3 = $('#btnLobby3');
    var $btnLobby4 = $('#btnLobby4');

    socket.on('requestLobbyForUser', function(data) {
        socket.emit("getUsers", localStorage.getItem('lobby'));
    });

    $messageForm.submit(function (e) {
        e.preventDefault();
        socket.emit('send message', {msg: $message.val(), user:localStorage.getItem('username')});
        $message.val('');
    });

    socket.on('new message', function (data) {
        $chat.append(data.user + ': ' + data.msg + '\n');
    });

    $userForm.submit(function (e) {
        e.preventDefault();
        if ($username.val().replace(/\s/g, "") === "") {
            alert("No username!")
        } else {
            localStorage.setItem('username', $username.val());
            window.parent.document.getElementById('contentController').src = 'lobby/lobby.html';
            
        }

        $username.val('');
    });

    socket.on('get users', function (data) {
        // console.log(data);
        var html = '';
        for (i = 0; i < data.length; i++) {
            html += '<li class="list-group-item">' + data[i] + '</li>';

        }
        $users.html(html);
    })

    $btnLobby1.click(function (e) {
        e.preventDefault();
        console.log('join lobby 1');
        localStorage.setItem('lobby', '1');
        window.parent.document.getElementById('contentController').src = 'game/game.html';

        socket.emit('new user', localStorage.getItem('username'), localStorage.getItem('lobby'), function (data) {
            
        });
    });

    $btnLobby2.click(function (e) {
        e.preventDefault();
        console.log('join lobby 2');
        localStorage.setItem('lobby', '2');
        window.parent.document.getElementById('contentController').src = 'game/game.html';
    });

    $btnLobby3.click(function (e) {
        e.preventDefault();
        console.log('join lobby 3');
        localStorage.setItem('lobby', '3');
        window.parent.document.getElementById('contentController').src = 'game/game.html';
    });

    $btnLobby4.click(function (e) {
        e.preventDefault();
        console.log('join lobby 4');
        localStorage.setItem('lobby', '4');
        window.parent.document.getElementById('contentController').src = 'game/game.html';
    });
});