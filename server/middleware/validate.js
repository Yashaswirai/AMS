import { validationResult } from 'express-validator';
import ApiError from '../utils/ApiError.js';

/**
 * Middleware to run after express-validator chains
 * Collects all validation errors and throws an ApiError
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    return next(ApiError.badRequest('Validation failed', errorMessages));
  }

  next();
};

export default validate;
