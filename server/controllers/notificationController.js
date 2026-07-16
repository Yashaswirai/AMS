import Notification from '../models/Notification.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { paginate, buildPaginationMeta } from '../utils/pagination.js';

/**
 * GET /api/v1/notifications
 */
export const getAllNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);

  const filter = { recipient: req.user.id };

  const [notifications, total] = await Promise.all([
    Notification.find(filter)
      .populate('sender', 'name avatar')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
  ]);

  const unreadCount = await Notification.countDocuments({
    recipient: req.user.id,
    isRead: false,
  });

  return ApiResponse.paginated(
    notifications,
    buildPaginationMeta(total, page, limit),
    'Notifications fetched successfully',
    { unreadCount }
  ).send(res);
});

/**
 * PATCH /api/v1/notifications/:id/read
 */
export const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user.id },
    { isRead: true, readAt: new Date() },
    { new: true }
  );

  if (!notification) {
    throw ApiError.notFound('Notification not found or access denied');
  }

  return new ApiResponse(200, notification, 'Notification marked as read').send(res);
});

/**
 * POST /api/v1/notifications/read-all
 */
export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user.id, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  return new ApiResponse(200, null, 'All notifications marked as read').send(res);
});

/**
 * DELETE /api/v1/notifications/:id
 */
export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    recipient: req.user.id,
  });

  if (!notification) {
    throw ApiError.notFound('Notification not found or access denied');
  }

  return new ApiResponse(200, null, 'Notification deleted successfully').send(res);
});
