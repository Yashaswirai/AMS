import express from 'express';
import {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getFaceProfile,
  getStudentAttendance,
  getMyProfile
} from '../controllers/studentController.js';
import { createStudentValidator, updateStudentValidator } from '../validators/studentValidator.js';
import validate from '../middleware/validate.js';
import verifyToken from '../middleware/auth.js';
import authorize from '../middleware/roleAuth.js';
import { uploadAvatar, handleMulterError } from '../middleware/upload.js';

const router = express.Router();

router.use(verifyToken);

// Student's own endpoints
router.get('/my-profile', authorize('student'), getMyProfile);

// Admin/Teacher endpoints
router.get('/', authorize('admin', 'teacher'), getAllStudents);
router.get('/:id', authorize('admin', 'teacher', 'student'), getStudentById);
router.post('/', authorize('admin'), createStudentValidator, validate, createStudent);
router.put('/:id', authorize('admin', 'teacher', 'student'), handleMulterError(uploadAvatar), updateStudentValidator, validate, updateStudent);
router.delete('/:id', authorize('admin'), deleteStudent);

// Special routes
router.get('/:id/face-profile', authorize('admin', 'teacher', 'student'), getFaceProfile);
router.get('/:id/attendance', authorize('admin', 'teacher', 'student'), getStudentAttendance);

export default router;
