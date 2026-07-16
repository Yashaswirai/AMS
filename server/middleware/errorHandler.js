import ApiError from '../utils/ApiError.js';

/**
 * Global error handler middleware
 * Must be the last middleware registered in Express
 */
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Log error details
  if (process.env.NODE_ENV !== 'test') {
    console.error(`\n❌ [${new Date().toISOString()}] Error on ${req.method} ${req.originalUrl}`);
    console.error(`   Status: ${error.statusCode || 500}`);
    console.error(`   Message: ${error.message}`);
    if (process.env.NODE_ENV === 'development') {
      console.error(`   Stack: ${error.stack}`);
    }
  }

  // Mongoose: CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    error = ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
  }

  // Mongoose: ValidationError
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    error = ApiError.badRequest('Validation failed', messages);
  }

  // Mongoose: Duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    const value = err.keyValue ? err.keyValue[field] : '';
    error = ApiError.conflict(
      `Duplicate value: '${value}' for field '${field}'. This record already exists.`
    );
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('Token has expired');
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = ApiError.badRequest('File size exceeds the allowed limit');
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    error = ApiError.badRequest('Too many files uploaded');
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = ApiError.badRequest(`Unexpected field: ${err.field}`);
  }

  // Default to 500 if not an operational error
  const statusCode = error.statusCode || 500;
  const message =
    error.isOperational
      ? error.message
      : process.env.NODE_ENV === 'development'
        ? error.message
        : 'An unexpected error occurred. Please try again.';

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: error.errors || [],
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

export default errorHandler;
