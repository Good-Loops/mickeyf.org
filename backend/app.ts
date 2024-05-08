import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import userRoutes from './routes/userRoutes';
import dotenv from 'dotenv';

// Load environment variables from the .env file
dotenv.config();

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
                "'unsafe-inline'",
                "'unsafe-eval'", 
                ...(process.env.NODE_ENV === 'development' ? ["http://localhost:8080"] : ["https://mickeyf-org-j7yuum4tiq-uc.a.run.app"])
            ],
            workerSrc: [
                "'self'",
                "blob:",
                ...(process.env.NODE_ENV === 'development' ? ["http://localhost:8080"] : ["https://mickeyf-org-j7yuum4tiq-uc.a.run.app"])
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com",
                ...(process.env.NODE_ENV === 'development' ? ["http://localhost:8080"] : ["https://mickeyf-org-j7yuum4tiq-uc.a.run.app"])
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com",
                ...(process.env.NODE_ENV === 'development' ? ["http://localhost:8080"] : ["https://mickeyf-org-j7yuum4tiq-uc.a.run.app"])
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
    methods: '*', // Allowed HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'] // Allowed headers
}));

// Use userRoutes for all user-related endpoints
app.use('/api', userRoutes);

// Trust the proxy in front of you for proper IP resolution and secure protocol usage
app.set('trust proxy', true);

// SPA Fallback: Redirect all non-API requests to your SPA
// app.get('*', (req, res) => {
//     res.sendFile(path.resolve(__dirname, '../../frontend/public', 'index.html'));
// });

const PORT = 8080;

app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});

export default app;