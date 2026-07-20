import { Router } from 'express';
import { protect } from '../middlewares/auth';
import { transferMoney, getPaymentHistory } from '../controllers/paymentController';

const router = Router();

router.use(protect);

router.post('/transfer', transferMoney);
router.get('/history', getPaymentHistory);

export default router;
