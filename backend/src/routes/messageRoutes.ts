import { Router } from 'express';
import {
  sendMessage,
  editMessage,
  deleteMessageForMe,
  deleteMessageForEveryone,
  toggleReaction,
  searchMessages,
  markConversationAsSeen,
} from '../controllers/messageController';
import { protect } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

router.post('/send', protect, upload.single('file'), sendMessage);
router.patch('/:id/edit', protect, editMessage);
router.patch('/:conversationId/seen', protect, markConversationAsSeen);
router.delete('/:id/me', protect, deleteMessageForMe);
router.delete('/:id/everyone', protect, deleteMessageForEveryone);
router.post('/:id/react', protect, toggleReaction);
router.get('/:conversationId/search', protect, searchMessages);

export default router;
