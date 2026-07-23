import { Router } from 'express';
import {
  getDashboardStats,
  getUsersList,
  toggleUserBlock,
  deleteUserAccount,
  broadcastAnnouncement,
  getPublicConfig,
  getSystemConfig,
  updateSystemConfig,
} from '../controllers/adminController';
import { protect, restrictToAdmin } from '../middlewares/auth';

const router = Router();

// Public route for landing page and login layout config (Branding / Ads)
router.get('/config/public', getPublicConfig);

// Apply admin locks to all subsequent routes
router.use(protect);
router.use(restrictToAdmin);

router.get('/stats', getDashboardStats);
router.get('/users', getUsersList);
router.post('/users/block', toggleUserBlock);
router.delete('/users/:targetUserId', deleteUserAccount);
router.post('/broadcast', broadcastAnnouncement);
router.get('/config', getSystemConfig);
router.put('/config', updateSystemConfig);

export default router;
