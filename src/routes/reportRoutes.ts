import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { revenueReport, topProductsReport, lowStockReport, opnameReport } from '../controllers/reportController';

const router = Router();

router.use(authenticate);
router.get('/revenue', revenueReport);
router.get('/top-products', topProductsReport);
router.get('/low-stock', lowStockReport);
router.get('/opname/:id', opnameReport);

export default router;
