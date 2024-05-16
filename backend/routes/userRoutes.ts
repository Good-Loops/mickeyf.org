import { Router } from 'express';
import userController from '../controllers/userController';

const router = Router();

router.post('/users', userController);

export default router;