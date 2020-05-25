function isBlank(str) {
    return (!str || /^\s*$/.test(str));
}

function getPing() {
    var startTime = new Date();
    var img = new  Image();
    var random_string = Math.random().toString();
    img.src = "/img/1x1.gif?" + random_string;
    img.onload = function() {
        var endTime = new Date();
        var ping = endTime. getTime() - startTime.getTime();
        alert(img.src + " loaded in " + ping + " ms");
    }
}


$(function() {
    var socket = io.connect();
    var $messageForm = $('#messageForm');
    var $message = $('#message');
    var $chat = $('#chat');
    var $messageArea = $('#messageArea');
    var $userFormArea = $('#userFormArea');
    var $userForm = $('#userForm');
    var $users = $('#users');
    var $userCount = $('#UserCount');
    var $username = $('#username');
    var $readyForm = $('#readyForm');
    var $readyBTN = $('#readyBTN');

    $messageForm.submit(function(e) {
        e.preventDefault();
        if($message.val() === "") {
        } else {
            socket.emit('send message', $message.val());
            $message.val('');
        }
    });

    $readyForm.submit(function(e) {
        e.preventDefault();
        if($readyBTN.val() === "Ready?") {
            socket.emit('user ready', "1");
            $readyBTN.val('Not ready?');
            $readyBTN.removeClass("ready");
            $readyBTN.addClass("notready");
        }else{
            socket.emit('user ready', "0");
            $readyBTN.val('Ready?');
            $readyBTN.removeClass("notready");
            $readyBTN.addClass("ready");
        }
    });

    socket.on('new message', function(data) {
        $chat.append('<b>'+data.user+'</b>'+': '+data.msg+'<br>');
    });

    $userForm.submit(function(e) {
        e.preventDefault();
        if($username.val().replace(/\s/g,"") === ""){
        alert("No username!")
        }else{
        socket.emit('new user', $username.val(), function(data) {
            if(data) {
            $('.loginContent').hide();
            $('.mainContent').show();
            }
        });
        }

        $username.val('');
    });

    socket.on('get users', function(data) {
        var html = '';
        for(i = 0; i<data.length;i++){
            html += '<li class="list-group-item">'+data[i]+'</li>';
        }
        $users.html(html);
        $userCount.html(data.length + ' / 6')
    })
});