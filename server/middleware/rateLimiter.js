import rateLimit from 'express-rate-limit';
import ApiError from '../utils/ApiError.js';

const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
      next(ApiError.tooManyRequests(message));
    },
  });

// General API limiter: 100 requests per 15 minutes
export const generalLimiter = createLimiter(
  15 * 60 * 1000,
  100,
  'Too many requests from this IP. Please try again after 15 minutes.'
);

// Auth limiter: 10 requests per 15 minutes
export const authLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  'Too many authentication attempts. Please try again after 15 minutes.'
);

// Face recognition limiter: 20 requests per minute
export const faceLimiter = createLimiter(
  60 * 1000,
  20,
  'Too many face recognition requests. Please try again after 1 minute.'
);

// Password reset limiter: 5 requests per hour
export const passwordResetLimiter = createLimiter(
  60 * 60 * 1000,
  5,
  'Too many password reset attempts. Please try again after 1 hour.'
);

// Report generation limiter: 10 per hour
export const reportLimiter = createLimiter(
  60 * 60 * 1000,
  10,
  'Too many report generation requests. Please try again after 1 hour.'
);

export default generalLimiter;
