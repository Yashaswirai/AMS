import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';
import Subject from '../models/Subject.js';
import Teacher from '../models/Teacher.js';
import Notification from '../models/Notification.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { paginate, buildPaginationMeta } from '../utils/pagination.js';
import { generateQRSession as createQR, validateQRSession, markQRSessionUsed } from '../services/qrService.js';
import { computeStudentStats } from '../services/analyticsService.js';
import { ATTENDANCE_STATUS, ATTENDANCE_METHOD } from '../utils/constants.js';

const CV_API_URL = process.env.CV_API_URL || 'http://localhost:8000';

/**
 * Helper: Update Student attendance percentage
 */
const updateStudentPercentage = async (studentId) => {
  const stats = await computeStudentStats(studentId);
  await Student.findByIdAndUpdate(studentId, {
    attendancePercentage: stats.overall.percentage,
  });
};

/**
 * Helper: Calculate geodesic distance in meters (Haversine formula)
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
};

/**
 * POST /api/v1/attendance/manual
 */
export const markManual = asyncHandler(async (req, res) => {
  const { studentId, subjectId, date, period, status, remarks } = req.body;

  const student = await Student.findById(studentId);
  if (!student) throw ApiError.notFound('Student not found');

  const subject = await Subject.findById(subjectId);
  if (!subject) throw ApiError.notFound('Subject not found');

  const formattedDate = new Date(date);
  formattedDate.setHours(0, 0, 0, 0);

  // Check if attendance record already exists
  let attendance = await Attendance.findOne({
    student: studentId,
    subject: subjectId,
    date: formattedDate,
    period,
  });

  if (attendance) {
    attendance.status = status;
    attendance.remarks = remarks;
    attendance.markedBy = req.user.id;
    attendance.method = ATTENDANCE_METHOD.MANUAL;
    await attendance.save();
  } else {
    attendance = await Attendance.create({
      student: studentId,
      subject: subjectId,
      date: formattedDate,
      period,
      status,
      remarks,
      markedBy: req.user.id,
      method: ATTENDANCE_METHOD.MANUAL,
    });
  }

  await updateStudentPercentage(studentId);

  // Emit real-time event
  const io = req.app.get('io') || global.io;
  if (io) {
    io.emit('attendanceMarked', {
      attendanceId: attendance._id,
      studentId,
      subjectId,
      status,
      date: formattedDate,
      period,
    });
  }

  return new ApiResponse(200, attendance, 'Attendance marked successfully (Manual)').send(res);
});

/**
 * POST /api/v1/attendance/bulk
 */
export const markBulk = asyncHandler(async (req, res) => {
  const { subjectId, date, period, records } = req.body; // records: [{ studentId, status }]

  const subject = await Subject.findById(subjectId);
  if (!subject) throw ApiError.notFound('Subject not found');

  const formattedDate = new Date(date);
  formattedDate.setHours(0, 0, 0, 0);

  const savedRecords = [];

  for (const record of records) {
    const { studentId, status } = record;

    let attendance = await Attendance.findOne({
      student: studentId,
      subject: subjectId,
      date: formattedDate,
      period,
    });

    if (attendance) {
      attendance.status = status;
      attendance.markedBy = req.user.id;
      attendance.method = ATTENDANCE_METHOD.MANUAL;
      await attendance.save();
    } else {
      attendance = await Attendance.create({
        student: studentId,
        subject: subjectId,
        date: formattedDate,
        period,
        status,
        markedBy: req.user.id,
        method: ATTENDANCE_METHOD.MANUAL,
      });
    }

    await updateStudentPercentage(studentId);
    savedRecords.push(attendance);
  }

  // Emit real-time event
  const io = req.app.get('io') || global.io;
  if (io) {
    io.emit('attendanceMarkedBulk', {
      subjectId,
      date: formattedDate,
      period,
      count: savedRecords.length,
    });
  }

  return new ApiResponse(200, savedRecords, `Bulk attendance marked for ${savedRecords.length} students`).send(res);
});

/**
 * POST /api/v1/attendance/face
 */
export const markByFace = asyncHandler(async (req, res) => {
  const { subjectId, period, date = new Date() } = req.body;

  if (!subjectId || !period) {
    throw ApiError.badRequest('Subject ID and Period are required');
  }

  if (!req.file) {
    throw ApiError.badRequest('Group/student image file is required');
  }

  const subject = await Subject.findById(subjectId);
  if (!subject) throw ApiError.notFound('Subject not found');

  const formattedDate = new Date(date);
  formattedDate.setHours(0, 0, 0, 0);

  // 1. Call CV-API to recognize faces
  const formData = new FormData();
  const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
  formData.append('image', blob, req.file.originalname);
  formData.append('threshold', '0.6');

  let cvResult;
  try {
    const response = await fetch(`${CV_API_URL}/api/face/recognize`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText);
    }
    cvResult = await response.json();
  } catch (err) {
    throw ApiError.internal(`Face recognition server error: ${err.message}`);
  }

  // 2. Map recognized matches
  const recognizedMatches = cvResult.matches || [];
  const recognizedStudentIds = new Set(
    recognizedMatches.filter((m) => m.matched).map((m) => m.student_id)
  );

  // Find all students enrolled in this course
  const enrolledStudents = await Student.find({ course: subject.course, isActive: true });

  const markedRecords = [];

  for (const student of enrolledStudents) {
    const isPresent = recognizedStudentIds.has(student._id.toString());
    const status = isPresent ? ATTENDANCE_STATUS.PRESENT : ATTENDANCE_STATUS.ABSENT;
    
    // Find confidence for recognized student
    const matchDetail = recognizedMatches.find((m) => m.student_id === student._id.toString());
    const confidence = matchDetail ? matchDetail.confidence : null;

    let attendance = await Attendance.findOne({
      student: student._id,
      subject: subjectId,
      date: formattedDate,
      period,
    });

    if (attendance) {
      attendance.status = status;
      attendance.method = ATTENDANCE_METHOD.FACE;
      attendance.confidence = confidence;
      attendance.markedBy = req.user.id;
      await attendance.save();
    } else {
      attendance = await Attendance.create({
        student: student._id,
        subject: subjectId,
        date: formattedDate,
        period,
        status,
        method: ATTENDANCE_METHOD.FACE,
        confidence,
        markedBy: req.user.id,
      });
    }

    await updateStudentPercentage(student._id);
    markedRecords.push(attendance);
  }

  // Emit real-time event
  const io = req.app.get('io') || global.io;
  if (io) {
    io.emit('attendanceMarkedFace', {
      subjectId,
      date: formattedDate,
      period,
      recognizedCount: recognizedStudentIds.size,
      totalCount: enrolledStudents.length,
    });
  }

  return new ApiResponse(200, {
    faceCount: cvResult.face_count,
    recognizedCount: recognizedStudentIds.size,
    enrolledCount: enrolledStudents.length,
    records: markedRecords,
  }, 'Face recognition attendance marked successfully').send(res);
});

/**
 * POST /api/v1/attendance/submit-session
 * Save attendance records from a real-time live recognition stream session.
 */
export const submitLiveSession = asyncHandler(async (req, res) => {
  const { subjectCode, subjectId, students = [], date = new Date(), period = 1 } = req.body;

  let subjectDoc = null;
  if (subjectId) {
    subjectDoc = await Subject.findById(subjectId);
  } else if (subjectCode) {
    subjectDoc = await Subject.findOne({ code: subjectCode });
  }

  if (!subjectDoc) {
    throw ApiError.notFound('Subject not found for code / ID provided');
  }

  const formattedDate = new Date(date);
  formattedDate.setHours(0, 0, 0, 0);

  const recognizedSet = new Set(students.map((s) => s.toString()));
  const enrolledStudents = await Student.find({ course: subjectDoc.course, isActive: true });

  const savedRecords = [];
  if (enrolledStudents.length > 0) {
    for (const student of enrolledStudents) {
      const isPresent = recognizedSet.has(student._id.toString()) || recognizedSet.has(student.rollNumber);
      const status = isPresent ? ATTENDANCE_STATUS.PRESENT : ATTENDANCE_STATUS.ABSENT;

      let attendance = await Attendance.findOne({
        student: student._id,
        subject: subjectDoc._id,
        date: formattedDate,
        period,
      });

      if (attendance) {
        attendance.status = status;
        attendance.method = ATTENDANCE_METHOD.FACE;
        attendance.markedBy = req.user.id;
        await attendance.save();
      } else {
        attendance = await Attendance.create({
          student: student._id,
          subject: subjectDoc._id,
          date: formattedDate,
          period,
          status,
          method: ATTENDANCE_METHOD.FACE,
          markedBy: req.user.id,
        });
      }

      await updateStudentPercentage(student._id);
      savedRecords.push(attendance);
    }
  } else {
    // Save recognized students directly if no course association filter exists
    for (const studentId of students) {
      let attendance = await Attendance.findOne({
        student: studentId,
        subject: subjectDoc._id,
        date: formattedDate,
        period,
      });

      if (attendance) {
        attendance.status = ATTENDANCE_STATUS.PRESENT;
        attendance.method = ATTENDANCE_METHOD.FACE;
        attendance.markedBy = req.user.id;
        await attendance.save();
      } else {
        attendance = await Attendance.create({
          student: studentId,
          subject: subjectDoc._id,
          date: formattedDate,
          period,
          status: ATTENDANCE_STATUS.PRESENT,
          method: ATTENDANCE_METHOD.FACE,
          markedBy: req.user.id,
        });
      }
      await updateStudentPercentage(studentId);
      savedRecords.push(attendance);
    }
  }

  // Emit real-time event
  const io = req.app.get('io') || global.io;
  if (io) {
    io.emit('attendanceSessionSubmitted', {
      subjectId: subjectDoc._id,
      subjectCode: subjectDoc.code,
      date: formattedDate,
      period,
      count: savedRecords.length,
    });
  }

  return new ApiResponse(200, {
    count: savedRecords.length,
    presentCount: savedRecords.filter((r) => r.status === ATTENDANCE_STATUS.PRESENT).length,
    records: savedRecords,
  }, 'Live face recognition session attendance saved successfully').send(res);
});

/**
 * POST /api/v1/attendance/qr
 */
export const markByQR = asyncHandler(async (req, res) => {
  const { sessionId, studentId, location } = req.body;

  const student = await Student.findById(studentId);
  if (!student) throw ApiError.notFound('Student not found');

  // Validate session
  const session = validateQRSession(sessionId, studentId);

  // Geolocation check if configured
  const reqLat = process.env.GEOLOCATION_LAT;
  const reqLng = process.env.GEOLOCATION_LNG;
  const radius = process.env.GEOLOCATION_RADIUS ? parseFloat(process.env.GEOLOCATION_RADIUS) : null;

  if (reqLat && reqLng && radius) {
    if (!location || location.lat === undefined || location.lng === undefined) {
      throw ApiError.badRequest('Location is required for QR attendance check');
    }

    const distance = calculateDistance(
      parseFloat(reqLat),
      parseFloat(reqLng),
      location.lat,
      location.lng
    );

    if (distance > radius) {
      throw ApiError.badRequest(`Location verification failed. You are ${Math.round(distance)}m away from the class (max allowed: ${radius}m).`);
    }
  }

  const formattedDate = new Date(session.date);
  formattedDate.setHours(0, 0, 0, 0);

  // Create attendance record
  let attendance = await Attendance.findOne({
    student: studentId,
    subject: session.subjectId,
    date: formattedDate,
    period: session.period,
  });

  if (attendance) {
    attendance.status = ATTENDANCE_STATUS.PRESENT;
    attendance.method = ATTENDANCE_METHOD.QR;
    attendance.qrSessionId = sessionId;
    attendance.markedBy = student.user; // Student marked themselves via QR
    await attendance.save();
  } else {
    attendance = await Attendance.create({
      student: studentId,
      subject: session.subjectId,
      date: formattedDate,
      period: session.period,
      status: ATTENDANCE_STATUS.PRESENT,
      method: ATTENDANCE_METHOD.QR,
      qrSessionId: sessionId,
      markedBy: student.user,
    });
  }

  // Mark session as used to prevent double scan
  markQRSessionUsed(sessionId, studentId);
  await updateStudentPercentage(studentId);

  // Emit real-time event
  const io = req.app.get('io') || global.io;
  if (io) {
    io.emit('attendanceMarked', {
      attendanceId: attendance._id,
      studentId,
      subjectId: session.subjectId,
      status: ATTENDANCE_STATUS.PRESENT,
      date: formattedDate,
      period: session.period,
      method: 'qr',
    });
  }

  return new ApiResponse(200, attendance, 'Attendance marked successfully via QR scan').send(res);
});

/**
 * POST /api/v1/attendance/qr-session
 * Generate a QR session
 */
export const generateQRSession = asyncHandler(async (req, res) => {
  const { subjectId, period, date = new Date(), expirySeconds } = req.body;

  if (!subjectId || !period) {
    throw ApiError.badRequest('Subject ID and Period are required');
  }

  const subject = await Subject.findById(subjectId);
  if (!subject) throw ApiError.notFound('Subject not found');

  // Find teacher profile of requesting user
  const teacher = await Teacher.findOne({ user: req.user.id });
  if (!teacher) throw ApiError.forbidden('Only teachers can generate QR sessions');

  const session = await createQR({
    subjectId,
    teacherId: teacher._id,
    date,
    period,
    expirySeconds,
  });

  return new ApiResponse(200, session, 'QR session generated successfully').send(res);
});

/**
 * GET /api/v1/attendance/history
 */
export const getHistory = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  let resolvedStudentId = studentId;
  if (studentId === 'me' || req.user?.role === 'student') {
    const student = await Student.findOne({ user: req.user?._id || req.user?.id });
    resolvedStudentId = student ? student._id : null;
  }

  const filter = {};

  if (resolvedStudentId) filter.student = resolvedStudentId;
  else if (studentId === 'me' || req.user?.role === 'student') filter.student = null; // No attendance if no student profile
  if (subjectId) filter.subject = subjectId;
  if (status) filter.status = status;

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  // Filter by course or semester (requires populating and filtering or joining)
  if (courseId || semester) {
    const studentFilters = {};
    if (courseId) studentFilters.course = courseId;
    if (semester) studentFilters.semester = parseInt(semester);
    
    const students = await Student.find(studentFilters).select('_id').lean();
    filter.student = { $in: students.map((s) => s._id) };
  }

  const [records, total] = await Promise.all([
    Attendance.find(filter)
      .populate('student', 'rollNumber')
      .populate({ path: 'student', populate: { path: 'user', select: 'name email' } })
      .populate('subject', 'name code')
      .populate('markedBy', 'name role')
      .sort('-date -period')
      .skip(skip)
      .limit(limit)
      .lean(),
    Attendance.countDocuments(filter),
  ]);

  return ApiResponse.paginated(records, buildPaginationMeta(total, page, limit), 'Attendance history fetched').send(res);
});

/**
 * GET /api/v1/attendance/stats/:studentId
 */
export const getStats = asyncHandler(async (req, res) => {
  let { studentId } = req.params;

  if (studentId === 'me') {
    const student = await Student.findOne({ user: req.user?._id || req.user?.id });
    if (!student) {
      return new ApiResponse(200, {
        overallPercentage: 0,
        totalClasses: 0,
        attendedClasses: 0,
        absentClasses: 0,
        subjects: [],
        aiInsight: 'Welcome! No attendance records registered yet.'
      }, 'Student stats fetched').send(res);
    }
    studentId = student._id;
  }

  const stats = await computeStudentStats(studentId);
  return new ApiResponse(200, stats, 'Attendance statistics fetched').send(res);
});

/**
 * POST /api/v1/attendance/correction-request
 */
export const requestCorrection = asyncHandler(async (req, res) => {
  const { attendanceId, reason } = req.body;

  const attendance = await Attendance.findById(attendanceId);
  if (!attendance) throw ApiError.notFound('Attendance record not found');

  // Verify that only the student themselves or a teacher can request a correction
  const student = await Student.findOne({ user: req.user.id });
  if (req.user.role === 'student' && (!student || String(attendance.student) !== String(student._id))) {
    throw ApiError.forbidden('You can only request corrections for your own attendance records');
  }

  attendance.correctionRequested = true;
  attendance.correctionReason = reason;
  await attendance.save();

  // Create system notification for teacher
  const subject = await Subject.findById(attendance.subject).populate('teacher');
  if (subject && subject.teacher) {
    await Notification.create({
      recipient: subject.teacher.user,
      sender: req.user.id,
      type: 'leave', // reuse leave category for approval requests
      title: 'Attendance Correction Request',
      message: `Correction requested for Student ID: ${student?.rollNumber || 'N/A'} in ${subject.name} on ${new Date(attendance.date).toLocaleDateString()}. Reason: ${reason}`,
      metadata: { attendanceId: attendance._id },
    });
  }

  return new ApiResponse(200, attendance, 'Correction request submitted successfully').send(res);
});

/**
 * POST /api/v1/attendance/correction-approve/:id
 */
export const approveCorrection = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status = ATTENDANCE_STATUS.PRESENT } = req.body;

  const attendance = await Attendance.findById(id);
  if (!attendance) throw ApiError.notFound('Attendance record not found');

  attendance.status = status;
  attendance.correctionRequested = false;
  attendance.correctionReason = undefined;
  attendance.correctionApprovedBy = req.user.id;
  await attendance.save();

  await updateStudentPercentage(attendance.student);

  // Notify student
  const student = await Student.findById(attendance.student);
  if (student) {
    await Notification.create({
      recipient: student.user,
      sender: req.user.id,
      type: 'system',
      title: 'Attendance Correction Approved',
      message: `Your attendance correction request has been approved. Status updated to ${status}.`,
      metadata: { attendanceId: attendance._id },
    });
  }

  return new ApiResponse(200, attendance, 'Attendance correction approved successfully').send(res);
});
