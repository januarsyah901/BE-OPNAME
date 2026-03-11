import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { revenueReport, topProductsReport, topServicesReport, lowStockReport, opnameReport, vehicleRatioReport, remindersReport } from '../controllers/reportController';

const router = Router();

router.use(authenticate);
router.get('/revenue', revenueReport);
router.get('/top-products', topProductsReport);
router.get('/top-services', topServicesReport);
router.get('/low-stock', lowStockReport);
router.get('/opname/:id', opnameReport);
router.get('/vehicle-ratio', vehicleRatioReport);
router.get('/reminders', remindersReport);

export default router;
