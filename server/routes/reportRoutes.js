import express from 'express';
import {
  generatePDF,
  generateCSV,
  generateExcel
} from '../controllers/reportController.js';
import verifyToken from '../middleware/auth.js';
import authorize from '../middleware/roleAuth.js';
import { reportLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(verifyToken);
router.use(authorize('admin', 'teacher')); // PDF/Excel/CSV generation is restricted to admins and teachers
router.use(reportLimiter);

router.get('/pdf', generatePDF);
router.get('/csv', generateCSV);
router.get('/excel', generateExcel);

export default router;
