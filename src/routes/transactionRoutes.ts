import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { listTransactions, createTransaction, getTransaction, updatePayment, getTransactionPdf } from '../controllers/transactionController';

const router = Router();

router.use(authenticate);
router.get('/', listTransactions);
router.post('/', createTransaction);
router.get('/:id', getTransaction);
router.patch('/:id/payment', updatePayment);
router.get('/:id/pdf', getTransactionPdf);

export default router;
