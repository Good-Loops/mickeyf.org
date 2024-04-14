const express = require('express');
const path = require('path');
const serveStatic = require('serve-static');
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

// Define the absolute path to the root of your project
const rootPath = path.resolve(__dirname, '../');

// Proxy API requests to Backend
app.use('/api', createProxyMiddleware({
    target: 'http://localhost:3000',
    changeOrigin: true,
    pathRewrite: {
        '^/api': '', // optionally strip the /api prefix if needed
    },
}));

// Serve static files from the root of the project
app.use(serveStatic(rootPath, { 'index': ['index.html', 'index.htm'] }));

// This route will handle all other get requests to give control to the SPA
app.get('*', function (req, res) {
    res.sendFile('index.html', { root: rootPath });
});

const port = process.env.PORT || 7777;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});