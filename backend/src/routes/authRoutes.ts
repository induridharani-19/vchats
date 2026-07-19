import { Router } from 'express';
import {
  register,
  verifyOtp,
  login,
  refreshToken,
  logout,
  logoutAll,
  forgotPassword,
  resetPassword,
} from '../controllers/authController';
import {
  registerValidator,
  verifyOtpValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} from '../validators/authValidator';
import { protect } from '../middlewares/auth';

const router = Router();

router.post('/register', registerValidator, register);
router.post('/verify-otp', verifyOtpValidator, verifyOtp);
router.post('/login', loginValidator, login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);
router.post('/logout-all', protect, logoutAll);
router.post('/forgot-password', forgotPasswordValidator, forgotPassword);
router.post('/reset-password', resetPasswordValidator, resetPassword);

export default router;
