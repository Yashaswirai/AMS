import express from 'express';
import {
  getAllTimetables,
  getTimetableById,
  createTimetable,
  updateTimetable,
  deleteTimetable,
  getByTeacher,
  getByStudent
} from '../controllers/timetableController.js';
import verifyToken from '../middleware/auth.js';
import authorize from '../middleware/roleAuth.js';

const router = express.Router();

router.use(verifyToken);

router.get('/teacher/:teacherId', authorize('admin', 'teacher'), getByTeacher);
router.get('/student/:studentId', authorize('admin', 'teacher', 'student'), getByStudent);

router.get('/', authorize('admin', 'teacher', 'student'), getAllTimetables);
router.get('/:id', authorize('admin', 'teacher', 'student'), getTimetableById);
router.post('/', authorize('admin'), createTimetable);
router.put('/:id', authorize('admin'), updateTimetable);
router.delete('/:id', authorize('admin'), deleteTimetable);

export default router;
