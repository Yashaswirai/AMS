import User from '../models/User.js';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import Department from '../models/Department.js';
import Course from '../models/Course.js';
import Subject from '../models/Subject.js';
import Attendance from '../models/Attendance.js';
import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';
import Setting from '../models/Setting.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { paginate, buildPaginationMeta, buildSearchFilter, buildSort } from '../utils/pagination.js';
import { computeOverview } from '../services/analyticsService.js';

/**
 * GET /api/v1/admin/dashboard
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const overview = await computeOverview();

  return new ApiResponse(200, overview, 'Dashboard statistics fetched').send(res);
});

/**
 * GET /api/v1/admin/users
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { search, role, isActive, isVerified } = req.query;

  const filter = {};
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (isVerified !== undefined) filter.isVerified = isVerified === 'true';

  if (search) {
    const searchFilter = buildSearchFilter(search, ['name', 'email']);
    Object.assign(filter, searchFilter);
  }

  const sort = buildSort(req.query.sort || '-createdAt');

  const [users, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  return ApiResponse.paginated(users, buildPaginationMeta(total, page, limit), 'Users fetched').send(res);
});

/**
 * GET /api/v1/admin/users/:id
 */
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).lean();
  if (!user) throw ApiError.notFound('User not found');

  let profile = null;
  if (user.role === 'student') {
    profile = await Student.findOne({ user: user._id }).populate('department course', 'name code').lean();
  } else if (user.role === 'teacher') {
    profile = await Teacher.findOne({ user: user._id }).populate('department subjects', 'name code').lean();
  }

  return new ApiResponse(200, { user, profile }, 'User fetched').send(res);
});

/**
 * PATCH /api/v1/admin/users/:id/status
 */
export const toggleUserStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive },
    { new: true, runValidators: true }
  );

  if (!user) throw ApiError.notFound('User not found');

  return new ApiResponse(200, { userId: user._id, isActive: user.isActive },
    `User ${isActive ? 'activated' : 'deactivated'} successfully`).send(res);
});

/**
 * DELETE /api/v1/admin/users/:id
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  if (user.role === 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
    if (adminCount <= 1) {
      throw ApiError.badRequest('Cannot delete the last admin account');
    }
  }

  // Soft delete by deactivating
  user.isActive = false;
  await user.save({ validateBeforeSave: false });

  return new ApiResponse(200, null, 'User deactivated successfully').send(res);
});

/**
 * GET /api/v1/admin/audit-logs
 */
export const getAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { userId, action, resource, startDate, endDate } = req.query;

  const filter = {};
  if (userId) filter.user = userId;
  if (action) filter.action = action;
  if (resource) filter.resource = resource;

  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate);
    if (endDate) filter.timestamp.$lte = new Date(endDate);
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('user', 'name email role')
      .sort('-timestamp')
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return ApiResponse.paginated(logs, buildPaginationMeta(total, page, limit), 'Audit logs fetched').send(res);
});

/**
 * GET /api/v1/admin/system-health
 */
export const getSystemHealth = asyncHandler(async (req, res) => {
  const mongoose = (await import('mongoose')).default;

  const dbState = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const [totalUsers, totalRecords] = await Promise.all([
    User.countDocuments(),
    Attendance.countDocuments(),
  ]);

  return new ApiResponse(200, {
    status: 'healthy',
    database: {
      status: dbState[mongoose.connection.readyState] || 'unknown',
      host: mongoose.connection.host,
    },
    memory: {
      used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
    },
    uptime: `${Math.floor(process.uptime() / 60)} minutes`,
    nodeVersion: process.version,
    stats: {
      totalUsers,
      totalAttendanceRecords: totalRecords,
    },
    timestamp: new Date().toISOString(),
  }, 'System health fetched').send(res);
});

/**
 * POST /api/v1/admin/broadcast-notification
 */
export const broadcastNotification = asyncHandler(async (req, res) => {
  const { title, message, type = 'system', targetRole } = req.body;

  const filter = { isActive: true };
  if (targetRole) filter.role = targetRole;

  const users = await User.find(filter).select('_id').lean();

  const notifications = users.map((u) => ({
    recipient: u._id,
    sender: req.user.id,
    type,
    title,
    message,
  }));

  await Notification.insertMany(notifications, { ordered: false });

  return new ApiResponse(200, { sent: notifications.length }, `Notification broadcast to ${notifications.length} users`).send(res);
});

/**
 * GET /api/v1/admin/geofence
 */
export const getGeofenceSetting = asyncHandler(async (req, res) => {
  let setting = await Setting.findOne({ key: 'geofence' });
  if (!setting) {
    setting = await Setting.create({
      key: 'geofence',
      value: {
        enabled: true,
        latitude: parseFloat(process.env.GEOLOCATION_LAT) || 28.6139,
        longitude: parseFloat(process.env.GEOLOCATION_LNG) || 77.2090,
        radiusMeters: parseFloat(process.env.GEOLOCATION_RADIUS) || 100,
        locationName: 'Main Campus Lecture Hall'
      },
      description: 'Campus Geofencing Location & Radius Settings'
    });
  }
  return new ApiResponse(200, setting.value, 'Geofence setting fetched successfully').send(res);
});

/**
 * PUT /api/v1/admin/geofence
 */
export const updateGeofenceSetting = asyncHandler(async (req, res) => {
  const { enabled, latitude, longitude, radiusMeters, locationName } = req.body;

  let setting = await Setting.findOne({ key: 'geofence' });
  const newValue = {
    enabled: enabled !== undefined ? Boolean(enabled) : true,
    latitude: latitude !== undefined ? parseFloat(latitude) : (setting?.value?.latitude || 28.6139),
    longitude: longitude !== undefined ? parseFloat(longitude) : (setting?.value?.longitude || 77.2090),
    radiusMeters: radiusMeters !== undefined ? parseFloat(radiusMeters) : (setting?.value?.radiusMeters || 100),
    locationName: locationName || setting?.value?.locationName || 'Campus Building'
  };

  if (setting) {
    setting.value = newValue;
    await setting.save();
  } else {
    setting = await Setting.create({
      key: 'geofence',
      value: newValue,
      description: 'Campus Geofencing Location & Radius Settings'
    });
  }

  return new ApiResponse(200, setting.value, 'Geofence configuration updated successfully').send(res);
});
