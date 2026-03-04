import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { listMovements, stockIn, stockOut } from '../controllers/stockController';

const router = Router();

router.use(authenticate);
router.get('/', listMovements);   // GET /stock-movements
router.post('/in', stockIn);      // POST /stock/in
router.post('/out', stockOut);    // POST /stock/out

export default router;
