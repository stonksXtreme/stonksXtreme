function isBlank(str) {
    return (!str || /^\s*$/.test(str));
}

$(function () {
    var socket = io.connect();
    var $userForm = $('#userForm');
    var $username = $('#username');

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
});