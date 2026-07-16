import crypto from 'crypto';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import Department from '../models/Department.js';
import Course from '../models/Course.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { generateTokenPair, verifyRefreshToken, setRefreshTokenCookie, clearRefreshTokenCookie } from '../utils/generateToken.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService.js';
import { uploadBufferToImageKit, deleteFromImageKit } from '../config/imagekit.js';
import { ROLES } from '../utils/constants.js';

/**
 * POST /api/v1/auth/register
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role = ROLES.STUDENT, rollNumber, employeeId, departmentId, courseId, year, semester } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw ApiError.conflict(`Email '${email}' is already registered`);
  }

  // Create user
  const user = new User({ name, email, password, role, isVerified: false });

  // Generate email verification token
  const rawToken = user.generateVerificationToken();
  await user.save();

  // Create role-specific profile
  try {
    if (role === ROLES.STUDENT) {
      if (!rollNumber) throw ApiError.badRequest('Roll number is required for student registration');

      const existingRoll = await Student.findOne({ rollNumber: rollNumber.toUpperCase() });
      if (existingRoll) throw ApiError.conflict(`Roll number '${rollNumber}' already exists`);

      const dept = await Department.findById(departmentId);
      if (!dept) throw ApiError.badRequest('Invalid department ID');

      const course = await Course.findById(courseId);
      if (!course) throw ApiError.badRequest('Invalid course ID');

      await Student.create({
        user: user._id,
        rollNumber: rollNumber.toUpperCase(),
        department: departmentId,
        course: courseId,
        year: year || 1,
        semester: semester || 1,
      });

    } else if (role === ROLES.TEACHER) {
      if (!employeeId) throw ApiError.badRequest('Employee ID is required for teacher registration');

      const existingEmpId = await Teacher.findOne({ employeeId: employeeId.toUpperCase() });
      if (existingEmpId) throw ApiError.conflict(`Employee ID '${employeeId}' already exists`);

      const dept = await Department.findById(departmentId);
      if (!dept) throw ApiError.badRequest('Invalid department ID');

      await Teacher.create({
        user: user._id,
        employeeId: employeeId.toUpperCase(),
        department: departmentId,
      });
    }
  } catch (err) {
    // Rollback user creation if profile creation fails
    await User.findByIdAndDelete(user._id);
    throw err;
  }

  // Send verification email (non-blocking)
  sendVerificationEmail(user, rawToken).catch((err) =>
    console.error('Verification email failed:', err.message)
  );

  return new ApiResponse(201, {
    userId: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    isVerified: user.isVerified,
  }, 'Registration successful! Please check your email to verify your account.').send(res);
});

/**
 * POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;

  // Fetch user with password
  const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil');
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Check account lock
  if (user.isLocked) {
    const lockMins = Math.ceil((user.lockUntil - Date.now()) / 60000);
    throw ApiError.unauthorized(`Account temporarily locked. Try again in ${lockMins} minute(s).`);
  }

  // Check active status
  if (!user.isActive) {
    throw ApiError.unauthorized('Your account has been deactivated. Please contact admin.');
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    await user.incrementLoginAttempts();
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Verify role if provided
  if (role && user.role !== role) {
    throw ApiError.unauthorized(`Access denied: This account is not registered as a ${role}`);
  }

  // Check email verification
  if (!user.isVerified) {
    throw ApiError.unauthorized('Please verify your email address before logging in. Check your inbox.');
  }

  // Reset login attempts on successful login
  await user.resetLoginAttempts();

  // Generate tokens
  const { accessToken, refreshToken } = generateTokenPair(user);

  // Store refresh token hash in DB
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  // Set refresh token cookie
  setRefreshTokenCookie(res, refreshToken);

  // Fetch role-specific profile
  let profile = null;
  if (user.role === ROLES.STUDENT) {
    profile = await Student.findOne({ user: user._id })
      .populate('department', 'name code')
      .populate('course', 'name code')
      .lean();
  } else if (user.role === ROLES.TEACHER) {
    profile = await Teacher.findOne({ user: user._id })
      .populate('department', 'name code')
      .lean();
  }

  return new ApiResponse(200, {
    accessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      isVerified: user.isVerified,
      lastLogin: user.lastLogin,
    },
    profile,
  }, 'Login successful').send(res);
});

/**
 * POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  // Clear refresh token from DB
  await User.findByIdAndUpdate(req.user.id, { $unset: { refreshToken: 1 } });

  // Clear cookie
  clearRefreshTokenCookie(res);

  return new ApiResponse(200, null, 'Logged out successfully').send(res);
});

/**
 * POST /api/v1/auth/refresh
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!token) {
    throw ApiError.unauthorized('Refresh token is required');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch (err) {
    clearRefreshTokenCookie(res);
    throw ApiError.unauthorized('Invalid or expired refresh token. Please login again.');
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || !user.isActive) {
    clearRefreshTokenCookie(res);
    throw ApiError.unauthorized('User not found or account deactivated');
  }

  // Verify refresh token matches stored token
  if (user.refreshToken !== token) {
    clearRefreshTokenCookie(res);
    throw ApiError.unauthorized('Refresh token mismatch. Please login again.');
  }

  // Generate new token pair
  const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(user);

  // Update stored refresh token
  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  // Set new refresh token cookie
  setRefreshTokenCookie(res, newRefreshToken);

  return new ApiResponse(200, { accessToken }, 'Token refreshed successfully').send(res);
});

/**
 * POST /api/v1/auth/verify-email
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw ApiError.badRequest('Verification token is required');
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    verificationToken: hashedToken,
    verificationTokenExpiry: { $gt: Date.now() },
  }).select('+verificationToken +verificationTokenExpiry');

  if (!user) {
    throw ApiError.badRequest('Invalid or expired verification token. Please request a new verification email.');
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpiry = undefined;
  await user.save({ validateBeforeSave: false });

  return new ApiResponse(200, { userId: user._id, email: user.email }, 'Email verified successfully. You can now login.').send(res);
});

/**
 * POST /api/v1/auth/forgot-password
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  // Return 200 even if user not found (security: don't reveal account existence)
  if (!user) {
    return new ApiResponse(200, null, 'If an account with that email exists, a password reset link has been sent.').send(res);
  }

  const rawToken = user.generateResetToken();
  await user.save({ validateBeforeSave: false });

  sendPasswordResetEmail(user, rawToken).catch((err) =>
    console.error('Password reset email failed:', err.message)
  );

  return new ApiResponse(200, null, 'Password reset link sent to your email address.').send(res);
});

/**
 * POST /api/v1/auth/reset-password
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpiry: { $gt: Date.now() },
  }).select('+resetPasswordToken +resetPasswordExpiry');

  if (!user) {
    throw ApiError.badRequest('Invalid or expired reset token. Please request a new password reset.');
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiry = undefined;
  user.refreshToken = undefined; // Invalidate all sessions
  await user.save();

  clearRefreshTokenCookie(res);

  return new ApiResponse(200, null, 'Password reset successfully. Please login with your new password.').send(res);
});

/**
 * GET /api/v1/auth/me
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).lean();
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  let profile = null;
  if (user.role === ROLES.STUDENT) {
    profile = await Student.findOne({ user: user._id })
      .populate('department', 'name code')
      .populate('course', 'name code')
      .lean();
  } else if (user.role === ROLES.TEACHER) {
    profile = await Teacher.findOne({ user: user._id })
      .populate('department', 'name code')
      .populate('subjects', 'name code')
      .lean();
  }

  return new ApiResponse(200, { user, profile }, 'User profile fetched').send(res);
});

/**
 * PATCH /api/v1/auth/update-profile
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phoneNumber, currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select('+password');
  if (!user) throw ApiError.notFound('User not found');

  if (name) user.name = name;
  if (phoneNumber) user.phoneNumber = phoneNumber;

  // Handle avatar upload
  if (req.file) {
    if (user.avatar && user.avatar.publicId) {
      await deleteFromImageKit(user.avatar.publicId).catch(() => {});
    }
    const uploaded = await uploadBufferToImageKit(req.file.buffer, {
      fileName: `avatar_${user._id}_${Date.now()}.jpg`,
      folder: '/frams/avatars',
    });
    user.avatar = { url: uploaded.url, publicId: uploaded.publicId };
  }

  // Handle password change
  if (currentPassword && newPassword) {
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw ApiError.badRequest('Current password is incorrect');
    }
    user.password = newPassword;
    // Invalidate refresh tokens
    user.refreshToken = undefined;
    clearRefreshTokenCookie(res);
  }

  await user.save();

  return new ApiResponse(200, {
    id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    phoneNumber: user.phoneNumber,
  }, 'Profile updated successfully').send(res);
});

/**
 * POST /api/v1/auth/resend-verification
 */
export const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email }).select('+verificationToken +verificationTokenExpiry');
  if (!user) {
    return new ApiResponse(200, null, 'If an account with that email exists, a verification email has been sent.').send(res);
  }

  if (user.isVerified) {
    throw ApiError.conflict('Email is already verified');
  }

  const rawToken = user.generateVerificationToken();
  await user.save({ validateBeforeSave: false });

  sendVerificationEmail(user, rawToken).catch((err) =>
    console.error('Resend verification email failed:', err.message)
  );

  return new ApiResponse(200, null, 'Verification email resent successfully').send(res);
});
