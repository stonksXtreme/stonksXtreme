function isBlank(str) {
    return (!str || /^\s*$/.test(str));
}

$(function () {
    var socket = io.connect();
    var $messageForm = $('#messageForm');
    var $message = $('#message');
    var $chat = $('#chat');
    var $users = $('#users');

    $messageForm.submit(function (e) {
        e.preventDefault();
        socket.emit('send message', $message.val());
        $message.val('');
    });

    socket.on('new message', function (data) {
        $chat.append(data.user + ': ' + data.msg + '\n');
    });

    socket.on('get users', function (data) {
        var html = '';
        for (i = 0; i < data.length; i++) {
            html += '<li class="list-group-item">' + data[i] + '</li>';

        }
        $users.html(html);
    })
});