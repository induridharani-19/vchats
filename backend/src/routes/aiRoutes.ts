import { Router } from 'express';
import { protect } from '../middlewares/auth';
import {
  chatWithAssistant,
  translateText,
  summarizeChat,
  writingAssistant,
  extractTasksAndReminders,
  detectSentiment,
  getSmartReplies,
} from '../controllers/aiController';

const router = Router();

router.use(protect);

router.post('/chat', chatWithAssistant);
router.post('/translate', translateText);
router.post('/summarize', summarizeChat);
router.post('/write-assist', writingAssistant);
router.post('/tasks', extractTasksAndReminders);
router.post('/sentiment', detectSentiment);
router.get('/smart-replies', getSmartReplies);

export default router;
