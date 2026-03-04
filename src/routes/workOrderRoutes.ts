import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import {
    listWorkOrders,
    createWorkOrder,
    getWorkOrder,
    updateWorkOrder,
    updateWorkOrderStatus,
    assignMechanic,
    deleteWorkOrder
} from '../controllers/workOrderController';

const router = Router();

router.use(authenticate);

router.get('/', listWorkOrders);
router.post('/', createWorkOrder);
router.get('/:id', getWorkOrder);
router.put('/:id', updateWorkOrder);
router.patch('/:id/status', updateWorkOrderStatus);
router.patch('/:id/mechanic', assignMechanic);
router.delete('/:id', deleteWorkOrder);

export default router;
