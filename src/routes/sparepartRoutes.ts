import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { listSpareParts, createSparePart, getSparePart, updateSparePart, deleteSparePart, getBarcode, printBarcode } from '../controllers/sparepartController';

const router = Router();

router.use(authenticate);
router.get('/', listSpareParts);
router.post('/', createSparePart);
router.get('/:id', getSparePart);
router.put('/:id', updateSparePart);
router.delete('/:id', deleteSparePart);
router.get('/:id/barcode', getBarcode);
router.post('/:id/barcode/print', printBarcode);

export default router;
