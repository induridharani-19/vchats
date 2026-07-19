import { Router } from 'express';
import {
  createChannel,
  followChannel,
  unfollowChannel,
  postToChannel,
  getChannels,
  getChannelPosts,
} from '../controllers/channelController';
import { protect } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

router.post('/create', protect, upload.single('avatar'), createChannel);
router.post('/:channelId/follow', protect, followChannel);
router.post('/:channelId/unfollow', protect, unfollowChannel);
router.post('/:channelId/broadcast', protect, upload.single('file'), postToChannel);
router.get('/', protect, getChannels);
router.get('/:channelId/posts', protect, getChannelPosts);

export default router;
