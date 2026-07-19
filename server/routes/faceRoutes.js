import express from 'express';
import {
  registerFace,
  recognizeFace,
  getDataset,
  deleteDataset,
  getAllDatasets,
  retrainClassifier,
  deleteDatasetImage,
} from '../controllers/faceController.js';
import verifyToken from '../middleware/auth.js';
import authorize from '../middleware/roleAuth.js';
import { faceLimiter } from '../middleware/rateLimiter.js';
import { uploadFaceImage, uploadFaceDataset, handleMulterError } from '../middleware/upload.js';

const router = express.Router();

router.use(verifyToken);

// Registration & Recognition
router.post('/register', authorize('admin', 'teacher', 'student'), handleMulterError(uploadFaceDataset), registerFace);
router.post('/recognize', authorize('admin', 'teacher'), faceLimiter, handleMulterError(uploadFaceImage), recognizeFace);

// Admin Dataset Operations & Model Training
router.get('/datasets', authorize('admin', 'teacher'), getAllDatasets);
router.post('/train', authorize('admin'), retrainClassifier);
router.delete('/dataset/:studentId/image/:imageIndex', authorize('admin', 'teacher', 'student'), deleteDatasetImage);

// Individual Dataset Operations (supports studentId or 'me')
router.get('/dataset/:studentId', authorize('admin', 'teacher', 'student'), getDataset);
router.delete('/dataset/:studentId', authorize('admin', 'teacher', 'student'), deleteDataset);

export default router;
