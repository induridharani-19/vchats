import { Router } from 'express';
import {
  getDashboardStats,
  getUsersList,
  toggleUserBlock,
  deleteUserAccount,
  broadcastAnnouncement,
} from '../controllers/adminController';
import { protect, restrictToAdmin } from '../middlewares/auth';

const router = Router();

// Apply admin locks to all routes
router.use(protect);
router.use(restrictToAdmin);

router.get('/stats', getDashboardStats);
router.get('/users', getUsersList);
router.post('/users/block', toggleUserBlock);
router.delete('/users/:targetUserId', deleteUserAccount);
router.post('/broadcast', broadcastAnnouncement);

export default router;
