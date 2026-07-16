import jwt from 'jsonwebtoken';

/**
 * Generate JWT access token (short-lived)
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '15m',
    issuer: 'FRAMS',
    audience: 'frams-client',
  });
};

/**
 * Generate JWT refresh token (long-lived)
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
    issuer: 'FRAMS',
    audience: 'frams-client',
  });
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = (user) => {
  const payload = {
    id: user._id.toString(),
    role: user.role,
    email: user.email,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return { accessToken, refreshToken };
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET, {
    issuer: 'FRAMS',
    audience: 'frams-client',
  });
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
    issuer: 'FRAMS',
    audience: 'frams-client',
  });
};

/**
 * Set refresh token as httpOnly cookie
 */
export const setRefreshTokenCookie = (res, refreshToken) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/',
  };

  res.cookie('refreshToken', refreshToken, cookieOptions);
};

/**
 * Clear refresh token cookie
 */
export const clearRefreshTokenCookie = (res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
  });
};
