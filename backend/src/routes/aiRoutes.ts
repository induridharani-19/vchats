import { Router } from 'express';
import { protect } from '../middlewares/auth';
import {
  chatWithAssistant,
  translateText,
  summarizeChat,
  correctGrammar,
} from '../controllers/aiController';

const router = Router();

// Apply auth middleware to all AI endpoints
router.use(protect);

router.post('/chat', chatWithAssistant);
router.post('/translate', translateText);
router.post('/summarize', summarizeChat);
router.post('/correct', correctGrammar);

export default router;
