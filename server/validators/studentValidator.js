import { body } from 'express-validator';

export const createStudentValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),

  body('rollNumber')
    .trim()
    .notEmpty().withMessage('Roll number is required')
    .isLength({ max: 20 }).withMessage('Roll number cannot exceed 20 characters'),

  body('department')
    .notEmpty().withMessage('Department is required')
    .isMongoId().withMessage('Invalid department ID'),

  body('course')
    .notEmpty().withMessage('Course is required')
    .isMongoId().withMessage('Invalid course ID'),

  body('year')
    .notEmpty().withMessage('Year is required')
    .isInt({ min: 1, max: 4 }).withMessage('Year must be between 1 and 4'),

  body('semester')
    .notEmpty().withMessage('Semester is required')
    .isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8'),

  body('parentEmail')
    .optional()
    .trim()
    .isEmail().withMessage('Please enter a valid parent email')
    .normalizeEmail(),

  body('parentPhone')
    .optional()
    .trim()
    .matches(/^[+]?[\d\s\-().]{7,15}$/).withMessage('Invalid parent phone number'),

  body('dateOfBirth')
    .optional()
    .isISO8601().withMessage('Date of birth must be a valid date'),

  body('gender')
    .optional()
    .isIn(['male', 'female', 'other']).withMessage('Gender must be male, female, or other'),
];

export const updateStudentValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('year')
    .optional()
    .isInt({ min: 1, max: 4 }).withMessage('Year must be between 1 and 4'),

  body('semester')
    .optional()
    .isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8'),

  body('cgpa')
    .optional()
    .isFloat({ min: 0, max: 10 }).withMessage('CGPA must be between 0 and 10'),

  body('parentEmail')
    .optional()
    .trim()
    .isEmail().withMessage('Please enter a valid parent email')
    .normalizeEmail(),

  body('parentPhone')
    .optional()
    .trim()
    .matches(/^[+]?[\d\s\-().]{7,15}$/).withMessage('Invalid parent phone number'),
];
