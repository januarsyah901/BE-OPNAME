import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { listMovements } from '../controllers/stockController';

const router = Router();

router.use(authenticate);
router.get('/', listMovements);   // GET /stock-movements

export default router;
