import { verifyAccessToken } from '../utils/generateToken.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import User from '../models/User.js';

const verifyToken = asyncHandler(async (req, res, next) => {
  let token;

  // Check Authorization header first
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // Fallback to cookie
  if (!token && req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    throw ApiError.unauthorized('Access token is required. Please login.');
  }

  try {
    const decoded = verifyAccessToken(token);

    // Fetch fresh user from DB to ensure they still exist and are active
    const user = await User.findById(decoded.id).select('+isActive');
    if (!user) {
      throw ApiError.unauthorized('User associated with this token no longer exists.');
    }

    if (!user.isActive) {
      throw ApiError.unauthorized('Your account has been deactivated. Please contact admin.');
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    };

    next();
  } catch (err) {
    if (err instanceof ApiError) throw err;

    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Access token has expired. Please refresh your session.');
    }

    if (err.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized('Invalid access token.');
    }

    throw ApiError.unauthorized('Token verification failed.');
  }
});

export default verifyToken;
