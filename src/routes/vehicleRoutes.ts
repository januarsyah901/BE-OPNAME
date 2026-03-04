import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { updateVehicle } from '../controllers/vehicleController';

const router = Router();

router.use(authenticate);
router.put('/:id', updateVehicle);

export default router;
