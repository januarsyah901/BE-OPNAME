import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { listCustomers, createCustomer, getCustomer, updateCustomer, deleteCustomer, getCustomerHistory } from '../controllers/customerController';
import { listVehicles, createVehicle } from '../controllers/vehicleController';

const router = Router();

router.use(authenticate);

router.get('/', listCustomers);
router.post('/', createCustomer);
router.get('/:id', getCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);
router.get('/:id/history', getCustomerHistory);
router.get('/:customerId/vehicles', listVehicles);
router.post('/:customerId/vehicles', createVehicle);

export default router;
