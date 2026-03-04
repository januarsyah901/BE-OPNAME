import { Router } from 'express';
import { authenticate, authorizeAdmin } from '../middlewares/authMiddleware';
import { listUsers, createUser, getUser, updateUser, deleteUser } from '../controllers/userController';

const router = Router();

router.use(authenticate, authorizeAdmin); // semua user route = admin only

router.get('/', listUsers);
router.post('/', createUser);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
