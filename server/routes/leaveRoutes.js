import express from 'express';
import {
  submit,
  getAll,
  approve,
  reject
} from '../controllers/leaveController.js';
import verifyToken from '../middleware/auth.js';
import authorize from '../middleware/roleAuth.js';
import { uploadDocument, handleMulterError } from '../middleware/upload.js';

const router = express.Router();

router.use(verifyToken);

router.post('/', authorize('student'), handleMulterError(uploadDocument), submit);
router.get('/', authorize('admin', 'teacher', 'student'), getAll);
router.post('/:id/approve', authorize('admin', 'teacher'), approve);
router.post('/:id/reject', authorize('admin', 'teacher'), reject);

export default router;
