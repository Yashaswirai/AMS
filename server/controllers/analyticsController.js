import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import {
  computeOverview,
  computeDepartmentBreakdown,
  computeCourseBreakdown,
  computeSubjectAnalysis,
  computeMonthlyTrends,
  computeHeatmap,
  computeStudentRankings
} from '../services/analyticsService.js';

/**
 * GET /api/v1/analytics/overview
 */
export const overview = asyncHandler(async (req, res) => {
  const stats = await computeOverview();
  return new ApiResponse(200, stats, 'System-wide analytics overview fetched').send(res);
});

/**
 * GET /api/v1/analytics/departments
 */
export const departmentBreakdown = asyncHandler(async (req, res) => {
  const stats = await computeDepartmentBreakdown();
  return new ApiResponse(200, stats, 'Department breakdown stats fetched').send(res);
});

/**
 * GET /api/v1/analytics/courses
 */
export const courseBreakdown = asyncHandler(async (req, res) => {
  const stats = await computeCourseBreakdown();
  return new ApiResponse(200, stats, 'Course breakdown stats fetched').send(res);
});

/**
 * GET /api/v1/analytics/subjects
 */
export const subjectAnalysis = asyncHandler(async (req, res) => {
  const filters = {
    semester: req.query.semester,
    course: req.query.course,
  };
  const stats = await computeSubjectAnalysis(filters);
  return new ApiResponse(200, stats, 'Subject analysis stats fetched').send(res);
});

/**
 * GET /api/v1/analytics/rankings
 */
export const studentRankings = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const stats = await computeStudentRankings(limit);
  return new ApiResponse(200, stats, 'Top/bottom student attendance rankings fetched').send(res);
});

/**
 * GET /api/v1/analytics/heatmap
 */
export const heatmap = asyncHandler(async (req, res) => {
  const stats = await computeHeatmap();
  return new ApiResponse(200, stats, 'Attendance period-day heatmap data fetched').send(res);
});

/**
 * GET /api/v1/analytics/trends
 */
export const trends = asyncHandler(async (req, res) => {
  const stats = await computeMonthlyTrends();
  return new ApiResponse(200, stats, 'Monthly attendance trends fetched').send(res);
});
