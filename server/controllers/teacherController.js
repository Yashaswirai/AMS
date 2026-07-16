import Teacher from '../models/Teacher.js';
import User from '../models/User.js';
import Subject from '../models/Subject.js';
import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { paginate, buildPaginationMeta, buildSearchFilter, buildSort } from '../utils/pagination.js';
import { computeSubjectAnalysis } from '../services/analyticsService.js';
import { uploadBufferToImageKit, deleteFromImageKit } from '../config/imagekit.js';

/**
 * GET /api/v1/teachers
 */
export const getAllTeachers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { search, department } = req.query;

  const filter = { isActive: true };
  if (department) filter.department = department;

  if (search) {
    const users = await User.find(buildSearchFilter(search, ['name', 'email'])).select('_id').lean();
    const userIds = users.map((u) => u._id);
    filter.$or = [
      { user: { $in: userIds } },
      { employeeId: new RegExp(search, 'i') },
    ];
  }

  const sort = buildSort(req.query.sort || '-createdAt');

  const [teachers, total] = await Promise.all([
    Teacher.find(filter)
      .populate('user', 'name email avatar')
      .populate('department', 'name code')
      .populate('subjects', 'name code')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Teacher.countDocuments(filter),
  ]);

  return ApiResponse.paginated(teachers, buildPaginationMeta(total, page, limit), 'Teachers fetched successfully').send(res);
});

/**
 * GET /api/v1/teachers/:id
 */
export const getTeacherById = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id)
    .populate('user', 'name email avatar phoneNumber createdAt')
    .populate('department', 'name code')
    .populate('subjects', 'name code')
    .lean();

  if (!teacher) throw ApiError.notFound('Teacher not found');

  return new ApiResponse(200, teacher, 'Teacher fetched successfully').send(res);
});

/**
 * POST /api/v1/teachers
 */
export const createTeacher = asyncHandler(async (req, res) => {
  const { name, email, password = 'Teacher@123', employeeId, department, subjects, qualification, specialization, experience, designation } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) throw ApiError.conflict('Email already registered');

  const existingEmpId = await Teacher.findOne({ employeeId: employeeId.toUpperCase() });
  if (existingEmpId) throw ApiError.conflict(`Employee ID '${employeeId}' already exists`);

  const user = await User.create({
    name,
    email,
    password,
    role: 'teacher',
    isVerified: true,
  });

  const teacher = await Teacher.create({
    user: user._id,
    employeeId: employeeId.toUpperCase(),
    department,
    subjects: subjects || [],
    qualification,
    specialization,
    experience,
    designation,
  });

  const populated = await Teacher.findById(teacher._id)
    .populate('user', 'name email')
    .populate('department', 'name code')
    .populate('subjects', 'name code')
    .lean();

  return new ApiResponse(201, populated, 'Teacher created successfully').send(res);
});

/**
 * PUT /api/v1/teachers/:id
 */
export const updateTeacher = asyncHandler(async (req, res) => {
  const { subjects, qualification, specialization, experience, designation } = req.body;

  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) throw ApiError.notFound('Teacher not found');

  if (subjects !== undefined) teacher.subjects = subjects;
  if (qualification !== undefined) teacher.qualification = qualification;
  if (specialization !== undefined) teacher.specialization = specialization;
  if (experience !== undefined) teacher.experience = experience;
  if (designation !== undefined) teacher.designation = designation;

  // Handle avatar update via user model
  if (req.file) {
    const user = await User.findById(teacher.user);
    if (user) {
      if (user.avatar && user.avatar.publicId) {
        await deleteFromImageKit(user.avatar.publicId).catch(() => {});
      }
      const uploaded = await uploadBufferToImageKit(req.file.buffer, {
        fileName: `avatar_${teacher.employeeId}_${Date.now()}.jpg`,
        folder: '/frams/avatars',
      });
      user.avatar = { url: uploaded.url, publicId: uploaded.publicId };
      await user.save({ validateBeforeSave: false });
    }
  }

  await teacher.save();

  const populated = await Teacher.findById(teacher._id)
    .populate('user', 'name email avatar')
    .populate('department', 'name code')
    .populate('subjects', 'name code')
    .lean();

  return new ApiResponse(200, populated, 'Teacher updated successfully').send(res);
});

/**
 * DELETE /api/v1/teachers/:id
 */
export const deleteTeacher = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) throw ApiError.notFound('Teacher not found');

  teacher.isActive = false;
  await teacher.save();

  await User.findByIdAndUpdate(teacher.user, { isActive: false });

  return new ApiResponse(200, null, 'Teacher deactivated successfully').send(res);
});

/**
 * GET /api/v1/teachers/:id/dashboard
 * Or teacher's own dashboard
 */
export const getTeacherDashboard = asyncHandler(async (req, res) => {
  let teacherId = req.params.id;

  // If "me", resolve from req.user
  if (teacherId === 'me') {
    const t = await Teacher.findOne({ user: req.user.id }).select('_id');
    if (!t) throw ApiError.notFound('Teacher profile not found');
    teacherId = t._id;
  }

  const teacher = await Teacher.findById(teacherId).populate('subjects').lean();
  if (!teacher) throw ApiError.notFound('Teacher not found');

  const subjectIds = teacher.subjects.map((s) => s._id);

  // Total subjects
  const totalSubjects = teacher.subjects.length;

  // Aggregate attendance rates per subject for this teacher
  const subjectAnalysis = await computeSubjectAnalysis({ _id: { $in: subjectIds } });
  const teacherSubjectAnalysis = subjectAnalysis.filter((sa) =>
    subjectIds.map((id) => id.toString()).includes(sa.subjectId.toString())
  );

  // Calculate average attendance for teacher's subjects
  const totalPresent = teacherSubjectAnalysis.reduce((acc, curr) => acc + curr.present, 0);
  const totalClasses = teacherSubjectAnalysis.reduce((acc, curr) => acc + curr.attendedClasses, 0);
  const avgAttendance = totalClasses > 0 ? (totalPresent / totalClasses) * 100 : 0;

  // At-risk students count in this teacher's subjects
  const atRiskCount = teacherSubjectAnalysis.reduce((acc, curr) => acc + curr.atRiskStudents, 0);

  // Recent attendance marked in teacher's subjects
  const recentAttendance = await Attendance.find({ subject: { $in: subjectIds } })
    .populate('student', 'user rollNumber')
    .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
    .populate('subject', 'name code')
    .sort('-createdAt')
    .limit(10)
    .lean();

  return new ApiResponse(200, {
    totalSubjects,
    avgAttendance: Math.round(avgAttendance * 100) / 100,
    atRiskStudents: atRiskCount,
    subjects: teacherSubjectAnalysis,
    recentAttendance: recentAttendance.map((ra) => ({
      id: ra._id,
      studentName: ra.student?.user?.name || 'Unknown',
      rollNumber: ra.student?.rollNumber || '',
      subjectName: ra.subject?.name || '',
      subjectCode: ra.subject?.code || '',
      date: ra.date,
      period: ra.period,
      status: ra.status,
      method: ra.method,
    })),
  }, 'Teacher dashboard statistics fetched').send(res);
});
