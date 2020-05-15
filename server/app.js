const express = require('express');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) => { res.sendFile('../client/index.html') });

const port = 3000;
app.listen(port, () => console.log(`stonksXtreme listening at http://localhost:${port}`));
