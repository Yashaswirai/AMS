import rateLimit from 'express-rate-limit';
import ApiError from '../utils/ApiError.js';

const isProduction = process.env.NODE_ENV === 'production';
const isLimiterForceEnabled = process.env.ENABLE_RATE_LIMITER === 'true';
const shouldEnableLimiter = isProduction || isLimiterForceEnabled;

if (!shouldEnableLimiter) {
  console.log('ℹ️  Rate limiters bypassed (Development Mode). Set NODE_ENV=production or ENABLE_RATE_LIMITER=true to enable.');
} else {
  console.log('🛡️  Rate limiters ACTIVE (Production Mode / Force Enabled).');
}

/**
 * Factory helper for environment-aware rate limiters
 */
const createLimiter = (windowMs, max, message) => {
  if (!shouldEnableLimiter) {
    // Pass-through middleware in development mode
    return (req, res, next) => next();
  }

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
      next(ApiError.tooManyRequests(message));
    },
  });
};

// General API limiter: 500 requests per 15 minutes in production
export const generalLimiter = createLimiter(
  15 * 60 * 1000,
  500,
  'Too many requests from this IP. Please try again after 15 minutes.'
);

// Auth / Login limiter: 10 requests per 15 minutes in production
export const authLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  'Too many authentication/login attempts. Please try again after 15 minutes.'
);

// Face recognition stream limiter: 60 requests per minute in production
export const faceLimiter = createLimiter(
  60 * 1000,
  60,
  'Too many face recognition requests. Please try again after 1 minute.'
);

// Password reset limiter: 5 requests per hour in production
export const passwordResetLimiter = createLimiter(
  60 * 60 * 1000,
  5,
  'Too many password reset attempts. Please try again after 1 hour.'
);

// Report generation limiter: 20 per hour in production
export const reportLimiter = createLimiter(
  60 * 60 * 1000,
  20,
  'Too many report generation requests. Please try again after 1 hour.'
);

export default generalLimiter;
