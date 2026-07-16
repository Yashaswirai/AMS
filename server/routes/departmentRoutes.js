import express from 'express';
import {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
} from '../controllers/departmentController.js';
import verifyToken from '../middleware/auth.js';
import authorize from '../middleware/roleAuth.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', authorize('admin', 'teacher', 'student'), getAllDepartments);
router.get('/:id', authorize('admin', 'teacher', 'student'), getDepartmentById);
router.post('/', authorize('admin'), createDepartment);
router.put('/:id', authorize('admin'), updateDepartment);
router.delete('/:id', authorize('admin'), deleteDepartment);

export default router;
