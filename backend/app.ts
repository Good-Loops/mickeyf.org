/**
 * This file represents the main application file for the backend of the mickeyf.org website.
 * It sets up the Express server, configures middleware, and defines routes.
 */

require('dotenv').config(); // Load environment variables from .env file

// Import the required modules
import express from 'express'; // Import the Express module
import cookieParser from 'cookie-parser'; // Import the cookie-parser module
import helmet from 'helmet'; // Import the Helmet module
import cors from 'cors';  // Import the CORS module
 
// Import routers
import mainRouter from './routers/mainRouter'; // Import the main router
import authRouter from './routers/authRouter'; // Import the auth router

const environment: string = process.env.NODE_ENV as string; // Determine environment
const baseUrl: string = environment === 'development' ?  process.env.DEV_BASE_URL! : process.env.PROD_BASE_URL!; // Determine Base URL
const apiUrl: string = environment === 'development' ? process.env.DEV_API_URL! : process.env.PROD_API_URL!; // Detertmine API URL

const app = express(); // Create an Express application

app.use(cookieParser(process.env.SESSION_SECRET)); // Use cookie parser

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
    origin: [ // Allowed origins
        baseUrl!, 
        `${apiUrl!}/api/users`, // Allow the /api/users route to be accessed from the frontend
        `${apiUrl!}/auth/verify-token` // Allow the /auth/verify-token route to be accessed from the frontend
    ],
    credentials: true, // Allow credentials 
    methods: '*', // Allowed HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'] // Allowed headers
}));


app.use('/api', mainRouter); // Main router for database-operations related routes
app.use('/auth', authRouter); // Auth router for authentication related routes

app.set('trust proxy', true); // Trust the first proxy

// Start the server
app.listen(8080, () => {   
    console.log("Backend running on port 8080"); 
});

export default app; // Export the Express application