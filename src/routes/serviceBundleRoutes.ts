import { Router } from 'express';
import { 
    listServiceBundles, 
    createServiceBundle, 
    getServiceBundle, 
    updateServiceBundle, 
    deleteServiceBundle 
} from '../controllers/serviceBundleController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Semua route di sini diproteksi oleh token
router.use(authenticate);

router.get('/', listServiceBundles);
router.post('/', createServiceBundle);
router.get('/:id', getServiceBundle);
router.put('/:id', updateServiceBundle);
router.delete('/:id', deleteServiceBundle);

export default router;
