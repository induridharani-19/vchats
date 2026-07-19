import { Router } from 'express';
import {
  postStory,
  getStatusFeed,
  viewStory,
  getStoryViews,
  searchSongs,
} from '../controllers/statusController';
import { protect } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

router.get('/search-songs', protect, searchSongs);
router.post('/create', protect, upload.single('media'), postStory);
router.get('/feed', protect, getStatusFeed);
router.post('/:storyId/view', protect, viewStory);
router.get('/:storyId/views', protect, getStoryViews);

export default router;
