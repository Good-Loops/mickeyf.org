require('dotenv').config({
  path: require('path').resolve(__dirname, '../..', '.env'),
});

/**
 * This file represents the main application file for the backend of the mickeyf.org website.
 * It sets up the Express server, configures middleware, and defines routes.
 */

// Import the required modules
import express from 'express'; // Import the Express module
import cookieParser from 'cookie-parser'; // Import the cookie-parser module
import helmet from 'helmet'; // Import the Helmet module
import cors from 'cors';  // Import the CORS module
 
// Import routers
import mainRouter from './routers/mainRouter'; // Import the main router
import authRouter from './routers/authRouter'; // Import the auth router

const environment: string = process.env.NODE_ENV as string; // Determine environment
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
                "https://mickeyf.org",
                "http://localhost:5173",
                `${apiUrl!}/api/users`,
                `${apiUrl}/auth/verify-token`
            ],
            imgSrc: [
                "'self'",
                "data:",
                "https://mickeyf.org",
                "http://localhost:5173"
            ],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "'unsafe-eval'",
                "https://mickeyf.org",
                "http://localhost:5173"
            ],
            workerSrc: [
                "'self'",
                "blob:",
                "https://mickeyf.org",
                "http://localhost:5173"
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com",
                "https://mickeyf.org",
                "http://localhost:5173"
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com",
                "https://mickeyf.org",
                "http://localhost:5173"
            ],
        }
    })
);

app.use(express.json()); // Parse JSON bodies

// CORS configuration
app.use(cors({
    origin: [ // Allowed origins
        "https://mickeyf.org",
        "http://localhost:5173", 
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
    // console.log("Backend running on port 8080"); 
});

export default app; // Export the Express application