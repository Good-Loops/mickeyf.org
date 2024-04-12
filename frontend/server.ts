const express = require('express');
const path = require('path');
const serveStatic = require('serve-static');
const cors = require('cors');

const app = express();

// Define the absolute path to the root of your project
const rootPath = path.resolve(__dirname, '../');

// Enable CORS for specific origin
app.use(cors({
    origin: ['http://localhost:7777', 'https://mickeyf.org']
}));


// Serve static files from the root of the project
app.use(serveStatic(rootPath));

const port = process.env.PORT || 7777;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});