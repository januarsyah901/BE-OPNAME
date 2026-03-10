import { Router } from 'express';

import { login, logout, me, refresh } from '../controllers/authController';

const router = Router();

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', me);

export default router;
