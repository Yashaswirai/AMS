import express from 'express';
import {
  getAllSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject
} from '../controllers/subjectController.js';
import verifyToken from '../middleware/auth.js';
import authorize from '../middleware/roleAuth.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', authorize('admin', 'teacher', 'student'), getAllSubjects);
router.get('/:id', authorize('admin', 'teacher', 'student'), getSubjectById);
router.post('/', authorize('admin'), createSubject);
router.put('/:id', authorize('admin'), updateSubject);
router.delete('/:id', authorize('admin'), deleteSubject);

export default router;
