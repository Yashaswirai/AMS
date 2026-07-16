import Department from '../models/Department.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { paginate, buildPaginationMeta, buildSearchFilter, buildSort } from '../utils/pagination.js';

/**
 * GET /api/v1/departments
 */
export const getAllDepartments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { search } = req.query;

  const filter = { isActive: true };

  if (search) {
    Object.assign(filter, buildSearchFilter(search, ['name', 'code']));
  }

  const sort = buildSort(req.query.sort || 'name');

  const [departments, total] = await Promise.all([
    Department.find(filter)
      .populate({
        path: 'head',
        populate: { path: 'user', select: 'name email' }
      })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Department.countDocuments(filter),
  ]);

  return ApiResponse.paginated(departments, buildPaginationMeta(total, page, limit), 'Departments fetched successfully').send(res);
});

/**
 * GET /api/v1/departments/:id
 */
export const getDepartmentById = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id)
    .populate({
      path: 'head',
      populate: { path: 'user', select: 'name email avatar' }
    })
    .lean();

  if (!department) throw ApiError.notFound('Department not found');

  return new ApiResponse(200, department, 'Department fetched successfully').send(res);
});

/**
 * POST /api/v1/departments
 */
export const createDepartment = asyncHandler(async (req, res) => {
  const { name, code, description, head, establishedYear } = req.body;

  const existingDept = await Department.findOne({
    $or: [{ name }, { code: code.toUpperCase() }],
  });

  if (existingDept) {
    throw ApiError.conflict('Department with same name or code already exists');
  }

  const department = await Department.create({
    name,
    code: code.toUpperCase(),
    description,
    head: head || null,
    establishedYear,
  });

  return new ApiResponse(201, department, 'Department created successfully').send(res);
});

/**
 * PUT /api/v1/departments/:id
 */
export const updateDepartment = asyncHandler(async (req, res) => {
  const { name, code, description, head, establishedYear, totalStudents } = req.body;

  const department = await Department.findById(req.params.id);
  if (!department) throw ApiError.notFound('Department not found');

  if (name) department.name = name;
  if (code) department.code = code.toUpperCase();
  if (description !== undefined) department.description = description;
  if (head !== undefined) department.head = head || null;
  if (establishedYear !== undefined) department.establishedYear = establishedYear;
  if (totalStudents !== undefined) department.totalStudents = totalStudents;

  await department.save();

  const populated = await Department.findById(department._id)
    .populate({
      path: 'head',
      populate: { path: 'user', select: 'name email' }
    })
    .lean();

  return new ApiResponse(200, populated, 'Department updated successfully').send(res);
});

/**
 * DELETE /api/v1/departments/:id
 */
export const deleteDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) throw ApiError.notFound('Department not found');

  department.isActive = false;
  await department.save();

  return new ApiResponse(200, null, 'Department deactivated successfully').send(res);
});
