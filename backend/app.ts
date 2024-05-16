require('dotenv').config();
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import userRoutes from './routes/userRoutes';

// Determine the environment
const environment: string = process.env.NODE_ENV === 'development' ? 'development' : 'production';
// Determine Base URL
const baseUrl: string = environment === 'development' ? process.env.DEV_BASE_URL as string : process.env.PROD_BASE_URL as string;
// Detertmine API URL
const apiUrl: string = environment === 'development' ? process.env.DEV_API_URL as string : process.env.PROD_API_URL as string;

// Create an Express application
const app = express();

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


// Parse JSON bodies
app.use(express.json());

// CORS configuration
app.use(cors({
    origin: [baseUrl!, apiUrl!],
    methods: '*', // Allowed HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'] // Allowed headers
}));

// Use userRoutes for all user-related endpoints
app.use('/api', userRoutes);

// Trust the proxy in front of you for proper IP resolution and secure protocol usage
app.set('trust proxy', true);

const PORT = 8080;

app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});

export default app;