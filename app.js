const express = require('express');
const app = express();
const path = require('path');
var server = require("http").Server(app);
var io = require("socket.io").listen(server);
usersLobby1 = [];
usersLobby2 = [];
connections = [];

server.listen(process.env.PORT || 3000);
console.log("Server running...");


app.use(express.static(path.join(__dirname, 'public')));

io.sockets.on('connection', function(socket){
    connections.push(socket);
    console.log('Connected: %s sockets connected', connections.length);

    socket.emit("requestLobbyForUser", function(lobby) {
        
    });

    socket.on("getUsers", function(data) {
        senduser(data);
    });

    // Disconnect
    socket.on('disconnect', function(data){

    });
    
    // Send message
    socket.on('send message', function(data){
        console.log(data.user + ': ' + data);
        io.sockets.emit('new message', {msg: data.msg, user: data.user});
    });

    // New User
    socket.on('new user', function(username, lobby, callback){
        callback(true);
        switch(lobby) {
            case 1:
                usersLobby1.push(username);
                break;

            case 2:
                usersLobby2.push(username);
                break;
            
            default:
                console.log('Invalid lobby');
                break;
        }
        senduser(lobby);
    });

    function senduser(lobby) {
        switch(lobby) {
            case 1:
                io.sockets.emit('get users', usersLobby1);
                break;

            case 2:
                io.sockets.emit('get users', usersLobby2);
                break;
            
            default:
                console.log('Invalid lobby');
                break;
        }
    }
});