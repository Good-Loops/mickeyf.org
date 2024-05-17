import { Router } from 'express';
import mainController from '../controllers/mainController';

const router = Router();

router.post('/users', mainController);

export default router;