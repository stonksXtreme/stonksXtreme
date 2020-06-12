const express = require('express');
const app = express();
const path = require('path');
var server = require("http").Server(app);
var io = require("socket.io").listen(server);
usersLobby1 = [];
counterLobby1 = 0;
usersLobby2 = [];
counterLobby2 = 0;
connections = [];

server.listen(process.env.PORT || 3000);
console.log("Server running...");


app.use(express.static(path.join(__dirname, 'public')));

io.sockets.on('connection', function(socket){

    /* ======================================================= */
    /* ======================= General ======================= */
    /* ======================================================= */

    connections.push(socket);
    console.log('Connected: %s sockets connected', connections.length);

    socket.on("getUsers", function(data) {
        senduser(data);
    });

    function senduser(lobby) {
        switch(lobby) {
            case 1, '1':
                io.sockets.emit('receive_users', {lobbyId: 1, data: usersLobby1});
                break;

            case 2, '2':
                io.sockets.emit('receive_users', {lobbyId: 2, data: usersLobby2});
                break;

            default:
                console.log('Invalid lobby');
                break;
        }
    }

    // Send message
    socket.on('send_message', function(data){
        console.log(data.user + ' (Lobby '+ data.lobbyId + '): ' + data.msg);
        io.sockets.emit('new_message', {lobbyId:data.lobbyId, msg: data.msg, user: data.user});
    });

    socket.on('CustomDisconnect', function(data) {
        console.log("disco");
        let index;
        switch(data.lobbyId) {
            case 1, '1':
                index = usersLobby1.indexOf(data.user);
                if (index > -1) {
                    usersLobby1.splice(index, 1);
                }
                io.sockets.emit('receive_users', {lobbyId: 1, data: usersLobby1});
                break;

            case 2, '2':
                index = usersLobby2.indexOf(data.user);
                if (index > -1) {
                    usersLobby2.splice(index, 1);
                }
                io.sockets.emit('receive_users', {lobbyId: 2, data: usersLobby2});
                break;

            default:
                console.log('Invalid lobby');
                break;
        }
    });
    /* ======================================================= */
    /* ======================= LOGIN ========================= */
    /* ======================================================= */



    /* ======================================================= */
    /* ==================== CHOOSE LOBBY ===================== */
    /* ======================================================= */

    // New User
    socket.on('new_user', function(data) {
        console.log('new user');
        console.log(data);
        switch(data.lobby) {
            case 1, '1':
                if (usersLobby1.length >= 6) {
                    socket.emit('full_lobby', {lobbyId: 1});
                    break;
                }
                usersLobby1.push(data.username);
                break;

            case 2, '2':
                if (usersLobby2.length >= 6) {
                    socket.emit('full_lobby', {lobbyId: 2});
                    break;
                }
                usersLobby2.push(data.username);
                break;

            default:
                console.log('Invalid lobby');
                break;
        }
        senduser(data.lobby);
    });

    /* ======================================================= */
    /* ======================== LOBBY ======================== */
    /* ======================================================= */

    socket.on("ready_user", function(data) {
        switch(data) {
            case '1':
                counterLobby1++;
                if (counterLobby1==usersLobby1.length && usersLobby1.length>=3) {
                    io.sockets.emit('autostart', 1)
                }
            case '2':
                counterLobby2++;
                if (counterLobby2==usersLobby2.length && usersLobby2.length>=3) {
                    io.sockets.emit('autostart', 2)
                }
        }
    })

    /* ======================================================= */
    /* ======================= INGAME ======================== */
    /* ======================================================= */



});
