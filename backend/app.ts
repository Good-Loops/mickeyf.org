import express from 'express';
import userRoutes from './routes/userRoutes';

const app = express();

app.use(express.json());

// Use userRoutes for all user-related endpoints
app.use('/api', userRoutes);

export default app;