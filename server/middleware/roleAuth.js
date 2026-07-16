import ApiError from '../utils/ApiError.js';

/**
 * Role-based authorization middleware
 * Usage: authorize('admin', 'teacher')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Role '${req.user.role}' is not authorized to access this resource. Required: ${roles.join(' or ')}`
        )
      );
    }

    next();
  };
};

export default authorize;
