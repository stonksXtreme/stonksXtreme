/*
const express = require('express');
const path = require('path');
const app = express();

var server = require("http").Server(app);
var io = require("socket.io").listen(server);
users = [];
connections = [];

app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) => { res.sendFile('../client/index.html') });

const port = 3000;
app.listen(port, () => console.log(`stonksXtreme listening at http://localhost:${port}`));
*/

const express = require('express');
const app = express();
const path = require('path');
var server = require("http").Server(app);
var io = require("socket.io").listen(server);
users = [];
connections = [];

app.use(express.static(path.join(__dirname, '../client')));
app.get('/', function(req, res) {
    res.sendFile((__dirname + '../client/index.html'));
});

server.listen(process.env.PORT || 3000);
console.log("Server running...");

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

    // New User
    socket.on('new user', function(data, callback){
        callback(true);
        socket.username = data;
        users.push(socket.username);
        updateUsernames();
    });

    function updateUsernames() {
        io.sockets.emit('get users', users);
    }
});