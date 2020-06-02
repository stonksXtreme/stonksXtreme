const express = require('express');
const app = express();
const path = require('path');
const server = require("http").Server(app);
const io = require("socket.io").listen(server);
const fs = require('fs');

connections = [];
users = [];
easy_questions = [];
hard_questions = [];
field_positions = [];
current_question = null;

console.log("Reading questions json files...");
easy_questions = JSON.parse(fs.readFileSync('json/questions_easy.json'));
hard_questions = JSON.parse(fs.readFileSync('json/questions_hard.json'));
console.log("Reading field position json file...");
field_positions = JSON.parse(fs.readFileSync('json/field_positions.json'));



server.listen(process.env.PORT || 3000);
console.log("Server running on http://localhost:3000");

app.use(express.static(path.join(__dirname, 'public')));



io.sockets.on('connection', socket => {
    connections.push(socket);
    console.log('Connected: %s sockets connected', connections.length);

    // Disconnect
    socket.on('disconnect', data => {
        const index = findUserIndexByName(socket.username);
        if(index >= 0){
            //users.splice(index, 1);
            users[index].isConnected = false;
        }

        io.sockets.emit('update', users);
        connections.splice(connections.indexOf(socket), 1);
        console.log('Disconnected: %s socket connected', connections.length)
    });
    // Send message
    socket.on('send message', data => {
        console.log(socket.username + ': ' + data);
        io.sockets.emit('new message', {msg: data, user: socket.username});
    });

    // New User
    socket.on('new user', function(data, callback){
        const colors = ["red", "green", "blue", "gray", "pink", "violet"]
        socket.username = data;
        if(!isEmptyOrSpaces(socket.username)){
            if(getConnectedUsers() < 6){
                const index = findUserIndexByName(socket.username);
                if(users.length === 6){
                    if(index >= 0){
                        // restore user
                        callback(0);
                        users[index].isConnected = true;
                        io.sockets.emit('update', users);
                    }else{
                        // lobby full
                        callback(3);
                    }
                }else{
                    if(index === -1){
                        // new user

                        callback(0);
                        users.push({
                            name: socket.username,
                            color: colors[users.length],
                            x: field_positions[0].x,
                            y: field_positions[0].y,
                            fieldIndex: 0,
                            isConnected: true,
                            usedEasyQuestionIndices: [],
                            usedHardQuestionIndices: []
                        });
                        io.sockets.emit('update', users);
                    }else{
                        if(index >= 0 && !users[index].isConnected){
                            // restore user
                            // ok
                            callback(0);
                            users[index].isConnected = true;
                            io.sockets.emit('update', users);
                        }else{
                            // user already exists
                            callback(2);
                        }
                    }
                }
            }else{
                // lobby full
                callback(3);
            }
        }else{
            // invalid username
            callback(1);
        }
    });

    // picked up card
    socket.on('card', hard => {

        let random;
        let usedQuestionIndices;
        if(hard) {
            usedQuestionIndices = users[findUserIndexByName(socket.username)].usedHardQuestionIndices;
            if(usedQuestionIndices < hard_questions.length){
                do{
                    random = Math.floor(Math.random() * hard_questions.length);
                }
                while (usedQuestionIndices.includes(random))
                usedQuestionIndices.push(random);
                current_question = hard_questions[random];
                socket.emit('question_return', hard_questions[random]);
            }

        }else{
            usedQuestionIndices = users[findUserIndexByName(socket.username)].usedEasyQuestionIndices;
            if(usedQuestionIndices < easy_questions.length){
                do{
                    random = Math.floor(Math.random() * easy_questions.length);
                }
                while (usedQuestionIndices.includes(random))
                usedQuestionIndices.push(random);
                current_question = easy_questions[random];
                socket.emit('question_return', easy_questions[random]);
            }
        }




    })

    socket.on('answer_selected', answerIndex =>
    {
        const correctIndex = current_question.correctIndex;
        socket.emit('show_correct_answer', correctIndex);



        if(correctIndex === parseInt(answerIndex)) {
            // waiting to see the answer before dice roll
            setTimeout(() => {
                const random = Math.floor(Math.random() * 6) + 1; // alternative: https://www.random.org/integers/?num=1&min=1&max=6&col=1&base=10&format=plain&rnd=new
                console.log(socket.username + " hat " + random + " gewürfelt!")
                socket.emit('roll_dice', [random, 6]);

                // wating for animation so set new position
                setTimeout(() => {
                    const index = findUserIndexByName(socket.username)
                    if (index !== -1) {
                        users[index].fieldIndex+=random;
                        users[index].x = field_positions[users[index].fieldIndex].x;
                        users[index].y = field_positions[users[index].fieldIndex].y;
                        io.sockets.emit('update', users);
                    }
                }, 3000);


            }, 3000);
        }else{
            socket.emit('roll_dice', []);
        }
    })
    
    function findUserIndexByName(username) {
        for(let i in users){
            if(users[i].name === username){
                return i;
            }
        }
        return -1;
    }

    function getConnectedUsers() {
        var connected = 0;
        for(let i in users){
            if(users[i].isConnected){
                connected++;
            }
        }
        return connected;
    }

    function isEmptyOrSpaces(str){
        return str === null || str.match(/^ *$/) !== null;
    }
})
