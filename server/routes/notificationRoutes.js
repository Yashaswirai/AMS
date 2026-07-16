import express from 'express';
import {
  getAllNotifications,
  markRead,
  markAllRead,
  deleteNotification
} from '../controllers/notificationController.js';
import verifyToken from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', getAllNotifications);
router.patch('/:id/read', markRead);
router.post('/read-all', markAllRead);
router.delete('/:id', deleteNotification);

export default router;
