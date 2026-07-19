import { Router } from 'express';
import {
  getCallHistory,
  createCallRecord,
  updateCallRecord,
  deleteCallRecord,
  clearCallHistory,
} from '../controllers/callController';
import { protect } from '../middlewares/auth';

const router = Router();

router.get('/history', protect, getCallHistory);
router.post('/log', protect, createCallRecord);
router.patch('/log/:id', protect, updateCallRecord);
router.delete('/clear', protect, clearCallHistory);
router.delete('/:id', protect, deleteCallRecord);

export default router;
