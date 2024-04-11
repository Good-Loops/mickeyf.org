const express = require('express');
const path = require('path');
const serveStatic = require('serve-static');

const app = express();

// Serve static files from the root of the project
app.use(serveStatic(path.join(__dirname, '../')));

const port = 7777;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});