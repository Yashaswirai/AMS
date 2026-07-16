import express from 'express';
import {
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getTeacherDashboard
} from '../controllers/teacherController.js';
import verifyToken from '../middleware/auth.js';
import authorize from '../middleware/roleAuth.js';
import { uploadAvatar, handleMulterError } from '../middleware/upload.js';

const router = express.Router();

router.use(verifyToken);

router.get('/dashboard/:id', authorize('admin', 'teacher'), getTeacherDashboard);

router.get('/', authorize('admin'), getAllTeachers);
router.get('/:id', authorize('admin', 'teacher'), getTeacherById);
router.post('/', authorize('admin'), createTeacher);
router.put('/:id', authorize('admin', 'teacher'), handleMulterError(uploadAvatar), updateTeacher);
router.delete('/:id', authorize('admin'), deleteTeacher);

export default router;
