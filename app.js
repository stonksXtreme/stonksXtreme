const express = require('express');
const app = express();
const path = require('path');
var server = require("http").Server(app);
var io = require("socket.io").listen(server);
connections = [];
users = [];

server.listen(process.env.PORT || 3000);
console.log("Server running on http://localhost:3000");

app.use(express.static(path.join(__dirname, 'public')));



io.sockets.on('connection', socket => {
    connections.push(socket);
    console.log('Connected: %s sockets connected', connections.length);
    connections.forEach(value => {
        console.log(value.name + ', ');
    })

    // Disconnect
    socket.on('disconnect', data => {
        users.splice(findUserIndexByName(socket.username), 1);
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
        if(users.length < 6){
            callback(true);
            socket.username = data;
            users.push({
                name: socket.username,
                color: colors[users.length],
                x: 15,
                y: 15
            });
            io.sockets.emit('update', users);
        }
    });

    // picked up card
    socket.on('card', hard => {
        var dif = "easy"
        if(hard) {
            dif = "hard"
        }

        const question = {
            text: "Hey " + socket.username + "! You have selected a " + dif + " card!",
            answers: ["A", "B", "C", "D"]
        }
        socket.emit('question_return', question);

    })

    socket.on('answer_selected', index_of_answer =>{

        if(true) {
            const random = Math.floor(Math.random() * 6) + 1; // alternative: https://www.random.org/integers/?num=1&min=1&max=6&col=1&base=10&format=plain&rnd=new
            const index = findUserIndexByName(socket.username)
            console.log(socket.username + " hat " + random + " gewürfelt!")
            if (index !== -1) {
                users[index] = {
                    name: users[index].name,
                    color: users[index].color,
                    x: users[index].x + (random * 30),
                    y: users[index].y,
                };
                io.sockets.emit('update', users);
            }
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
})
