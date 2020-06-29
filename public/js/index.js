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
    let username;
    const socket = io.connect();
    const $messageForm = $('.messageForm');
    const $message = $('#message');
    const $waiting_message = $('#waiting-message');
    const $chat = $('.chatWindow');
    const $messageArea = $('#mainArea');
    const $userFormArea = $('#userFormArea');
    const $userForm = $('#userForm');
    const $users = $('#users');
    const $waiting_users = $('#waiting-users');
    const $username = $('#username');
    const $ready_button = $("#readyButton");
    var pos = {
        x: 20,
        y: 900
    }

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

    socket.on('roll_dice', function(dices, showExitButton, nextPlayerAfterClose){
        if(showExitButton){
            $('.modalCloseButton').removeClass("hidden");
        }

        document.getElementById('closeModal').onclick = function (ev) {
            $('.box').removeClass("blur");
            $('.modalCloseButton').addClass("hidden");
            if(nextPlayerAfterClose){
                socket.emit('next_player', null);
            }
        }

        let html = '<div class="center">'

        if(dices.length > 0){
            $('.modal-content').removeClass("question-modal");
            $('.modal-dialog').removeClass("modal-lg");
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

    socket.on('question_return', function(question, hard, questionIndex){
        $('.modal-content').addClass("question-modal");
        $('.modal-dialog').addClass("modal-lg");
        $('.modal-title').html('<button type="button" class="btn btn-outline-primary btn-lg btn-block question-field" disabled>' +question.question+ '</button>');

        let buttons = '';
        for(let answer in question.answers){
            buttons += '<button type="button" id="answer' + answer + '" class="btn btn-outline-primary btn-lg btn-block onc answerButton">' + question.answers[answer] + '</button>'
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
                buttons += '<button type="button" id="answer' + answer + '" class="btn btn-outline-primary btn-lg btn-block onc answerButton" disabled>' + question.answers[answer] + '</button>'
            }
            $('.modal-body').html(buttons);
            $('#answer'+index).addClass("selectedButton");
            socket.emit('answer_selected', index, hard, questionIndex);
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
            if(users[i].isReady){
                html += '<li style="background-color: '+ users[i].color + '" class="list-group-item">'+users[i].name+' (Bereit)</li>';
            }else{
                if(users[i].picksPlayer){
                    html += '<li style="background-color: '+ users[i].color + '" class="list-group-item">'+users[i].name+' (Wählt Spieler)</li>';
                }else{
                    if(users[i].activeTurn) {
                        html += '<li style="background-color: '+ users[i].color + '" class="list-group-item">'+users[i].name+' (Am Zug)</li>';
                        if(users[i].name === username){
                            playAudio();
                        }
                    }else{
                        if(!users[i].isConnected){
                            html += '<li style="background-color: '+ users[i].color + '" class="list-group-item">'+users[i].name+' (Offline)</li>';
                        }else{
                            html += '<li style="background-color: '+ users[i].color + '" class="list-group-item">'+users[i].name+'</li>';
                        }
                    }
                }
            }
        }

        $users.html(html);
        $waiting_users.html(html);
        $('#player_count').text(users.length + ' Spieler');
    });

    socket.on('refresh_page', function(){
        location.reload();
    });

    socket.on('allow_identity_switch', function (users) {
        var html = "";
        for(let i in users) {
            if(users[i].picksPlayer){
                html += '<li style="background-color: '+ users[i].color + '" class="list-group-item">'+users[i].name+' (Wählt Spieler)</li>';
            }else{
                if(users[i].activeTurn) {
                    html += '<li style="background-color: '+ users[i].color + '" class="list-group-item">'+users[i].name+' (Am Zug)</li>';
                }else{
                    if(users[i].isConnected){
                        html += '<li id-index='+i+' style="background-color: '+ users[i].color + '" class="list-group-item item-switch-id">'+users[i].name+'</li>';
                    }else{
                        html += '<li id-index='+i+' style="background-color: '+ users[i].color + '" class="list-group-item item-switch-id">'+users[i].name+' (Offline)</li>';
                    }
                }
            }
        }
        $users.html(html);

        $(".item-switch-id").click(function (e){
            e.preventDefault()
            var index = $( this ).attr("id-index");
            socket.emit("selected_player_to_switch", parseInt(index));
        });
    });

    socket.on('start_game', function () {
        $('.waitingContent').hide(); $('.mainContent').show();
    });

    $messageForm.submit(function(e) {
        e.preventDefault();
        socket.emit('send message', ($message.val() + $waiting_message.val()));
        $message.val('');
        $waiting_message.val('');
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
        username = $username.val();
        if($username.val().trim() === ""){
            alert("Invalid Username")
        }else{
            socket.emit('join_room', $username.val(), $('#lobbyId').val(), function(error_Code, room) {
                switch (error_Code) {
                    case 0: $('.loginContent').hide(); $('.mainContent').show(); break;
                    case 1: alert("Ungüliger Spitzname"); break;
                    case 2: alert("Dieser Spitzname wird bereits verwendet!"); break;
                    case 3: alert("Dieser Room ist voll!"); break;
                    case 4: alert("Raum existiert nicht! Bitte erstelle einen neuen."); break;
                    case 5: $('.loginContent').hide(); $('.waitingContent').show(); break;
                }
                if(room !== null){
                    $('.navbar-text').text('Raum ' + room);
                }
            });
        }
    });

    $('#loginCreateBtn').click(function() {
        username = $username.val();
        if($username.val().trim() === ""){
            alert("Invalid Username")
        }else{
            socket.emit('create_room', $username.val(), function(error_Code, room) {
                switch (error_Code) {
                    case 0: $('.loginContent').hide(); $('.waitingContent').show(); break;
                    case 1: alert("Ungüliger Spitzname"); break;
                }
                if(room !== null){
                    $('.navbar-text').text('Raum ' + room);
                }
            });
        }
    });

    $(".easy_card").click(function (e){
        e.preventDefault();
        socket.emit('card', false);
    })

    $(".hard_card").click(function (e){
        e.preventDefault();
        socket.emit('card', true);
    })

    $ready_button.click(function (e){
        e.preventDefault();
        socket.emit('toggle_ready_state', function (ready) {
            console.log(ready);
            if(ready){
                $ready_button.val('Muss los')
            }else{
                $ready_button.val('Bereit')
            }
        });
    })

    $('#leaveButton').click(function (e) {
        location.reload();
    })

    function playAudio() {
        const audio = new Audio('img/next.mp3');
        audio.volume = 0.5;
        audio.play();
    }

});
