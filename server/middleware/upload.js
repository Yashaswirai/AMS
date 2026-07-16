import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import ApiError from '../utils/ApiError.js';

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

// Memory storage for ImageKit uploads
const memoryStorage = multer.memoryStorage();

// File filter for images
const imageFileFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        `Invalid file type: ${file.mimetype}. Only JPEG, PNG, and WebP images are allowed.`
      ),
      false
    );
  }
};

// File filter for documents (PDF + images)
const documentFileFilter = (req, file, cb) => {
  if (ALLOWED_DOC_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        `Invalid file type. Only PDF and image files are allowed.`
      ),
      false
    );
  }
};

// Upload single avatar/profile image (max 5MB)
export const uploadAvatar = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
}).single('avatar');

// Upload single face image for recognition (max 10MB)
export const uploadFaceImage = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
}).single('image');

// Upload multiple face images for dataset registration (max 10 images, 10MB each)
export const uploadFaceDataset = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 10,
  },
}).array('images', 10);

// Upload leave attachment document (max 5MB)
export const uploadDocument = multer({
  storage: memoryStorage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
}).single('attachment');

// Multer error handler wrapper
export const handleMulterError = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new ApiError(400, 'File size exceeds the maximum allowed limit'));
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return next(new ApiError(400, 'Too many files. Maximum allowed is 10'));
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(new ApiError(400, `Unexpected field name: ${err.field}`));
        }
        return next(new ApiError(400, `File upload error: ${err.message}`));
      }
      if (err) return next(err);
      next();
    });
  };
};
