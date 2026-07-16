import Timetable from '../models/Timetable.js';
import Teacher from '../models/Teacher.js';
import Student from '../models/Student.js';
import Subject from '../models/Subject.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

/**
 * GET /api/v1/timetable
 */
export const getAllTimetables = asyncHandler(async (req, res) => {
  const { day, semester, course, department, teacher } = req.query;

  const filter = { isActive: true };
  if (day !== undefined) filter.day = parseInt(day);
  if (semester !== undefined) filter.semester = parseInt(semester);
  if (course) filter.course = course;
  if (department) filter.department = department;
  if (teacher) filter.teacher = teacher;

  const timetable = await Timetable.find(filter)
    .populate('subject', 'name code')
    .populate({
      path: 'teacher',
      populate: { path: 'user', select: 'name email' }
    })
    .populate('course', 'name code')
    .populate('department', 'name code')
    .sort({ day: 1, period: 1 })
    .lean();

  return new ApiResponse(200, timetable, 'Timetable entries fetched successfully').send(res);
});

/**
 * GET /api/v1/timetable/:id
 */
export const getTimetableById = asyncHandler(async (req, res) => {
  const entry = await Timetable.findById(req.params.id)
    .populate('subject', 'name code')
    .populate({
      path: 'teacher',
      populate: { path: 'user', select: 'name email' }
    })
    .populate('course', 'name code')
    .populate('department', 'name code')
    .lean();

  if (!entry) throw ApiError.notFound('Timetable entry not found');

  return new ApiResponse(200, entry, 'Timetable entry fetched successfully').send(res);
});

/**
 * POST /api/v1/timetable
 */
export const createTimetable = asyncHandler(async (req, res) => {
  const { subject, teacher, day, startTime, endTime, room, semester, period, course, department } = req.body;

  // Check if subject exists
  const sub = await Subject.findById(subject);
  if (!sub) throw ApiError.badRequest('Subject not found');

  // Check if teacher exists
  const t = await Teacher.findById(teacher);
  if (!t) throw ApiError.badRequest('Teacher not found');

  // Check overlap for teacher on same day & period
  const teacherOverlap = await Timetable.findOne({
    teacher,
    day,
    period,
    isActive: true,
  });
  if (teacherOverlap) {
    throw ApiError.conflict('Teacher is already scheduled for another class in this period');
  }

  // Check overlap for course, semester, day & period
  const courseOverlap = await Timetable.findOne({
    course,
    semester,
    day,
    period,
    isActive: true,
  });
  if (courseOverlap) {
    throw ApiError.conflict('This class semester already has a scheduled subject for this period');
  }

  const entry = await Timetable.create({
    subject,
    teacher,
    day,
    startTime,
    endTime,
    room,
    semester,
    period,
    course: course || sub.course,
    department: department || t.department,
  });

  return new ApiResponse(201, entry, 'Timetable entry created successfully').send(res);
});

/**
 * PUT /api/v1/timetable/:id
 */
export const updateTimetable = asyncHandler(async (req, res) => {
  const { subject, teacher, day, startTime, endTime, room, semester, period, course, department } = req.body;

  const entry = await Timetable.findById(req.params.id);
  if (!entry) throw ApiError.notFound('Timetable entry not found');

  if (subject) {
    const sub = await Subject.findById(subject);
    if (!sub) throw ApiError.badRequest('Subject not found');
    entry.subject = subject;
  }

  if (teacher) {
    const t = await Teacher.findById(teacher);
    if (!t) throw ApiError.badRequest('Teacher not found');
    entry.teacher = teacher;
  }

  if (day !== undefined) entry.day = day;
  if (startTime) entry.startTime = startTime;
  if (endTime) entry.endTime = endTime;
  if (room !== undefined) entry.room = room;
  if (semester !== undefined) entry.semester = semester;
  if (period !== undefined) entry.period = period;
  if (course) entry.course = course;
  if (department) entry.department = department;

  // Re-check overlap if teacher, day, or period changed
  if (teacher !== undefined || day !== undefined || period !== undefined) {
    const teacherOverlap = await Timetable.findOne({
      _id: { $ne: entry._id },
      teacher: entry.teacher,
      day: entry.day,
      period: entry.period,
      isActive: true,
    });
    if (teacherOverlap) {
      throw ApiError.conflict('Teacher is already scheduled for another class in this period');
    }

    const courseOverlap = await Timetable.findOne({
      _id: { $ne: entry._id },
      course: entry.course,
      semester: entry.semester,
      day: entry.day,
      period: entry.period,
      isActive: true,
    });
    if (courseOverlap) {
      throw ApiError.conflict('This class semester already has a scheduled subject for this period');
    }
  }

  await entry.save();

  const populated = await Timetable.findById(entry._id)
    .populate('subject', 'name code')
    .populate({
      path: 'teacher',
      populate: { path: 'user', select: 'name email' }
    })
    .lean();

  return new ApiResponse(200, populated, 'Timetable entry updated successfully').send(res);
});

/**
 * DELETE /api/v1/timetable/:id
 */
export const deleteTimetable = asyncHandler(async (req, res) => {
  const entry = await Timetable.findById(req.params.id);
  if (!entry) throw ApiError.notFound('Timetable entry not found');

  entry.isActive = false;
  await entry.save();

  return new ApiResponse(200, null, 'Timetable entry deleted successfully').send(res);
});

/**
 * GET /api/v1/timetable/teacher/:teacherId
 */
export const getByTeacher = asyncHandler(async (req, res) => {
  let { teacherId } = req.params;

  if (teacherId === 'me') {
    const teacher = await Teacher.findOne({ user: req.user.id });
    if (!teacher) throw ApiError.notFound('Teacher profile not found');
    teacherId = teacher._id;
  }

  const entries = await Timetable.find({ teacher: teacherId, isActive: true })
    .populate('subject', 'name code credits')
    .populate('course', 'name code')
    .populate('department', 'name code')
    .sort({ day: 1, period: 1 })
    .lean();

  return new ApiResponse(200, entries, 'Teacher timetable fetched successfully').send(res);
});

/**
 * GET /api/v1/timetable/student/:studentId
 */
export const getByStudent = asyncHandler(async (req, res) => {
  let { studentId } = req.params;

  if (studentId === 'me') {
    const student = await Student.findOne({ user: req.user.id });
    if (!student) throw ApiError.notFound('Student profile not found');
    studentId = student._id;
  }

  const student = await Student.findById(studentId).lean();
  if (!student) throw ApiError.notFound('Student not found');

  const entries = await Timetable.find({
    course: student.course,
    semester: student.semester,
    isActive: true,
  })
    .populate('subject', 'name code credits')
    .populate({
      path: 'teacher',
      populate: { path: 'user', select: 'name' }
    })
    .sort({ day: 1, period: 1 })
    .lean();

  return new ApiResponse(200, entries, 'Student timetable fetched successfully').send(res);
});
