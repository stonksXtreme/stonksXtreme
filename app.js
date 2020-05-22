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

    // Disconnect
    socket.on('disconnect', data => {
        //positions.splice(positions.name.indexOf(socket.username), 1);
        updateUsernames();
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
        if(users.length < 6){
            callback(true);
            socket.username = data;
            users.push({
                name: socket.username,
                color: "",
                x: 0,
                y: 0
            });
            updateUsernames();
        }
    });

    const colors = ["red", "green", "blue", "gray", "pink", "violet"]

    function updateUsernames() {


        for(let i in users){

            var position = {
                name: users[i].name,
                color: colors[i],
                x: 15 + i*30,
                y: 15,
            }

            users[i] = position;
        }

        console.log(users);

        io.sockets.emit('update', users);


    }
})