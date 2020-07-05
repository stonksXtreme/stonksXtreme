const express = require('express');
const app = express();
const path = require('path');
const server = require("http").Server(app);
const io = require("socket.io").listen(server);
const fs = require('fs');

const devMode = (process.env.NODE_ENV === 'DEV');

connections = [];
users = [];
roomState = new Map();

easy_questions = [];
hard_questions = [];
field_positions = [];
const colors = ["red", "green", "blue", "yellow", "black", "violet"];

console.log("Reading questions json files...");
easy_questions = JSON.parse(fs.readFileSync('json/questions_easy.json'));
hard_questions = JSON.parse(fs.readFileSync('json/questions_hard.json'));
console.log("Reading field position json file...");
field_positions = JSON.parse(fs.readFileSync('json/field_positions.json'));

if (devMode) {
    console.log("Development Mode is enabled!!!");
}


server.listen(process.env.PORT || 3000);
console.log("Server running on http://localhost:3000");

app.use(express.static(path.join(__dirname, 'public')));

io.sockets.on('connection', socket => {
    connections.push(socket);
    console.log('Connected: %s sockets connected', connections.length);

    // Disconnect
    socket.on('disconnect', data => {
        if(socket.room !== undefined){
            const index = findUserIndexByName(socket.username);
            if (index >= 0) {
                if(roomState.get(socket.room)){
                    // if room is running
                    getUsers()[index].isConnected = false;
                    if (getUsers().filter(user => !user.isConnected).length === getUsers().length) {
                        endGame();
                    } else {
                        if (getUsers()[index].activeTurn) {
                            nextPlayer(index);
                        }
                    }
                }else{
                    io.sockets.to(socket.room).emit('new message', {msg: socket.username + ' hat den Raum verlassen.', user: "server"});
                    users = users.filter(value => !(value.name === socket.username && value.room === socket.room));
                    if(getUsers().length === 0){
                        endGame();
                    }
                }
                recolorPlayers();
            }
            io.sockets.to(socket.room).emit('update', getUsers());
        }
        connections.splice(connections.indexOf(socket), 1);
        console.log('Disconnected: %s socket connected', connections.length);
    });

    // Send message
    socket.on('send message', message => {
        if(!isEmptyOrSpaces(message) && message.length <= 200){
            console.log(socket.room + '-> ' + socket.username + ': ' + message);
            io.sockets.to(socket.room).emit('new message', {msg: message, user: socket.username});

            if (devMode) {
                const user = getUsers().find(x => x.activeTurn);
                switch (message) {
                    case '/next': nextPlayer(findUserIndexByName(user.name)); break;
                    case '/start': startGame(); break;
                }
            }
        }
    });

    socket.on('create_room', (username, callback) => {
        socket.username = username.replace(/\s/g, '');
        socket.room = getRandomInt(1000, 9999);
        roomState.set(socket.room, false);
        socket.join(socket.room);
        if (!isEmptyOrSpaces(socket.username) && socket.username.length <= 20) {
            const index = findUserIndexByName(socket.username);
            if (index === -1) {
                // new user
                console.log("New user: " + socket.username + ' in ' + socket.room);
                callback(0, socket.room);
                addUser();
                io.sockets.to(socket.room).emit('update', getUsers());
            }
        } else {
            // invalid username
            callback(1, null);
        }
    });

    // New User
    socket.on('join_room', (username, room, callback) => {
        socket.username = username.replace(/\s/g, '');
        socket.room = parseInt(room);
        socket.join(room);
        if (!isEmptyOrSpaces(socket.username) && socket.username.length <= 20) {
            if(doesRoomExists(socket.room)){
                if (getConnectedUsers() < 6) {
                    const index = findUserIndexByName(socket.username);
                    if (getUsers().length === 6) {
                        if (index >= 0) {
                            // restore user
                            callback(0, socket.room);
                            getUsers()[index].isConnected = true;
                            io.sockets.to(socket.room).emit('update', getUsers());
                        } else {
                            // lobby full
                            callback(3, null);
                        }
                    } else {
                        if (index === -1) {
                            // new user
                            console.log("New user: " + socket.username);

                            if(roomState.get(socket.room)){
                                callback(0, socket.room);
                            }else{
                                callback(5, socket.room);
                            }

                            addUser();

                            alignPlayers();
                        } else {
                            if (index >= 0 && !getUsers()[index].isConnected) {
                                // restore user
                                // ok
                                callback(0, socket.room);
                                getUsers()[index].isConnected = true;
                                io.sockets.to(socket.room).emit('update', getUsers());
                            } else {
                                // user already exists
                                callback(2, null);
                            }
                        }
                    }
                } else {
                    // lobby full
                    callback(3, null);
                }
            }else{
                // lobby does not exist
                callback(4, null);
            }
        } else {
            // invalid username
            callback(1, null);
        }
    });

    // picked up card
    socket.on('card', hard => {
        const userIndex = findUserIndexByName(socket.username);
        if (userIndex !== -1 && getUsers()[userIndex].activeTurn && !getUsers()[userIndex].inJail && !getUsers()[userIndex].picksPlayer) {
            let random;
            if (hard) {
                let usedQuestionIndices = getUsers()[findUserIndexByName(socket.username)].usedHardQuestionIndices;
                if (usedQuestionIndices.length < hard_questions.length) {
                    sendChatMessage(socket.username + " hat eine schwere Karte gezogen.");
                    do {
                        random = getRandomInt(0, hard_questions.length);
                    }
                    while (usedQuestionIndices.includes(random));
                    usedQuestionIndices.push(random);
                    socket.emit('question_return', hard_questions[random], hard, random);
                }

            } else {
                let usedQuestionIndices = getUsers()[findUserIndexByName(socket.username)].usedEasyQuestionIndices;
                if (usedQuestionIndices.length < easy_questions.length) {
                    sendChatMessage(socket.username + " hat eine einfache Karte gezogen.");
                    do {
                        random = getRandomInt(0, easy_questions.length);
                    }
                    while (usedQuestionIndices.includes(random))
                    usedQuestionIndices.push(random);
                    socket.emit('question_return', easy_questions[random], hard, random);
                }
            }
        }
    })

    socket.on('answer_selected', (answerIndex , hard, questionIndex) => {
        const userIndex = findUserIndexByName(socket.username);
        if (userIndex !== -1 && getUsers()[userIndex].activeTurn) {
            let correctIndices;
            if(hard){
                correctIndices = hard_questions[questionIndex].correctIndices;
            }else{
                correctIndices = easy_questions[questionIndex].correctIndices;
            }

            socket.emit('show_correct_answer', correctIndices);


            // if answer is right
            if (correctIndices.includes(parseInt(answerIndex))) {
                // waiting to see the answer before dice roll
                setTimeout(() => {
                    let steps = 0;
                    if (hard) {
                        const random1 = getRandomInt(1, 6);
                        const random2 = getRandomInt(1, 6);
                        steps = random1 + random2;

                        sendChatMessage(socket.username + " hat " + random1 + " und " + random2 + " gewürfelt!");
                        socket.emit('roll_dice', [random1, random2], true, isTargetIdentityChange(userIndex, steps));

                    } else {
                        const random = getRandomInt(1, 6);
                        steps = random;
                        sendChatMessage(socket.username + " hat " + random + " gewürfelt!");
                        socket.emit('roll_dice', [random], true, isTargetIdentityChange(userIndex, steps));
                    }

                    // wating for animation so set new position
                    setTimeout(() => {
                        setPosition(userIndex, steps);
                    }, 3500);
                }, 3000);
            } else {
                sendChatMessage(socket.username + " hat die Frage falsch beantwortet.");
                if (getUsers()[userIndex].fieldIndex === 33) {
                    sendChatMessage(socket.username + " zurück auf Start!");
                    setPosition(userIndex, -getUsers()[userIndex].fieldIndex);
                }
                socket.emit('roll_dice', [], true, true);
            }
        }
    })

    socket.on('next_player', data => {
        nextPlayer(findUserIndexByName(socket.username));
    })

    socket.on('position_debug', steps => {
        if (devMode) {
            const userIndex = findUserIndexByName(socket.username);
            setPosition(userIndex, steps);
        }
    })

    socket.on("selected_player_to_switch", index => {
        let indexFrom = findUserIndexByName(socket.username);
        let fieldIndex = getUsers()[indexFrom].fieldIndex;
        getUsers()[indexFrom].fieldIndex = getUsers()[index].fieldIndex;
        getUsers()[index].fieldIndex = fieldIndex;
        if (getUsers()[index].inJail) {
            getUsers()[index].injail = false;
            getUsers()[indexFrom].inJail = true;
        }
        setPositionFromJson(indexFrom);
        setPositionFromJson(index);
        sendChatMessage(getUsers()[indexFrom].name +  " tauschte den Platz mit " + getUsers()[index].name);
        alignPlayers();
        nextPlayer(indexFrom);
    })

    socket.on('toggle_ready_state', callback => {
        const userIndex = findUserIndexByName(socket.username);
        getUsers()[userIndex].isReady= !getUsers()[userIndex].isReady;
        callback(getUsers()[userIndex].isReady);
        io.sockets.to(socket.room).emit('update', getUsers());

        // everybody is ready and more than 2 players
        if(getUsers().filter(user => user.isReady).length === getUsers().length && getUsers().length > 2){
            startGame();
        }
    })

    function recolorPlayers() {
        for (let i in getUsers()) {
            getUsers()[i].color = colors[i];
        }
    }

    function startGame() {
        getUsers().forEach(user => {
            user.isReady = false;
        })
        roomState.set(socket.room, true);
        io.sockets.to(socket.room).emit('update', getUsers());
        io.sockets.to(socket.room).emit('start_game');
        nextPlayer(getRandomInt(0, getUsers().length - 1));
    }

    function findUserIndexByName(username) {
        for (let i in getUsers()) {
            if (getUsers()[i].name.toLowerCase() === username.toLowerCase() ) {
                return i;
            }
        }
        return -1;
    }

    function doesRoomExists(room) {
        return users.some(value => value.room == room);
    }

    function addUser() {
        users.push({
            name: socket.username,
            color: colors[getUsers().length],
            x: field_positions[0].x,
            y: field_positions[0].y,
            fieldIndex: 0,
            isConnected: true,
            usedEasyQuestionIndices: [],
            usedHardQuestionIndices: [],
            activeTurn: false,
            inJail: false,
            fibuRounds: 0,
            picksPlayer: false,
            room: socket.room,
            isReady: false
        });
        io.sockets.to(socket.room).emit('new message', {msg: socket.username + ' ist dem Raum beigetreten.', user: "server"});
    }

    function isTargetIdentityChange(userIndex, steps) {
        const position =  getUsers()[userIndex].fieldIndex + steps
        if(position === 31){
            return false;
        }
        else if(position >= field_positions.length - 1){
            return false;
        }
        else{
            return true;
        }
    }

    function getConnectedUsers() {
        let connected = 0;
        for (let i in getUsers()) {
            if (getUsers()[i].isConnected) {
                connected++;
            }
        }
        return connected;
    }

    function isEmptyOrSpaces(str) {
        return str === null || str.match(/^ *$/) !== null;
    }

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max + 1 - min)) + min;
    }

    function nextPlayer(activeIndex) {
        //socket.emit('roll_dice', [5], false);
        getUsers()[activeIndex].activeTurn = false;
        getUsers()[activeIndex].picksPlayer = false;
        if (activeIndex >= getUsers().length - 1) {
            activeIndex = 0;
        } else {
            activeIndex++;
        }
        if (!getUsers()[activeIndex].isConnected) {
            nextPlayer(activeIndex);
        } else if (getUsers()[activeIndex].fibu_rounds > 0) {
            getUsers()[activeIndex].fibu_rounds--;
            sendChatMessage(getUsers()[activeIndex].name + " hat noch " + getUsers()[activeIndex].fibu_rounds + " Runden FiBu!");
            nextPlayer(activeIndex);
        } else {
            sendChatMessage("Nächster: " + getUsers()[activeIndex].name);
            getUsers()[activeIndex].activeTurn = true;
            io.sockets.to(socket.room).emit('update', getUsers());
            io.sockets.to(socket.room).emit('play_sound', getUsers()[activeIndex].name);
            if (getUsers()[activeIndex].inJail) {
                jailDiceLoop(0, activeIndex);
            }
        }
    }

    function sendChatMessage(msg) {
        console.log(msg);
        io.sockets.to(socket.room).emit('new message', {msg: msg, user: "server"});
    }

    function setPosition(userIndex, steps) {
        if (userIndex !== -1) {
            getUsers()[userIndex].fieldIndex += steps;
            isSpecialPosition(userIndex, steps);
            setPositionFromJson(userIndex);
            alignPlayers();
        }
    }

    function setPositionFromJson(index) {
        getUsers()[index].x = field_positions[getUsers()[index].fieldIndex].x;
        getUsers()[index].y = field_positions[getUsers()[index].fieldIndex].y;
    }

    function endGame() {
        console.log('Clearing lobby');
        users = users.filter(u => u.room !== socket.room);
        roomState.delete(socket.room);
    }

    function isSpecialPosition(userIndex, steps) {
        if (getUsers()[userIndex].fieldIndex >= field_positions.length - 1) {
            // win game
            getUsers()[userIndex].fieldIndex = field_positions.length - 1;
            sendChatMessage(getUsers()[userIndex].name + " hat gewonnen!");
            sendChatMessage("Lobby wird in 5 Sekunden geschlossen...");

            // waiting 5 sec before reloading page and closing lobby
            setTimeout(() => {
                io.sockets.to(socket.room).emit('refresh_page');
                endGame();
            }, 5000);

        } else if (getUsers()[userIndex].fieldIndex < 0) {
            // before start
            getUsers()[userIndex].fieldIndex = 0;

        } else {
            // special field
            switch (getUsers()[userIndex].fieldIndex) {
                case 9:
                    sendChatMessage(getUsers()[userIndex].name + " ist auf der Karriereleiter aufgestiegen");
                    setPosition(userIndex, 25);
                    break;
                case 11:
                    sendChatMessage(getUsers()[userIndex].name + " hat den BEP nicht erreicht! Zurück mit dir!");
                    setPosition(userIndex, -steps);
                    break;
                case 18:
                    sendChatMessage("Black Friday für " + getUsers()[userIndex].name + "! Geh weiter!");
                    setPosition(userIndex, steps);
                    break;
                case 22:
                    sendChatMessage(getUsers()[userIndex].name + " ist auf der Karriereleiter aufgestiegen");
                    setPosition(userIndex, 21);
                    break;
                case 24:
                    sendChatMessage(getUsers()[userIndex].name + " hat Steuerhinterziehung begangen! (Wie kannst du nur?)");
                    taxFraud(userIndex);
                    break;
                case 28:
                    sendChatMessage(getUsers()[userIndex].name + " erlebt eine Finanzkrise!");
                    financialCrisis(userIndex);
                    break;
                case 31:
                    setTimeout(() => {
                        switchIdentity(userIndex);
                    }, 1000);
                    break;
                case 33:
                    sendChatMessage(getUsers()[userIndex].name + ", jetzt wird's spannend! Black Thursday!")
                    break;
                case 35:
                    sendChatMessage("Eine Runde Fibu für " + getUsers()[userIndex].name + "!")
                    getUsers()[userIndex].fibu_rounds = 1;
                    break;
                case 37:
                    sendChatMessage( " Jackpot für " + getUsers()[userIndex].name + "! Du darfst noch einmal ziehen!")
                    jackpot(userIndex);
                    break;
                case 39:
                    sendChatMessage(getUsers()[userIndex].name + " wurde degradiert!")
                    setPosition(userIndex, -24);
                    break;
                case 42:
                    sendChatMessage("Zwei Runden Fibu für " + getUsers()[userIndex].name + "!")
                    getUsers()[userIndex].fibu_rounds = 2;
                    break;
                case 49:
                    sendChatMessage(getUsers()[userIndex].name + " erlitt starke Verluste!");
                    setPosition(userIndex, -19);
                    break;
                case 55:
                    sendChatMessage( "Drei Runden Fibu für " + getUsers()[userIndex].name + "!");
                    getUsers()[userIndex].fibu_rounds = 3;
                    break;
                case 58:
                    sendChatMessage(getUsers()[userIndex].name + " hat die Prüfung nicht bestanden!");
                    setPosition(userIndex, -12);
                    break;
                case 62:
                    sendChatMessage(getUsers()[userIndex].name + " hat 2018 in Bitcoin investiert und ist pleite!");
                    setPosition(userIndex, -9);
                    break;
            }
        }
    }

    function switchIdentity(userIndex) {
        getUsers()[userIndex].picksPlayer = true;
        socket.emit('new message', {
            msg: 'Bitte wähle einen Spieler aus der Liste mit dem du die Position tauschen möchtest...',
            user: "server"
        });
        io.sockets.to(socket.room).emit('update', getUsers());
        socket.emit('allow_identity_switch', getUsers());
    }

    //go to the jail
    function taxFraud(userIndex) {
        getUsers()[userIndex].fieldIndex = 14;
        getUsers()[userIndex].inJail = true;
        jailDiceLoop(0, userIndex);
    }

    //dices without drawing a card
    function jailDiceLoop(count, userIndex) {
        let random = getRandomInt(1, 6);

        const lastDice = (count === 2);
        const isSix = (random === 6);

        socket.emit('roll_dice', [random], (lastDice || isSix), true);
        setTimeout(() => {
            sendChatMessage(getUsers()[userIndex].name + " hat " + random + " gewürfelt!");
            if (isSix) {
                setPosition(userIndex, 1);
                getUsers()[userIndex].inJail = false;
            } else {
                if (!lastDice) {
                    jailDiceLoop(count + 1, userIndex);
                }
            }

        }, 3500);
    }

    //every player goes 1-6 steps back
    function financialCrisis(userIndex) {
        const random = getRandomInt(1, 6);
        socket.emit('roll_dice', [random], true);
        sendChatMessage(getUsers()[userIndex].name + " hat " + random + " gewürfelt!");
        for (let userIndex in getUsers()) {
            if (!getUsers()[userIndex].inJail) {
                setPosition(userIndex, -random);
            }
        }
    }

    //make a second turn
    function jackpot(userIndex) {
        if (userIndex === '0') {
            nextPlayer(getUsers().length - 1)
        } else {
            nextPlayer(userIndex - 1);
        }
    }

    function alignPlayers() {
        var fields = [];
        for (let userIndex in getUsers()) {
            if (fields[getUsers()[userIndex].fieldIndex] == null) {
                fields[getUsers()[userIndex].fieldIndex] = [userIndex];
            } else {
                fields[getUsers()[userIndex].fieldIndex].push(userIndex);
            }
        }

        for (let arrayIndex in fields) {
            if (devMode && fields[arrayIndex] !== null) {
                console.log("Auf dem Feld " + arrayIndex + " stehen folgende spieler: " + fields[arrayIndex]);
            }


            switch (fields[arrayIndex].length) {
                case 1:
                    setPositionFromJson(fields[arrayIndex][0]);
                    break;
                case 2:
                    twoPlayersOnSameField(fields[arrayIndex]);
                    break;
                case 3:
                    threePlayersOnSameField(fields[arrayIndex]);
                    break;
                case 4:
                    fourPlayersOnSameField(fields[arrayIndex]);
                    break;
                case 5:
                    fivePlayersOnSameField(fields[arrayIndex]);
                    break;
                case 6:
                    sixPlayersOnSameField(fields[arrayIndex]);
                    break;
                default:
                    break;
            }
        }

        io.sockets.to(socket.room).emit('update', getUsers());
    }

    function getUsers() {
        return users.filter(u => u.room == socket.room);
    }

    function twoPlayersOnSameField(userIndices) {
        for (let i in userIndices) {
            setPositionFromJson(userIndices[i]);
            switch (parseInt(i)) {
                case 0:
                    getUsers()[userIndices[i]].x -= 14;
                    getUsers()[userIndices[i]].y -= 14;
                    break;
                case 1:
                    getUsers()[userIndices[i]].x += 14;
                    getUsers()[userIndices[i]].y += 14;
                    break;
                default:
                    break;
            }
        }
    }

    function threePlayersOnSameField(userIndices) {
        for (let i in userIndices) {
            setPositionFromJson(userIndices[i]);
            switch (parseInt(i)) {
                case 0:
                    getUsers()[userIndices[i]].y -= 20;
                    break;
                case 1:
                    getUsers()[userIndices[i]].x += 18;
                    getUsers()[userIndices[i]].y += 12;
                    break;
                case 2:
                    getUsers()[userIndices[i]].x -= 18;
                    getUsers()[userIndices[i]].y += 12;
                    break;
                default:
                    break;
            }
        }
    }

    function fourPlayersOnSameField(userIndices) {
        for (let i in userIndices) {
            setPositionFromJson(userIndices[i]);
            const value = 18;
            switch (parseInt(i)) {
                case 0:
                    getUsers()[userIndices[i]].x += value;
                    getUsers()[userIndices[i]].y -= value;
                    break;
                case 1:
                    getUsers()[userIndices[i]].x += value;
                    getUsers()[userIndices[i]].y += value;
                    break;
                case 2:
                    getUsers()[userIndices[i]].x -= value;
                    getUsers()[userIndices[i]].y += value;
                    break;
                case 3:
                    getUsers()[userIndices[i]].x -= value;
                    getUsers()[userIndices[i]].y -= value;
                    break;
                default:
                    break;
            }
        }
    }

    function fivePlayersOnSameField(userIndices) {
        for (let i in userIndices) {
            setPositionFromJson(userIndices[i]);
            const value = 24;
            switch (parseInt(i)) {
                case 1:
                    getUsers()[userIndices[i]].x += value;
                    getUsers()[userIndices[i]].y -= value;
                    break;
                case 2:
                    getUsers()[userIndices[i]].x += value;
                    getUsers()[userIndices[i]].y += value;
                    break;
                case 3:
                    getUsers()[userIndices[i]].x -= value;
                    getUsers()[userIndices[i]].y += value;
                    break;
                case 4:
                    getUsers()[userIndices[i]].x -= value;
                    getUsers()[userIndices[i]].y -= value;
                    break;
                default:
                    break;
            }
        }
    }

    function sixPlayersOnSameField(userIndices) {
        for (let i in userIndices) {
            setPositionFromJson(userIndices[i]);
            switch (parseInt(i)) {
                case 0:
                    getUsers()[userIndices[i]].y -= 33;
                    break;
                case 1:
                    getUsers()[userIndices[i]].x += 27;
                    getUsers()[userIndices[i]].y -= 16;
                    break;
                case 2:
                    getUsers()[userIndices[i]].x += 27;
                    getUsers()[userIndices[i]].y += 16;
                    break;
                case 3:
                    getUsers()[userIndices[i]].y += 33;
                    break;
                case 4:
                    getUsers()[userIndices[i]].x -= 27;
                    getUsers()[userIndices[i]].y += 16;
                    break;
                case 5:
                    getUsers()[userIndices[i]].x -= 27;
                    getUsers()[userIndices[i]].y -= 16;
                    break;
                default:
                    break;
            }
        }
    }
})
