/**
 * Wraps async route handlers to catch errors and pass them to next()
 * Eliminates the need for try/catch in every controller
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;
