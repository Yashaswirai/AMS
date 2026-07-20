import express from 'express';
import {
  getDashboardStats,
  getAllUsers,
  getUserById,
  toggleUserStatus,
  deleteUser,
  getAuditLogs,
  getSystemHealth,
  broadcastNotification,
  getGeofenceSetting,
  updateGeofenceSetting
} from '../controllers/adminController.js';
import verifyToken from '../middleware/auth.js';
import authorize from '../middleware/roleAuth.js';

const router = express.Router();

router.use(verifyToken);
router.use(authorize('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/status', toggleUserStatus);
router.delete('/users/:id', deleteUser);
router.get('/audit-logs', getAuditLogs);
router.get('/system-health', getSystemHealth);
router.post('/broadcast', broadcastNotification);

router.get('/geofence', getGeofenceSetting);
router.put('/geofence', updateGeofenceSetting);

export default router;
