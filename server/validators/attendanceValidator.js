import { body, param, query } from 'express-validator';

export const markManualValidator = [
  body('studentId')
    .notEmpty().withMessage('Student ID is required')
    .isMongoId().withMessage('Invalid student ID format'),

  body('subjectId')
    .notEmpty().withMessage('Subject ID is required')
    .isMongoId().withMessage('Invalid subject ID format'),

  body('date')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Date must be in ISO 8601 format'),

  body('period')
    .notEmpty().withMessage('Period is required')
    .isInt({ min: 1, max: 10 }).withMessage('Period must be between 1 and 10'),

  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['present', 'absent', 'late', 'excused']).withMessage('Invalid attendance status'),

  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Remarks cannot exceed 500 characters'),
];

export const markBulkValidator = [
  body('subjectId')
    .notEmpty().withMessage('Subject ID is required')
    .isMongoId().withMessage('Invalid subject ID format'),

  body('date')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Date must be in ISO 8601 format'),

  body('period')
    .notEmpty().withMessage('Period is required')
    .isInt({ min: 1, max: 10 }).withMessage('Period must be between 1 and 10'),

  body('records')
    .isArray({ min: 1 }).withMessage('Records must be a non-empty array'),

  body('records.*.studentId')
    .notEmpty().withMessage('Student ID is required in each record')
    .isMongoId().withMessage('Invalid student ID in records'),

  body('records.*.status')
    .notEmpty().withMessage('Status is required in each record')
    .isIn(['present', 'absent', 'late', 'excused']).withMessage('Invalid status in records'),
];

export const markByQRValidator = [
  body('sessionId')
    .notEmpty().withMessage('QR session ID is required')
    .isUUID().withMessage('Invalid session ID format'),

  body('studentId')
    .notEmpty().withMessage('Student ID is required')
    .isMongoId().withMessage('Invalid student ID format'),

  body('location')
    .optional()
    .isObject().withMessage('Location must be an object'),

  body('location.lat')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),

  body('location.lng')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
];

export const correctionRequestValidator = [
  body('attendanceId')
    .notEmpty().withMessage('Attendance ID is required')
    .isMongoId().withMessage('Invalid attendance ID format'),

  body('reason')
    .trim()
    .notEmpty().withMessage('Reason is required')
    .isLength({ min: 10, max: 500 }).withMessage('Reason must be between 10 and 500 characters'),
];
