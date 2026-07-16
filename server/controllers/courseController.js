import Course from '../models/Course.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { paginate, buildPaginationMeta, buildSearchFilter, buildSort } from '../utils/pagination.js';

/**
 * GET /api/v1/courses
 */
export const getAllCourses = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { search, department } = req.query;

  const filter = { isActive: true };
  if (department) filter.department = department;

  if (search) {
    Object.assign(filter, buildSearchFilter(search, ['name', 'code']));
  }

  const sort = buildSort(req.query.sort || 'name');

  const [courses, total] = await Promise.all([
    Course.find(filter)
      .populate('department', 'name code')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Course.countDocuments(filter),
  ]);

  return ApiResponse.paginated(courses, buildPaginationMeta(total, page, limit), 'Courses fetched successfully').send(res);
});

/**
 * GET /api/v1/courses/:id
 */
export const getCourseById = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id)
    .populate('department', 'name code description')
    .lean();

  if (!course) throw ApiError.notFound('Course not found');

  return new ApiResponse(200, course, 'Course fetched successfully').send(res);
});

/**
 * POST /api/v1/courses
 */
export const createCourse = asyncHandler(async (req, res) => {
  const { name, code, department, duration, totalSeats, description } = req.body;

  const existingCourse = await Course.findOne({ code: code.toUpperCase() });
  if (existingCourse) {
    throw ApiError.conflict(`Course with code '${code}' already exists`);
  }

  const course = await Course.create({
    name,
    code: code.toUpperCase(),
    department,
    duration,
    totalSeats,
    description,
  });

  return new ApiResponse(201, course, 'Course created successfully').send(res);
});

/**
 * PUT /api/v1/courses/:id
 */
export const updateCourse = asyncHandler(async (req, res) => {
  const { name, code, department, duration, totalSeats, description } = req.body;

  const course = await Course.findById(req.params.id);
  if (!course) throw ApiError.notFound('Course not found');

  if (name) course.name = name;
  if (code) course.code = code.toUpperCase();
  if (department) course.department = department;
  if (duration !== undefined) {
    course.duration = duration;
    course.totalSemesters = duration * 2;
  }
  if (totalSeats !== undefined) course.totalSeats = totalSeats;
  if (description !== undefined) course.description = description;

  await course.save();

  const populated = await Course.findById(course._id)
    .populate('department', 'name code')
    .lean();

  return new ApiResponse(200, populated, 'Course updated successfully').send(res);
});

/**
 * DELETE /api/v1/courses/:id
 */
export const deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw ApiError.notFound('Course not found');

  course.isActive = false;
  await course.save();

  return new ApiResponse(200, null, 'Course deactivated successfully').send(res);
});
