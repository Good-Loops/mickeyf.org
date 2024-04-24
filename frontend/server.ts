const express = require('express');
const path = require('path');
const serveStatic = require('serve-static');
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

// Define the absolute path to the root of your project
const publicPath = path.resolve(__dirname, 'public');

// Proxy API requests to Backend
app.use('/api', createProxyMiddleware({
    target: 'http://localhost:3000',
    changeOrigin: true,
    pathRewrite: {
        '^/api': '', // optionally strip the /api prefix if needed
    },
}));

// Serve static files from the root of the project
app.use(serveStatic(publicPath, { 'index': ['index.html', 'index.htm'] }));

// This route will handle all other get requests to give control to the SPA
app.get('*', function (_req: any, res: { sendFile: (arg0: string, arg1: { root: any; }) => void; }) {
    res.sendFile('index.html', { root: publicPath });
});

// 404 handling
app.use(function (_req: any, res: { status: (arg0: number) => { (): any; new(): any; sendFile: { (arg0: string, arg1: { root: any; }): void; new(): any; }; }; }, _next: any) {
    res.status(404).sendFile('404.html', { root: publicPath });
});

const port = process.env.PORT || 7777;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});