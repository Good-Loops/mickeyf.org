import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import userRoutes from './routes/userRoutes';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from the .env file
dotenv.config();

// Create an Express application
const app = express();

// Serve static files from assets
app.use(express.static('../frontend/public'));

// Helmet CSP configuration
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            connectSrc: [
                "'self'",
                ...(process.env.NODE_ENV === 'development' ? ["http://localhost:8080"] : ["https://mickeyf-org-j7yuum4tiq-uc.a.run.app"])
            ],
            imgSrc: [
                "'self'",
                "https://mickeyf-org-j7yuum4tiq-uc.a.run.app",
                "http://localhost:8080",
                "data:"
            ],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'", // Remove in production
                ...(process.env.NODE_ENV === 'development' ? ["http://localhost:8080"] : [])
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'", // Remove in production
                "https://fonts.googleapis.com",
                ...(process.env.NODE_ENV === 'development' ? ["http://localhost:8080"] : [])
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com",
                ...(process.env.NODE_ENV === 'development' ? ["http://localhost:8080"] : [])
            ],
        }
    })
);


// Parse JSON bodies
app.use(express.json());

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'development' ?
        ['http://localhost:8080'] :
        ['https://mickeyf-org-j7yuum4tiq-uc.a.run.app', 'https://mickeyf.org'],
    methods: ['GET', 'POST'], // Allowed HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'] // Allowed headers
}));

// Use userRoutes for all user-related endpoints
app.use('/api', userRoutes);

// SPA Fallback: Redirect all non-API requests to your SPA
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../frontend/public', 'index.html'));
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default app;