import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { getSettings, updateSettings } from '../controllers/settingController';

const router = Router();

router.use(authenticate);
router.get('/', getSettings);
router.put('/', updateSettings);

export default router;
