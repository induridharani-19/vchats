import { Router } from 'express';
import { protect } from '../middlewares/auth';
import {
  sendFriendRequest,
  respondToFriendRequest,
  getFriendRequests,
  getFriendsList,
  removeFriend,
} from '../controllers/friendController';

const router = Router();

// Apply auth middleware to all contact routes
router.use(protect);

router.post('/request', sendFriendRequest);
router.post('/respond', respondToFriendRequest);
router.get('/requests', getFriendRequests);
router.get('/list', getFriendsList);
router.delete('/:friendId', removeFriend);

export default router;
