import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { listCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController';

const router = Router();

router.use(authenticate);
router.get('/', listCategories);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;
