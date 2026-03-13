import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { listTransactions, createTransaction, getTransaction, updatePayment, getTransactionPdf, deleteTransaction } from '../controllers/transactionController';

const router = Router();

router.use(authenticate);
router.get('/', listTransactions);
router.post('/', createTransaction);
router.get('/:id', getTransaction);
router.patch('/:id/payment', updatePayment);
router.get('/:id/pdf', getTransactionPdf);
router.delete('/:id', deleteTransaction);

export default router;
