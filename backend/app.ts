import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import userRoutes from './routes/userRoutes';

const app = express();

// Helmet CSP configuration
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'none'"], // Sets the default source to 'none'
            imgSrc: ["https://mickeyf-org-j7yuum4tiq-uc.a.run.app"], // Allows images from this domain
            scriptSrc: ["'self'"], // Allows scripts from the same origin
        }
    })
);

app.use(express.json());

// CORS configuration for development
// Remove or restrict origins in production!
app.use(cors(
    {
        origin: 'http://localhost:7777',
        methods: ['GET', 'POST'], // Allowed HTTP methods
        allowedHeaders: ['Content-Type', 'Authorization'] // Allowed headers
    }
));

// CORS configuration for production
// app.use(cors({
//     origin: ['https://mickeyf.org'], // Array of allowed origins
//     methods: ['GET', 'POST'], // Allowed HTTP methods
//     allowedHeaders: ['Content-Type', 'Authorization'] // Allowed headers
// }));

// Use userRoutes for all user-related endpoints
app.use('/api', userRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

app.get('/', (req, res) => {
    res.send('Welcome to my backend server!');
});

export default app;