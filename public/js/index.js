function resize(){
    if ($(window).width() > 974) {
        // desktop
        $('.fieldCard').removeClass("mobileField");
    }
    else {
        // mobile
        $('.fieldCard').addClass("mobileField");

    }
}

$(function() {
    // onload
    resize();
    let socket = io.connect();
    let $messageForm = $('#messageForm');
    let $message = $('#message');
    let $chat = $('#chat');
    let $messageArea = $('#mainArea');
    let $userFormArea = $('#userFormArea');
    let $userForm = $('#userForm');
    let $users = $('#users');
    let $username = $('#username');
    let pos = {
        x: 20,
        y: 900
    }

    let $loginAction = $('#loginAction');

    document.onkeydown = function(e) {
        switch(e.which) {
            // case 37: pos.x-=1;move();break;
            case 37: socket.emit('position_debug', -1);break;
            //case 38:pos.y-=1;move();break;
            case 38: socket.emit('position_debug', 2);break;
            // case 39:pos.x+=1;move();break;
            case 39: socket.emit('position_debug', 1);break;
            //case 40:pos.y+=1;move();break;
            case 40: socket.emit('position_debug', -2);break;
            default: return; // exit this handler for other keys
        }
        e.preventDefault(); // prevent the default action (scroll / move caret)
    };

    var canvas = document.getElementById("canvas"),
        context = canvas.getContext("2d");

    canvas.width = 1000;
    canvas.height = 1000;


    var background = new Image();
    background.src = "img/Spielbrett_small.png";

    background.onload = function() {
        context.drawImage(background, 0, 0);
    }

    function move() {
        //context.drawImage(background, 0, 0);
        //context.beginPath();
        //context.rect(pos.x-50, pos.y-1, 100, 3);
        //context.rect(pos.x-1, pos.y-50, 3, 100);
        //context.fillStyle = 'black';
        //context.fill();
        context.drawImage(background, 0, 0);
        context.beginPath();
        context.arc(pos.x, pos.y, 17, 0, 2 * Math.PI, true);
        context.fillStyle = 'white';
        context.fill();

        context.beginPath();
        context.arc(pos.x, pos.y, 15, 0, 2 * Math.PI, true);
        context.fillStyle = 'red';
        context.fill();

        console.log(pos);
    }

    $(window).resize(function() {
        resize();
    });

    socket.on('roll_dice', function(dices, showExitButton){
        if(showExitButton){
            $('.modalCloseButton').removeClass("hidden");
        }

        let html = '<div class="center">'

        if(dices.length > 0){
            $('.box').addClass("blur");
            $('#exampleModal').modal({
                keyboard: false,
                backdrop: 'static'
            });
            $('#exampleModal').modal('show');

            $('.modal-title').html('');
            html += '<video width="150" height="116" autoplay><source src="dices/animation' + dices[0] + '.mp4" type="video/mp4">Your browser does not support the video tag.</video>';
            if(dices.length === 2){
                html += '<video width="150" height="116" autoplay><source src="dices/animation' + dices[1] + '.mp4" type="video/mp4">Your browser does not support the video tag.</video>';
            }
            $('.modal-body').html(html + '</div>');
        }
    });

    socket.on('show_correct_answer', function(correctIndices){
        $('.selectedButton').addClass("redButton");

        for(let i in correctIndices){
            $('#answer'+correctIndices[i]).removeClass("redButton");
            $('#answer'+correctIndices[i]).addClass("greenButton");
        }
    });

    socket.on('question_return', function(question){
        $('.modal-title').html(question.question);

        var buttons = '';
        for(let answer in question.answers){
            buttons += '<button type="button" id="answer' + answer + '" class="btn btn-primary btn-lg btn-block onc answerButton">' + question.answers[answer] + '</button>'
        }
        $('.modal-body').html(buttons);

        $('.box').addClass("blur");

        $('#exampleModal').modal({
            keyboard: false,
            backdrop: 'static'
        });

        $(".answerButton").click(function (e){
            e.preventDefault();
            const index = this.id.replace("answer", "");
            buttons = '';
            for(let answer in question.answers){
                buttons += '<button type="button" id="answer' + answer + '" class="btn btn-secondary btn-lg btn-block onc" disabled>' + question.answers[answer] + '</button>'
            }
            $('.modal-body').html(buttons);
            $('#answer'+index).addClass("selectedButton");
            socket.emit('answer_selected', index);
        })
    });

    socket.on('update', function(users){

        var html = '';
        // draw on canvas
        context.drawImage(background, 0, 0);
        for(let i in users){
            context.beginPath();
            context.arc(users[i].x, users[i].y, 17, 0, 2 * Math.PI, true);
            context.fillStyle = 'white';
            context.fill();

            context.beginPath();
            context.arc(users[i].x, users[i].y, 15, 0, 2 * Math.PI, true);
            context.fillStyle = users[i].color;
            context.fill();

            // update list
            if(users[i].activeTurn) {
                html += '<li style="background-color: '+ users[i].color + '" class="list-group-item">'+users[i].name+' (Active)</li>';
            }else{
                if(users[i].isConnected){
                    html += '<li style="background-color: '+ users[i].color + '" class="list-group-item">'+users[i].name+'</li>';
                }else{
                    html += '<li style="background-color: '+ users[i].color + '" class="list-group-item">'+users[i].name+' (Offline)</li>';
                }
            }
        }

        $users.html(html);
    });

    socket.on('refresh_page', function(users){
        location.reload();
    });

    $messageForm.submit(function(e) {
        e.preventDefault();
        socket.emit('send message', $message.val());
        $message.val('');
    });

    socket.on('new message', function(data) {
        if (data.user === "server"){
            $chat.append(data.msg+'\n');
        }else{
            $chat.append(data.user+': '+data.msg+'\n');
        }

        const chat = document.querySelector('#chat')
        chat.scrollTop = chat.scrollHeight;
    });

    $('#loginJoinBtn').click(function() {
        if($username.val().trim() === ""){
            alert("Invalid Username")
        }else{
            socket.emit('new user', $username.val(), $('#lobbyId').val(), function(error_Code) {
                switch (error_Code) {
                    case 0: $('.loginContent').hide(); $('.mainContent').show(); break;
                    case 1: alert("Invalid Username"); break;
                    case 2: alert("Username already in use"); break;
                    case 3: alert("Lobby full"); break;
                }
            });
        }
    });

    $('#createLink').click(function() {
        $('label[for="lobbyId"], #lobbyId').toggle();
        $('#lobbyId').next('br').toggle();
        $loginAction.text($loginAction.text() === 'Join game...' ? 'Create game...' : 'Join game...');
        $('#createLink').text($loginAction.text() === 'Join game...' ? 'Create' : 'Join');
        $('#loginJoinBtn').val($loginAction.text() === 'Join game...' ? 'Join' : 'Create');
    });

    $(".easy_card").click(function (e){
        e.preventDefault();
        socket.emit('card', false);
    })

    $(".hard_card").click(function (e){
        e.preventDefault();
        socket.emit('card', true);
    })

    $(".modalCloseButton").click(function (e){
        $('.box').removeClass("blur");
        $('.modalCloseButton').addClass("hidden");
        socket.emit('next_player', null);
    })

});
