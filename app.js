const express = require('express');
const app = express();
const path = require('path');
var server = require("http").Server(app);
var io = require("socket.io").listen(server);
users = [];
connections = [];

server.listen(process.env.PORT || 3000);
console.log("Server running...");


app.use(express.static(path.join(__dirname, 'public')));

io.sockets.on('connection', function(socket){
    connections.push(socket);
    console.log('Connected: %s sockets connected', connections.length);

    // Disconnect
    socket.on('disconnect', function(data){
        users.splice(users.indexOf(socket.username), 1);
        updateUsernames();
        connections.splice(connections.indexOf(socket), 1);
        console.log('Disconnected: %s socket connected', connections.length)
    });
    // Send message
    socket.on('send message', function(data){
        console.log(socket.username + ': ' + data);
        io.sockets.emit('new message', {msg: data, user: socket.username});
    });

    // New User
    socket.on('new user', function(data, callback){
        callback(true);
        socket.username = data;
        users.push(socket.username);
        localStorage.setItem('users', users);
        console.log('user list: ' + users);
        updateUsernames();
    });

    function updateUsernames() {
        io.sockets.emit('get users', users);
    }

});