import { Router } from 'express';
import {
  getConversations,
  createDirectConversation,
  togglePinConversation,
  toggleMuteConversation,
  toggleFavoriteConversation,
  toggleArchiveConversation,
  getConversationMessages,
  deleteConversation,
  updateConversationTheme,
  clearConversationTheme,
  toggleLockConversation,
  clearConversation,
} from '../controllers/chatController';
import { protect } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

router.get('/', protect, getConversations);
router.post('/direct', protect, createDirectConversation);
router.post('/:conversationId/pin', protect, togglePinConversation);
router.post('/:conversationId/mute', protect, toggleMuteConversation);
router.post('/:conversationId/favorite', protect, toggleFavoriteConversation);
router.post('/:conversationId/archive', protect, toggleArchiveConversation);
router.post('/:conversationId/lock', protect, toggleLockConversation);
router.post('/:conversationId/clear', protect, clearConversation);

router.get('/:conversationId/messages', protect, getConversationMessages);
router.delete('/:conversationId', protect, deleteConversation);
router.patch('/:conversationId/theme', protect, upload.single('themeImage'), updateConversationTheme);
router.delete('/:conversationId/theme', protect, clearConversationTheme);

export default router;
