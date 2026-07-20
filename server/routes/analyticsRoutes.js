import express from 'express';
import {
  overview,
  departmentBreakdown,
  courseBreakdown,
  subjectAnalysis,
  studentRankings,
  heatmap,
  trends
} from '../controllers/analyticsController.js';
import verifyToken from '../middleware/auth.js';
import authorize from '../middleware/roleAuth.js';

const router = express.Router();

router.use(verifyToken);
router.use(authorize('admin', 'teacher'));

router.get('/overview', overview);
router.get('/departments', departmentBreakdown);
router.get('/courses', courseBreakdown);
router.get('/subjects', subjectAnalysis);
router.get('/rankings', studentRankings);
router.get('/heatmap', heatmap);
router.get('/trends', trends);

export default router;
