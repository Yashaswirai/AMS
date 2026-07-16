import express from 'express';
import {
  markManual,
  markBulk,
  markByFace,
  markByQR,
  generateQRSession,
  getHistory,
  getStats,
  requestCorrection,
  approveCorrection
} from '../controllers/attendanceController.js';
import {
  markManualValidator,
  markBulkValidator,
  markByQRValidator,
  correctionRequestValidator
} from '../validators/attendanceValidator.js';
import validate from '../middleware/validate.js';
import verifyToken from '../middleware/auth.js';
import authorize from '../middleware/roleAuth.js';
import { faceLimiter } from '../middleware/rateLimiter.js';
import { uploadFaceImage, handleMulterError } from '../middleware/upload.js';

const router = express.Router();

router.use(verifyToken);

router.post('/manual', authorize('admin', 'teacher'), markManualValidator, validate, markManual);
router.post('/bulk', authorize('admin', 'teacher'), markBulkValidator, validate, markBulk);
router.post('/face', authorize('admin', 'teacher'), faceLimiter, handleMulterError(uploadFaceImage), markByFace);
router.post('/qr', authorize('student'), markByQRValidator, validate, markByQR);
router.post('/qr-session', authorize('admin', 'teacher'), generateQRSession);

router.get('/history', authorize('admin', 'teacher', 'student'), getHistory);
router.get('/stats/:studentId', authorize('admin', 'teacher', 'student'), getStats);

router.post('/correction-request', authorize('admin', 'teacher', 'student'), correctionRequestValidator, validate, requestCorrection);
router.post('/correction-approve/:id', authorize('admin', 'teacher'), approveCorrection);

export default router;
