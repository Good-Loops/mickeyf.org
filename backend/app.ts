require('dotenv').config();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import userRoutes from './routes/userRoutes';

const app = express();

// Serve static files from assets
app.use(express.static('public'));

// Helmet CSP configuration
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'none'"], // Sets the default source to 'none'
            imgSrc: ["https://mickeyf-org-j7yuum4tiq-uc.a.run.app"], // Allows images from these backend domains
            scriptSrc: ["'self'"], // Allows scripts from the same origin
        }
    })
);

app.use(express.json());

// CORS configuration
app.use(cors(
    {
        origin: ['https://mickeyf-org-j7yuum4tiq-uc.a.run.app', 'https://mickeyf.org'], // Allow requests from these domains
        methods: ['GET', 'POST'], // Allowed HTTP methods
        allowedHeaders: ['Content-Type', 'Authorization'] // Allowed headers
    }
));


// Use userRoutes for all user-related endpoints
app.use('/api', userRoutes);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Serve the root page
app.get('/', (req, res) => {
    res.send('Welcome to my backend server!');
});

export default app;