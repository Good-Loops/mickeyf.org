const express = require('express');
const path = require('path');
const serveStatic = require('serve-static');
const cors = require('cors');

const app = express();

// Enable CORS for specific origin
app.use(cors({
    origin: ['http://localhost', 'https://mickeyf.org']
}));


// Serve static files from the root of the project
app.use(serveStatic(path.join(__dirname, '../')));

const port = process.env.PORT || 7777;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});