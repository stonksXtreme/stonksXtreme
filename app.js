const express = require('express');
const app = express();
const path = require('path');
var server = require("http").Server(app);
var io = require("socket.io").listen(server);
const fs = require('fs');

usersLobby1 = [];
counterLobby1 = 0;
lobby1ingame = 0;
usersLobby2 = [];
counterLobby2 = 0;
lobby2ingame = 0;

users = [];
easy_questions = [];
hard_questions = [];
field_positions = [];
current_question = null;
current_question_hard = false;
firstStart = false;

connections = [];


console.log("Reading questions json files...");
easy_questions = JSON.parse(fs.readFileSync('json/questions_easy.json'));
hard_questions = JSON.parse(fs.readFileSync('json/questions_hard.json'));
console.log("Reading field position json file...");
field_positions = JSON.parse(fs.readFileSync('json/field_positions.json'));



server.listen(process.env.PORT || 3000);
console.log("Server running on http://localhost:3000");

app.use(express.static(path.join(__dirname, 'public')));

io.sockets.on('connection', function (socket) {

    /* ======================================================= */
    /* ======================= General ======================= */
    /* ======================================================= */

    connections.push(socket);
    console.log('Connected: %s sockets connected', connections.length);

    // Disconnect
    socket.on('disconnect', data => {
        const index = findUserIndexByName(socket.username);
        if (index >= 0) {
            //users.splice(index, 1);
            users[index].isConnected = false;
            if (users[index].activeTurn) {
                nextPlayer(index);
            }

        }

        io.sockets.emit('update', users);
        connections.splice(connections.indexOf(socket), 1);
        console.log('Disconnected: %s socket connected', connections.length)
    });

    socket.on("getUsers", function (data) {
        senduser(data);
    });

    function senduser(lobby) {
        switch (lobby) {
            case 1, '1':
                io.sockets.emit('receive_users', { lobbyId: 1, data: usersLobby1 });
                break;

            case 2, '2':
                io.sockets.emit('receive_users', { lobbyId: 2, data: usersLobby2 });
                break;

            default:
                console.log('Invalid lobby');
                break;
        }
    }

    // Send message
    socket.on('send_message', function (data) {
        console.log(data.user + ' (Lobby ' + data.lobbyId + '): ' + data.msg);
        io.sockets.emit('new_message', { lobbyId: data.lobbyId, msg: data.msg, user: data.user });
    });

    socket.on('CustomDisconnect', function (data) {
        let index;
        switch (data.lobbyId) {
            case 1, '1':
                index = usersLobby1.indexOf(data.user);
                if (index > -1) {
                    usersLobby1.splice(index, 1);
                }
                io.sockets.emit('receive_users', { lobbyId: 1, data: usersLobby1 });
                break;

            case 2, '2':
                index = usersLobby2.indexOf(data.user);
                if (index > -1) {
                    usersLobby2.splice(index, 1);
                }
                io.sockets.emit('receive_users', { lobbyId: 2, data: usersLobby2 });
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
    socket.on('new_user', function (data, callback) {
        console.log('new user');
        console.log(data);
        switch (data.lobby) {
            case 1, '1':
                if (usersLobby1.length >= 6 || lobby1ingame == 1) {
                    //socket.emit('full_lobby', {lobbyId: 1});
                    callback(false);
                    console.log('full_lobby');
                    break;
                }
                callback(true);
                usersLobby1.push(data.username);
                if (usersLobby1.length == 6) {
                    setTimeout(function () {
                        io.sockets.emit('autostart', 1);
                        lobby1ingame = 1;
                    }, 1000);
                }
                break;

            case 2, '2':
                if (usersLobby2.length >= 6 || lobby2ingame == 1) {
                    // socket.emit('full_lobby', {lobbyId: 2});
                    callback(false);
                    break;
                }
                callback(true);
                usersLobby2.push(data.username);

                if (usersLobby2.length == 6) {
                    setTimeout(function () {
                        io.sockets.emit('autostart', 2);
                        lobby2ingame = 1;
                    }, 1000);
                }
                break;

            default:
                console.log('Invalid lobby');
                callback(false);
                break;
        }
        senduser(data.lobby);
    });

    /* ======================================================= */
    /* ======================== LOBBY ======================== */
    /* ======================================================= */

    socket.on("ready_user", function (data) {
        switch (data) {
            case '1':
                counterLobby1++;
                if (counterLobby1 == usersLobby1.length && usersLobby1.length >= 3) {
                    io.sockets.emit('autostart', 1);
                    lobby1ingame = 1;
                }
                break;
            case '2':
                counterLobby2++;
                if (counterLobby2 == usersLobby2.length && usersLobby2.length >= 3) {
                    io.sockets.emit('autostart', 2);
                    lobby2ingame = 1;
                }
                break;
        }
    });

    /* ======================================================= */
    /* ======================= INGAME ======================== */
    /* ======================================================= */

    socket.on('new user', function (data, callback) {
        const colors = ["red", "green", "blue", "yellow", "black", "violet"]
        socket.username = data;
        if (!isEmptyOrSpaces(socket.username)) {
            if (getConnectedUsers() < 6) {
                const index = findUserIndexByName(socket.username);
                if (users.length === 6) {
                    if (index >= 0) {
                        // restore user
                        callback(0);
                        users[index].isConnected = true;
                        io.sockets.emit('update', users);
                    } else {
                        // lobby full
                        callback(3);
                    }
                } else {
                    if (index === -1) {
                        // new user
                        console.log("New user: " + socket.username);

                        callback(0);
                        users.push({
                            name: socket.username,
                            color: colors[users.length],
                            x: field_positions[0].x,
                            y: field_positions[0].y,
                            fieldIndex: 0,
                            isConnected: true,
                            usedEasyQuestionIndices: [],
                            usedHardQuestionIndices: [],
                            activeTurn: false
                        });
                        alignPlayers();
                    } else {
                        if (index >= 0 && !users[index].isConnected) {
                            // restore user
                            // ok
                            callback(0);
                            users[index].isConnected = true;
                            io.sockets.emit('update', users);
                        } else {
                            // user already exists
                            callback(2);
                        }
                    }
                }
            } else {
                // lobby full
                callback(3);
            }
        } else {
            // invalid username
            callback(1);
        }
        // round starts
        if (!firstStart && users.length >= 6) {
            firstStart = true;
            const random = getRandomInt(0, users.length - 1);
            nextPlayer(random);
        }
    });

    // picked up card
    socket.on('card', hard => {
        const userIndex = findUserIndexByName(socket.username);
        if (userIndex !== -1 && users[userIndex].activeTurn) {
            current_question_hard = hard;
            let random;
            let usedQuestionIndices;
            if (hard) {
                usedQuestionIndices = users[findUserIndexByName(socket.username)].usedHardQuestionIndices;
                if (usedQuestionIndices < hard_questions.length) {
                    sendChatMessage(socket.username + " hat eine schwere Karte ausgewählt.");
                    do {
                        random = getRandomInt(0, hard_questions.length);
                    }
                    while (usedQuestionIndices.includes(random))
                    usedQuestionIndices.push(random);
                    current_question = hard_questions[random];
                    socket.emit('question_return', hard_questions[random]);
                }

            } else {
                usedQuestionIndices = users[findUserIndexByName(socket.username)].usedEasyQuestionIndices;
                if (usedQuestionIndices < easy_questions.length) {
                    sendChatMessage(socket.username + " hat eine einfache Karte ausgewählt.");
                    do {
                        random = getRandomInt(0, easy_questions.length);
                    }
                    while (usedQuestionIndices.includes(random))
                    usedQuestionIndices.push(random);
                    current_question = easy_questions[random];
                    socket.emit('question_return', easy_questions[random]);
                }
            }
        }
    })

    socket.on('answer_selected', answerIndex => {
        const userIndex = findUserIndexByName(socket.username);
        if (userIndex !== -1 && users[userIndex].activeTurn) {
            const correctIndices = current_question.correctIndices;
            socket.emit('show_correct_answer', correctIndices);


            // if answer is right
            if (correctIndices.includes(parseInt(answerIndex))) {
                // waiting to see the answer before dice roll
                setTimeout(() => {
                    let steps = 0;
                    if (current_question_hard) {
                        const random1 = getRandomInt(1, 6);
                        const random2 = getRandomInt(1, 6);
                        sendChatMessage(socket.username + " hat " + random1 + " und " + random2 + " gewürfelt!");
                        socket.emit('roll_dice', [random1, random2]);
                        steps = random1 + random2;
                    } else {
                        const random = getRandomInt(1, 6);
                        sendChatMessage(socket.username + " hat " + random + " gewürfelt!");
                        socket.emit('roll_dice', [random]);
                        steps = random;
                    }


                    // wating for animation so set new position
                    setTimeout(() => {
                        const index = findUserIndexByName(socket.username)
                        if (index !== -1) {
                            if (users[index].fieldIndex + steps >= field_positions.length - 1) {
                                sendChatMessage(users[index].name + " hat gewonnen!");
                                users[index].fieldIndex = field_positions.length - 1;
                            } else {
                                users[index].fieldIndex += steps;
                            }
                            setPositionFromJson(index);
                            alignPlayers();
                        }
                    }, 3000);


                }, 3000);
            } else {
                sendChatMessage(socket.username + " hat die Frage falsch beantwortet.");
                socket.emit('roll_dice', []);
            }
        }
    })

    socket.on('next_player', data => {
        nextPlayer(findUserIndexByName(socket.username));
    })

    function findUserIndexByName(username) {
        for (let i in users) {
            if (users[i].name === username) {
                return i;
            }
        }
        return -1;
    }

    function getConnectedUsers() {
        var connected = 0;
        for (let i in users) {
            if (users[i].isConnected) {
                connected++;
            }
        }
        return connected;
    }

    function isEmptyOrSpaces(str) {
        return str === null || str.match(/^ *$/) !== null;
    }

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
        // alternative: https://www.random.org/integers/?num=1&min=1&max=6&col=1&base=10&format=plain&rnd=new
    }

    function nextPlayer(activeIndex) {
        users[activeIndex].activeTurn = false;
        if (activeIndex >= users.length - 1) {
            activeIndex = 0;
        } else {
            activeIndex++;
        }
        if (!users[activeIndex].isConnected) {
            nextPlayer(activeIndex);
        } else {
            sendChatMessage("Next turn: " + users[activeIndex].name);
            users[activeIndex].activeTurn = true;
            io.sockets.emit('update', users);
        }
    }

    function sendChatMessage(msg) {
        console.log(msg);
        io.sockets.emit('new message', { msg: msg, user: "server" });
    }

    function setPositionFromJson(index) {
        users[index].x = field_positions[users[index].fieldIndex].x;
        users[index].y = field_positions[users[index].fieldIndex].y;
    }

    function alignPlayers() {
        var fields = [];
        for (let userIndex in users) {
            if (fields[users[userIndex].fieldIndex] == null) {
                fields[users[userIndex].fieldIndex] = [userIndex];
            } else {
                fields[users[userIndex].fieldIndex].push(userIndex);
            }
        }

        for (let arrayIndex in fields) {
            if (fields[arrayIndex] !== null) {
                console.log("Auf dem Feld " + arrayIndex + " stehen folgende spieler: " + fields[arrayIndex]);
            }


            switch (fields[arrayIndex].length) {
                case 2: twoPlayersOnSameField(fields[arrayIndex]); break;
                case 3: threePlayersOnSameField(fields[arrayIndex]); break;
                case 4: fourPlayersOnSameField(fields[arrayIndex]); break;
                case 5: fivePlayersOnSameField(fields[arrayIndex]); break;
                case 6: sixPlayersOnSameField(fields[arrayIndex]); break;
                default: break;
            }
        }

        io.sockets.emit('update', users);
    }

    function twoPlayersOnSameField(userIndices) {
        for (let i in userIndices) {
            setPositionFromJson(userIndices[i]);
            switch (parseInt(i)) {
                case 0:
                    users[userIndices[i]].x -= 14;
                    users[userIndices[i]].y -= 14;
                    break;
                case 1:
                    users[userIndices[i]].x += 14;
                    users[userIndices[i]].y += 14;
                    break;
                default: break;
            }
        }
    }

    function threePlayersOnSameField(userIndices) {
        for (let i in userIndices) {
            setPositionFromJson(userIndices[i]);
            switch (parseInt(i)) {
                case 0:
                    users[userIndices[i]].y -= 20;
                    break;
                case 1:
                    users[userIndices[i]].x += 18;
                    users[userIndices[i]].y += 12;
                    break;
                case 2:
                    users[userIndices[i]].x -= 18;
                    users[userIndices[i]].y += 12;
                    break;
                default: break;
            }
        }
    }

    function fourPlayersOnSameField(userIndices) {
        for (let i in userIndices) {
            setPositionFromJson(userIndices[i]);
            const value = 18;
            switch (parseInt(i)) {
                case 0:
                    users[userIndices[i]].x += value;
                    users[userIndices[i]].y -= value;
                    break;
                case 1:
                    users[userIndices[i]].x += value;
                    users[userIndices[i]].y += value;
                    break;
                case 2:
                    users[userIndices[i]].x -= value;
                    users[userIndices[i]].y += value;
                    break;
                case 3:
                    users[userIndices[i]].x -= value;
                    users[userIndices[i]].y -= value;
                    break;
                default: break;
            }
        }
    }

    function fivePlayersOnSameField(userIndices) {
        for (let i in userIndices) {
            setPositionFromJson(userIndices[i]);
            const value = 24;
            switch (parseInt(i)) {
                case 1:
                    users[userIndices[i]].x += value;
                    users[userIndices[i]].y -= value;
                    break;
                case 2:
                    users[userIndices[i]].x += value;
                    users[userIndices[i]].y += value;
                    break;
                case 3:
                    users[userIndices[i]].x -= value;
                    users[userIndices[i]].y += value;
                    break;
                case 4:
                    users[userIndices[i]].x -= value;
                    users[userIndices[i]].y -= value;
                    break;
                default: break;
            }
        }
    }

    function sixPlayersOnSameField(userIndices) {
        for (let i in userIndices) {
            setPositionFromJson(userIndices[i]);
            switch (parseInt(i)) {
                case 0:
                    users[userIndices[i]].y -= 33;
                    break;
                case 1:
                    users[userIndices[i]].x += 27;
                    users[userIndices[i]].y -= 16;
                    break;
                case 2:
                    users[userIndices[i]].x += 27;
                    users[userIndices[i]].y += 16;
                    break;
                case 3:
                    users[userIndices[i]].y += 33;
                    break;
                case 4:
                    users[userIndices[i]].x -= 27;
                    users[userIndices[i]].y += 16;
                    break;
                case 5:
                    users[userIndices[i]].x -= 27;
                    users[userIndices[i]].y -= 16;
                    break;
                default: break;
            }
        }
    }
});
