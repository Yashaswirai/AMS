import Student from '../models/Student.js';
import User from '../models/User.js';
import FaceDataset from '../models/FaceDataset.js';
import Attendance from '../models/Attendance.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { paginate, buildPaginationMeta, buildSearchFilter, buildSort } from '../utils/pagination.js';
import { computeStudentStats } from '../services/analyticsService.js';
import { uploadBufferToImageKit, deleteFromImageKit } from '../config/imagekit.js';

/**
 * GET /api/v1/students
 */
export const getAllStudents = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { search, department, course, year, semester, faceRegistered } = req.query;

  const filter = { isActive: true };
  if (department) filter.department = department;
  if (course) filter.course = course;
  if (year) filter.year = parseInt(year);
  if (semester) filter.semester = parseInt(semester);
  if (faceRegistered !== undefined) filter.faceRegistered = faceRegistered === 'true';

  let studentQuery = Student.find(filter)
    .populate('user', 'name email avatar phoneNumber')
    .populate('department', 'name code')
    .populate('course', 'name code');

  if (search) {
    // Search by name or roll number
    const users = await User.find(buildSearchFilter(search, ['name', 'email'])).select('_id').lean();
    const userIds = users.map((u) => u._id);
    filter.$or = [
      { user: { $in: userIds } },
      { rollNumber: new RegExp(search, 'i') },
    ];
  }

  const sort = buildSort(req.query.sort || '-createdAt');

  const [students, total] = await Promise.all([
    Student.find(filter)
      .populate('user', 'name email avatar')
      .populate('department', 'name code')
      .populate('course', 'name code')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Student.countDocuments(filter),
  ]);

  return ApiResponse.paginated(students, buildPaginationMeta(total, page, limit), 'Students fetched').send(res);
});

/**
 * GET /api/v1/students/:id
 */
export const getStudentById = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id)
    .populate('user', 'name email avatar phoneNumber createdAt')
    .populate('department', 'name code')
    .populate('course', 'name code duration')
    .lean();

  if (!student) throw ApiError.notFound('Student not found');

  return new ApiResponse(200, student, 'Student fetched').send(res);
});

/**
 * POST /api/v1/students
 */
export const createStudent = asyncHandler(async (req, res) => {
  const { name, email, password = 'Student@123', rollNumber, department, course, year, semester, parentEmail, parentPhone, gender, dateOfBirth } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) throw ApiError.conflict('Email already registered');

  const existingRoll = await Student.findOne({ rollNumber: rollNumber.toUpperCase() });
  if (existingRoll) throw ApiError.conflict(`Roll number '${rollNumber}' already exists`);

  const user = await User.create({
    name,
    email,
    password,
    role: 'student',
    isVerified: true,
  });

  const student = await Student.create({
    user: user._id,
    rollNumber: rollNumber.toUpperCase(),
    department,
    course,
    year,
    semester,
    parentEmail,
    parentPhone,
    gender,
    dateOfBirth,
  });

  const populated = await Student.findById(student._id)
    .populate('user', 'name email')
    .populate('department', 'name code')
    .populate('course', 'name code')
    .lean();

  return new ApiResponse(201, populated, 'Student created successfully').send(res);
});

/**
 * PUT /api/v1/students/:id
 */
export const updateStudent = asyncHandler(async (req, res) => {
  const { year, semester, cgpa, parentEmail, parentPhone, address, gender, dateOfBirth } = req.body;

  const student = await Student.findById(req.params.id);
  if (!student) throw ApiError.notFound('Student not found');

  if (year !== undefined) student.year = year;
  if (semester !== undefined) student.semester = semester;
  if (cgpa !== undefined) student.cgpa = cgpa;
  if (parentEmail !== undefined) student.parentEmail = parentEmail;
  if (parentPhone !== undefined) student.parentPhone = parentPhone;
  if (address !== undefined) student.address = address;
  if (gender !== undefined) student.gender = gender;
  if (dateOfBirth !== undefined) student.dateOfBirth = dateOfBirth;

  // Handle avatar update via user model
  if (req.file) {
    const user = await User.findById(student.user);
    if (user) {
      if (user.avatar && user.avatar.publicId) {
        await deleteFromImageKit(user.avatar.publicId).catch(() => {});
      }
      const uploaded = await uploadBufferToImageKit(req.file.buffer, {
        fileName: `avatar_${student.rollNumber}_${Date.now()}.jpg`,
        folder: '/frams/avatars',
      });
      user.avatar = { url: uploaded.url, publicId: uploaded.publicId };
      await user.save({ validateBeforeSave: false });
    }
  }

  await student.save();

  const populated = await Student.findById(student._id)
    .populate('user', 'name email avatar')
    .populate('department', 'name code')
    .populate('course', 'name code')
    .lean();

  return new ApiResponse(200, populated, 'Student updated successfully').send(res);
});

/**
 * DELETE /api/v1/students/:id
 */
export const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw ApiError.notFound('Student not found');

  student.isActive = false;
  await student.save();

  await User.findByIdAndUpdate(student.user, { isActive: false });

  return new ApiResponse(200, null, 'Student deactivated successfully').send(res);
});

/**
 * GET /api/v1/students/:id/face-profile
 */
export const getFaceProfile = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id).lean();
  if (!student) throw ApiError.notFound('Student not found');

  const faceDataset = await FaceDataset.findOne({ student: req.params.id }).lean();

  return new ApiResponse(200, {
    studentId: req.params.id,
    faceRegistered: student.faceRegistered,
    faceDatasetPath: student.faceDatasetPath,
    dataset: faceDataset,
  }, 'Face profile fetched').send(res);
});

/**
 * GET /api/v1/students/:id/attendance
 */
export const getStudentAttendance = asyncHandler(async (req, res) => {
  const { subjectId, startDate, endDate, page, limit } = req.query;
  const { skip } = paginate(req.query);

  const filter = { student: req.params.id };
  if (subjectId) filter.subject = subjectId;
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  const [records, total] = await Promise.all([
    Attendance.find(filter)
      .populate('subject', 'name code')
      .populate('markedBy', 'name role')
      .sort('-date')
      .skip(skip)
      .limit(parseInt(limit) || 20)
      .lean(),
    Attendance.countDocuments(filter),
  ]);

  const stats = await computeStudentStats(req.params.id);

  return ApiResponse.paginated({ records, stats }, buildPaginationMeta(total, parseInt(page) || 1, parseInt(limit) || 20), 'Student attendance fetched').send(res);
});

/**
 * GET /api/v1/students/my-profile
 */
export const getMyProfile = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ user: req.user.id })
    .populate('user', 'name email avatar phoneNumber')
    .populate('department', 'name code')
    .populate('course', 'name code duration')
    .lean();

  if (!student) throw ApiError.notFound('Student profile not found');

  const stats = await computeStudentStats(student._id);

  return new ApiResponse(200, { student, stats }, 'Profile fetched').send(res);
});
