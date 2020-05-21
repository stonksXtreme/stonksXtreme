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

    $messageForm.submit(function (e) {
        e.preventDefault();
        socket.emit('send message', $message.val());
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
            socket.emit('new user', $username.val(), function (data) {
                if (data) {
                    window.parent.document.getElementById('contentController').src = 'game/game.html';
                    console.log('join game');
                }
            });
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
});