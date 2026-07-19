import Subject from '../models/Subject.js';
import Teacher from '../models/Teacher.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { paginate, buildPaginationMeta, buildSearchFilter, buildSort } from '../utils/pagination.js';

/**
 * GET /api/v1/subjects
 */
export const getAllSubjects = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { search, course, teacher, semester } = req.query;

  const filter = { isActive: true };
  if (course) filter.course = course;
  if (semester) filter.semester = parseInt(semester);

  if (req.user.role === 'teacher') {
    const teacherDoc = await Teacher.findOne({ user: req.user.id });
    if (teacherDoc) filter.teacher = teacherDoc._id;
  } else if (teacher) {
    filter.teacher = teacher;
  }

  if (req.user.role === 'student') {
    const studentDoc = await import('../models/Student.js').then(m => m.default).catch(() => null);
    if (studentDoc) {
      const student = await studentDoc.findOne({ user: req.user.id });
      if (student && student.course) filter.course = student.course;
    }
  }

  if (search) {
    Object.assign(filter, buildSearchFilter(search, ['name', 'code']));
  }

  const sort = buildSort(req.query.sort || 'name');

  const [subjects, total] = await Promise.all([
    Subject.find(filter)
      .populate('course', 'name code')
      .populate({
        path: 'teacher',
        populate: { path: 'user', select: 'name email' }
      })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Subject.countDocuments(filter),
  ]);

  return ApiResponse.paginated(subjects, buildPaginationMeta(total, page, limit), 'Subjects fetched successfully').send(res);
});

/**
 * GET /api/v1/subjects/:id
 */
export const getSubjectById = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id)
    .populate('course', 'name code duration')
    .populate({
      path: 'teacher',
      populate: { path: 'user', select: 'name email avatar' }
    })
    .lean();

  if (!subject) throw ApiError.notFound('Subject not found');

  return new ApiResponse(200, subject, 'Subject fetched successfully').send(res);
});

/**
 * POST /api/v1/subjects
 */
export const createSubject = asyncHandler(async (req, res) => {
  const { name, code, course, teacher, credits, semester, totalClasses, attendanceRequired, description, isElective } = req.body;

  const existingSubject = await Subject.findOne({ code: code.toUpperCase() });
  if (existingSubject) {
    throw ApiError.conflict(`Subject with code '${code}' already exists`);
  }

  const subject = await Subject.create({
    name,
    code: code.toUpperCase(),
    course,
    teacher: teacher || null,
    credits,
    semester,
    totalClasses: totalClasses || 0,
    attendanceRequired: attendanceRequired !== undefined ? attendanceRequired : 75,
    description,
    isElective: isElective || false,
  });

  // If a teacher is assigned, add this subject to their profile as well
  if (teacher) {
    await Teacher.findByIdAndUpdate(teacher, {
      $addToSet: { subjects: subject._id }
    });
  }

  return new ApiResponse(201, subject, 'Subject created successfully').send(res);
});

/**
 * PUT /api/v1/subjects/:id
 */
export const updateSubject = asyncHandler(async (req, res) => {
  const { name, code, course, teacher, credits, semester, totalClasses, attendanceRequired, description, isElective } = req.body;

  const subject = await Subject.findById(req.params.id);
  if (!subject) throw ApiError.notFound('Subject not found');

  const oldTeacher = subject.teacher;

  if (name) subject.name = name;
  if (code) subject.code = code.toUpperCase();
  if (course) subject.course = course;
  if (teacher !== undefined) subject.teacher = teacher || null;
  if (credits !== undefined) subject.credits = credits;
  if (semester !== undefined) subject.semester = semester;
  if (totalClasses !== undefined) subject.totalClasses = totalClasses;
  if (attendanceRequired !== undefined) subject.attendanceRequired = attendanceRequired;
  if (description !== undefined) subject.description = description;
  if (isElective !== undefined) subject.isElective = isElective;

  await subject.save();

  // If teacher changed, update their profile
  if (teacher !== undefined && String(oldTeacher) !== String(teacher)) {
    if (oldTeacher) {
      await Teacher.findByIdAndUpdate(oldTeacher, {
        $pull: { subjects: subject._id }
      });
    }
    if (teacher) {
      await Teacher.findByIdAndUpdate(teacher, {
        $addToSet: { subjects: subject._id }
      });
    }
  }

  const populated = await Subject.findById(subject._id)
    .populate('course', 'name code')
    .populate({
      path: 'teacher',
      populate: { path: 'user', select: 'name email' }
    })
    .lean();

  return new ApiResponse(200, populated, 'Subject updated successfully').send(res);
});

/**
 * DELETE /api/v1/subjects/:id
 */
export const deleteSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id);
  if (!subject) throw ApiError.notFound('Subject not found');

  subject.isActive = false;
  await subject.save();

  // Remove from teacher subjects
  if (subject.teacher) {
    await Teacher.findByIdAndUpdate(subject.teacher, {
      $pull: { subjects: subject._id }
    });
  }

  return new ApiResponse(200, null, 'Subject deactivated successfully').send(res);
});
