import { Router } from 'express';
import { addUser, loginUser } from '../controllers/userController';

const router = Router();

// router.get('/users', getUsers);

router.post('/users', (req, res) => {
    switch (req.body.type) {
        case 'signup':
            addUser(req, res);
            break;
        case 'login':
            loginUser(req, res);
            break;
        default:
            res.status(400).send({ error: 'Invalid type' });
    }
});

export default router;