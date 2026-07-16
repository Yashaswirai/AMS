import express from 'express';
import {
  register,
  login,
  logout,
  refreshToken,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  resendVerification
} from '../controllers/authController.js';
import {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  updateProfileValidator
} from '../validators/authValidator.js';
import validate from '../middleware/validate.js';
import verifyToken from '../middleware/auth.js';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';
import { uploadAvatar, handleMulterError } from '../middleware/upload.js';

const router = express.Router();

router.post('/register', authLimiter, registerValidator, validate, register);
router.post('/login', authLimiter, loginValidator, validate, login);
router.post('/logout', verifyToken, logout);
router.post('/refresh', refreshToken);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', passwordResetLimiter, forgotPasswordValidator, validate, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPasswordValidator, validate, resetPassword);
router.post('/resend-verification', resendVerification);

router.get('/me', verifyToken, getMe);
router.patch('/update-profile', verifyToken, handleMulterError(uploadAvatar), updateProfileValidator, validate, updateProfile);

export default router;
