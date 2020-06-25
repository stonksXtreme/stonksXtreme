# stonksXtreme
the repository for the stonksXtreme online game
## Local Setup
1. Install Node.js: https://nodejs.org/en/
2. `git clone` the repository to your computer.
3. `npm install` all needed dependencies.

## Development
Open Terminal and run `npm run dev` and go to http://localhost:3000/.

## Production
Deploy to webserver and run `npm start`.

## Links
Please read through the following links:
- Express (Framework): http://expressjs.com/ 
- Socket.io: https://socket.io/
- Web development resources: https://developer.mozilla.org/en-US/

## Architecture
    ├── json
    │   ├── field_positions.json    # Datebase file for field coordinates
    │   ├── questions_easy.json     # Datebase file for easy questions
    │   └── questions_hard.json     # Datebase file for hard questions
    ├── public                      # All files in this folder are accesible from web
    │   ├── css                     # Style files for client
    │   │   ├── lobby.css
    │   │   └── style.css
    │   ├── dices                   # Video files for dice animation
    │   ├── img                     # Images and Favicons
    │   ├── js                      # Client side JavaScript file
    │   └── index.html              # Client side HTML5 file
    ├── app.js                      # Node.js server file
    └── README.md                   # this file
