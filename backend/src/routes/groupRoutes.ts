import { Router } from 'express';
import {
  createGroup,
  addGroupMembers,
  removeGroupMember,
  toggleGroupAdmin,
  leaveGroup,
  updateGroup,
} from '../controllers/groupController';
import { protect } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

router.post('/create', protect, upload.single('avatar'), createGroup);
router.post('/:groupId/add', protect, addGroupMembers);
router.delete('/:groupId/remove/:userId', protect, removeGroupMember);
router.patch('/:groupId/role/:userId', protect, toggleGroupAdmin);
router.post('/:groupId/leave', protect, leaveGroup);
router.patch('/:groupId', protect, upload.single('avatar'), updateGroup);

export default router;
