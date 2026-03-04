import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { listNotifications, sendTestNotification } from '../controllers/notificationController';

const router = Router();

router.use(authenticate);
router.get('/wa', listNotifications);
router.post('/wa/test', sendTestNotification);

export default router;
