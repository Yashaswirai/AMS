import LeaveRequest from '../models/LeaveRequest.js';
import Student from '../models/Student.js';
import User from '../models/User.js';
import Subject from '../models/Subject.js';
import Attendance from '../models/Attendance.js';
import Notification from '../models/Notification.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { paginate, buildPaginationMeta } from '../utils/pagination.js';
import { uploadBufferToImageKit } from '../config/imagekit.js';
import { sendLeaveNotification } from '../services/emailService.js';
import { LEAVE_STATUS, ATTENDANCE_STATUS, ATTENDANCE_METHOD } from '../utils/constants.js';

/**
 * POST /api/v1/leaves
 * Submit leave request (student)
 */
export const submit = asyncHandler(async (req, res) => {
  const { startDate, endDate, reason, leaveType, affectedSubjects } = req.body;

  const student = await Student.findOne({ user: req.user.id });
  if (!student) throw ApiError.forbidden('Only students can submit leave requests');

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    throw ApiError.badRequest('Start date must be before or equal to end date');
  }

  let attachmentUrl = '';
  let attachmentPublicId = '';

  if (req.file) {
    const uploaded = await uploadBufferToImageKit(req.file.buffer, {
      fileName: `leave_${student._id}_${Date.now()}.${req.file.originalname.split('.').pop() || 'pdf'}`,
      folder: `/frams/leaves/${student._id}`,
    });
    attachmentUrl = uploaded.url;
    attachmentPublicId = uploaded.publicId;
  }

  let parsedAffectedSubjects = [];
  if (affectedSubjects) {
    parsedAffectedSubjects = Array.isArray(affectedSubjects)
      ? affectedSubjects
      : JSON.parse(affectedSubjects);
  }

  const leaveRequest = await LeaveRequest.create({
    student: student._id,
    startDate: start,
    endDate: end,
    reason,
    leaveType: leaveType || 'personal',
    attachmentUrl,
    attachmentPublicId,
    affectedSubjects: parsedAffectedSubjects,
  });

  // Notify head of department or admin
  const dept = student.department;
  // Look for department head or admin to notify
  const HOD = await User.findOne({ role: 'admin', isActive: true }); // Default to notifying an admin

  if (HOD) {
    await Notification.create({
      recipient: HOD._id,
      sender: req.user.id,
      type: 'leave',
      title: 'New Leave Request',
      message: `Student ${req.user.name} (${student.rollNumber}) requested leave from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}.`,
      metadata: { leaveRequestId: leaveRequest._id },
    });
  }

  return new ApiResponse(201, leaveRequest, 'Leave request submitted successfully').send(res);
});

/**
 * GET /api/v1/leaves
 */
export const getAll = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { status, studentId } = req.query;

  const filter = {};
  if (status) filter.status = status;

  // Role based filtering
  if (req.user.role === 'student') {
    const student = await Student.findOne({ user: req.user.id });
    if (!student) throw ApiError.notFound('Student profile not found');
    filter.student = student._id;
  } else if (studentId) {
    filter.student = studentId;
  }

  const [leaves, total] = await Promise.all([
    LeaveRequest.find(filter)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'name email avatar' }
      })
      .populate('affectedSubjects', 'name code')
      .populate('reviewedBy', 'name role')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .lean(),
    LeaveRequest.countDocuments(filter),
  ]);

  return ApiResponse.paginated(leaves, buildPaginationMeta(total, page, limit), 'Leave requests fetched successfully').send(res);
});

/**
 * POST /api/v1/leaves/:id/approve
 */
export const approve = asyncHandler(async (req, res) => {
  const { remarks } = req.body;
  const leave = await LeaveRequest.findById(leaveParamsCheck(req.params.id));
  if (!leave) throw ApiError.notFound('Leave request not found');

  if (leave.status !== LEAVE_STATUS.PENDING) {
    throw ApiError.badRequest(`Cannot approve a leave request that is already ${leave.status}`);
  }

  leave.status = LEAVE_STATUS.APPROVED;
  leave.remarks = remarks || '';
  leave.reviewedBy = req.user.id;
  leave.reviewedAt = new Date();
  await leave.save();

  // Automatically mark attendance as EXCUSED for matching dates and subjects
  const student = await Student.findById(leave.student).populate('user');
  const start = new Date(leave.startDate);
  const end = new Date(leave.endDate);

  // Get subjects list
  const subjects = leave.affectedSubjects.length > 0
    ? leave.affectedSubjects
    : await Subject.find({ course: student.course, isActive: true }).select('_id');

  const subjectIds = subjects.map((s) => s._id);

  // Loop through days of leave
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    // Ignore weekends for attendance records (optional but standard)
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    const dateStr = d.toISOString().split('T')[0];
    const formattedDate = new Date(dateStr);

    for (const subId of subjectIds) {
      // Mark for periods 1-6 or just standard period 1
      for (let p = 1; p <= 6; p++) {
        // Upsert attendance as excused
        await Attendance.findOneAndUpdate(
          { student: student._id, subject: subId, date: formattedDate, period: p },
          {
            status: ATTENDANCE_STATUS.EXCUSED,
            method: ATTENDANCE_METHOD.MANUAL,
            markedBy: req.user.id,
            remarks: `Approved Leave: ${leave.reason}`,
          },
          { upsert: true, new: true }
        );
      }
    }
  }

  // Notify student
  if (student && student.user) {
    sendLeaveNotification(
      student.user.email,
      student.user.name,
      student.user.name,
      leave.leaveType,
      LEAVE_STATUS.APPROVED,
      leave.startDate,
      leave.endDate
    ).catch((err) => console.error('Leave status email failed:', err.message));

    await Notification.create({
      recipient: student.user._id,
      sender: req.user.id,
      type: 'leave',
      title: 'Leave Request Approved',
      message: `Your leave request from ${leave.startDate.toLocaleDateString()} to ${leave.endDate.toLocaleDateString()} has been approved.`,
      metadata: { leaveRequestId: leave._id },
    });
  }

  return new ApiResponse(200, leave, 'Leave request approved successfully. Attendance marked as excused.').send(res);
});

/**
 * POST /api/v1/leaves/:id/reject
 */
export const reject = asyncHandler(async (req, res) => {
  const { remarks } = req.body;
  const leave = await LeaveRequest.findById(leaveParamsCheck(req.params.id));
  if (!leave) throw ApiError.notFound('Leave request not found');

  if (leave.status !== LEAVE_STATUS.PENDING) {
    throw ApiError.badRequest(`Cannot reject a leave request that is already ${leave.status}`);
  }

  leave.status = LEAVE_STATUS.REJECTED;
  leave.remarks = remarks || '';
  leave.reviewedBy = req.user.id;
  leave.reviewedAt = new Date();
  await leave.save();

  // Notify student
  const student = await Student.findById(leave.student).populate('user');
  if (student && student.user) {
    sendLeaveNotification(
      student.user.email,
      student.user.name,
      student.user.name,
      leave.leaveType,
      LEAVE_STATUS.REJECTED,
      leave.startDate,
      leave.endDate
    ).catch((err) => console.error('Leave status email failed:', err.message));

    await Notification.create({
      recipient: student.user._id,
      sender: req.user.id,
      type: 'leave',
      title: 'Leave Request Rejected',
      message: `Your leave request from ${leave.startDate.toLocaleDateString()} to ${leave.endDate.toLocaleDateString()} has been rejected. Remarks: ${remarks}`,
      metadata: { leaveRequestId: leave._id },
    });
  }

  return new ApiResponse(200, leave, 'Leave request rejected successfully').send(res);
});

const leaveParamsCheck = (id) => {
  if (!id) throw ApiError.badRequest('Leave request ID is required');
  return id;
};
