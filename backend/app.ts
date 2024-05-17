/**
 * This file represents the main application file for the backend of the mickeyf.org website.
 * It sets up the Express server, configures middleware, and defines routes.
 */

require('dotenv').config(); // Load environment variables from .env file

// Import the required modules
import express from 'express'; // Import the Express module
import helmet from 'helmet'; // Import the Helmet module
import cors from 'cors';  // Import the CORS module
 
import mainRouter from './routes/mainRouter'; // Import the main router

import loginUser from './functions/loginUser'; // Import the loginUser function
exports.loginUser = loginUser; // Export the loginUser function

const environment: string = process.env.NODE_ENV as string; // Determine environment
const baseUrl: string = environment ? process.env.DEV_BASE_URL! : process.env.PROD_BASE_URL!; // Determine Base URL
const apiUrl: string = environment ? process.env.DEV_API_URL! : process.env.PROD_API_URL!; // Detertmine API URL

const app = express(); // Create an Express application

// Helmet CSP configuration
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            connectSrc: [
                "'self'",
                "data:",
                baseUrl!
            ],
            imgSrc: [
                "'self'",
                "data:",
                baseUrl!
            ],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "'unsafe-eval'",
                baseUrl! 
            ],
            workerSrc: [
                "'self'",
                "blob:",
                baseUrl!
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com",
                baseUrl!
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com",
                baseUrl!
            ],
        }
    })
);
app.use(express.json()); // Parse JSON bodies
// CORS configuration
app.use(cors({
    origin: [baseUrl!, apiUrl!], // Allowed origins
    methods: '*', // Allowed HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'] // Allowed headers
}));
app.use('/api', mainRouter); // Use the main router for all routes
app.set('trust proxy', true); // Trust the first proxy
const PORT = 8080; // Port to run the server on

// Start the server
app.listen(PORT, () => {   
    console.log(`Backend running on port ${PORT}`); 
});

export default app; // Export the Express application