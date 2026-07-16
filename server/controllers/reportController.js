import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';
import Subject from '../models/Subject.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { generatePDFReport, generateCSVReport, generateExcelReport } from '../services/reportService.js';

const getReportData = async (query) => {
  const { studentId, subjectId, startDate, endDate, courseId, semester } = query;

  const filter = {};

  if (studentId) filter.student = studentId;
  if (subjectId) filter.subject = subjectId;

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  if (courseId || semester) {
    const studentFilters = {};
    if (courseId) studentFilters.course = courseId;
    if (semester) studentFilters.semester = parseInt(semester);
    const students = await Student.find(studentFilters).select('_id').lean();
    filter.student = { $in: students.map((s) => s._id) };
  }

  const records = await Attendance.find(filter)
    .populate('student', 'rollNumber')
    .populate({ path: 'student', populate: { path: 'user', select: 'name email' } })
    .populate('subject', 'name code')
    .sort('-date -period')
    .lean();

  const formattedRecords = records.map((r) => ({
    'Student Name': r.student?.user?.name || 'Unknown',
    'Roll Number': r.student?.rollNumber || 'N/A',
    'Subject Name': r.subject?.name || 'N/A',
    'Subject Code': r.subject?.code || 'N/A',
    'Date': r.date ? new Date(r.date).toISOString().split('T')[0] : 'N/A',
    'Period': r.period,
    'Status': r.status,
    'Method': r.method,
    'Remarks': r.remarks || '',
  }));

  const total = formattedRecords.length;
  const present = formattedRecords.filter((r) => ['present', 'late'].includes(r.Status)).length;
  const percentage = total > 0 ? (present / total) * 100 : 0;

  const summary = {
    totalRecords: total,
    presentCount: present,
    absentCount: total - present,
    averageAttendance: `${percentage.toFixed(2)}%`,
  };

  return { summary, records: formattedRecords };
};

/**
 * GET /api/v1/reports/pdf
 */
export const generatePDF = asyncHandler(async (req, res) => {
  const data = await getReportData(req.query);

  const title = req.query.title || 'Attendance Summary Report';
  const pdfBuffer = await generatePDFReport(data, {
    title,
    generatedBy: req.user.name,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${Date.now()}.pdf`);
  return res.send(pdfBuffer);
});

/**
 * GET /api/v1/reports/csv
 */
export const generateCSV = asyncHandler(async (req, res) => {
  const data = await getReportData(req.query);

  const csvBuffer = generateCSVReport(data.records);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${Date.now()}.csv`);
  return res.send(csvBuffer);
});

/**
 * GET /api/v1/reports/excel
 */
export const generateExcel = asyncHandler(async (req, res) => {
  const data = await getReportData(req.query);

  const excelBuffer = generateExcelReport(data, {
    title: req.query.title || 'Attendance Summary Report',
    generatedBy: req.user.name,
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${Date.now()}.xlsx`);
  return res.send(excelBuffer);
});
