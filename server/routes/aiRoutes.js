import express from 'express';
import {
  chat,
  generateReport,
  getInsights
} from '../controllers/aiController.js';
import verifyToken from '../middleware/auth.js';
import authorize from '../middleware/roleAuth.js';

const router = express.Router();

router.use(verifyToken);

router.post('/chat', chat); // Available for student, teacher, admin
router.post('/report', authorize('admin', 'teacher'), generateReport);
router.get('/insights', authorize('admin', 'teacher'), getInsights);

export default router;
