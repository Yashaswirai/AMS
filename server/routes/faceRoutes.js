import express from 'express';
import {
  registerFace,
  recognizeFace,
  getDataset,
  deleteDataset
} from '../controllers/faceController.js';
import verifyToken from '../middleware/auth.js';
import authorize from '../middleware/roleAuth.js';
import { faceLimiter } from '../middleware/rateLimiter.js';
import { uploadFaceImage, uploadFaceDataset, handleMulterError } from '../middleware/upload.js';

const router = express.Router();

router.use(verifyToken);

router.post('/register', authorize('admin', 'teacher', 'student'), handleMulterError(uploadFaceDataset), registerFace);
router.post('/recognize', authorize('admin', 'teacher'), faceLimiter, handleMulterError(uploadFaceImage), recognizeFace);
router.get('/dataset/:studentId', authorize('admin', 'teacher', 'student'), getDataset);
router.delete('/dataset/:studentId', authorize('admin', 'teacher', 'student'), deleteDataset);

export default router;
