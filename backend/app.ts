import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes';

const app = express();

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

export default app;