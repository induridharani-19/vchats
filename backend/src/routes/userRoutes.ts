import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  searchUsers,
  blockUser,
  unblockUser,
  setChatLockPin,
  verifyChatLockPin,
  reportEntity,
} from '../controllers/userController';
import { protect } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

router.get('/profile', protect, getProfile);
router.patch('/profile', protect, updateProfile);
router.post('/profile/photo', protect, upload.single('photo'), uploadProfilePhoto);
router.get('/search', protect, searchUsers);
router.post('/block', protect, blockUser);
router.post('/unblock', protect, unblockUser);
router.post('/lock-pin', protect, setChatLockPin);
router.post('/verify-pin', protect, verifyChatLockPin);
router.post('/report', protect, reportEntity);


export default router;
