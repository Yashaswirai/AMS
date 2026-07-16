import Student from '../models/Student.js';
import FaceDataset from '../models/FaceDataset.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { uploadBufferToImageKit, deleteFromImageKit } from '../config/imagekit.js';

const CV_API_URL = process.env.CV_API_URL || 'http://localhost:8000';

/**
 * POST /api/v1/face/register
 * Register a student's face by uploading images, sending them to cv-api, and saving metadata.
 */
export const registerFace = asyncHandler(async (req, res) => {
  const { studentId } = req.body;
  if (!studentId) throw ApiError.badRequest('Student ID is required');

  const student = await Student.findById(studentId);
  if (!student) throw ApiError.notFound('Student not found');

  if (!req.files || req.files.length === 0) {
    throw ApiError.badRequest('At least one face image is required');
  }

  // 1. Upload images to ImageKit
  const uploadPromises = req.files.map((file, idx) =>
    uploadBufferToImageKit(file.buffer, {
      fileName: `face_${studentId}_${idx}_${Date.now()}.${file.originalname.split('.').pop() || 'jpg'}`,
      folder: `/frams/faces/${studentId}`,
    })
  );

  const uploadedImages = await Promise.all(uploadPromises);
  const imageUrls = uploadedImages.map((img) => img.url);
  const imagePublicIds = uploadedImages.map((img) => img.publicId);

  // 2. Call CV-API to generate embeddings
  try {
    const formData = new FormData();
    formData.append('student_id', studentId);
    
    // Add all uploaded files as Blobs with filenames
    req.files.forEach((file) => {
      const blob = new Blob([file.buffer], { type: file.mimetype });
      formData.append('images', blob, file.originalname);
    });

    const response = await fetch(`${CV_API_URL}/api/face/register`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`CV-API face registration failed: ${errText}`);
    }

    const cvResult = await response.json();

    // 3. Save FaceDataset in MongoDB
    let faceDataset = await FaceDataset.findOne({ student: studentId });
    const imagePaths = uploadedImages.map((img) => ({
      url: img.url,
      publicId: img.publicId,
    }));

    if (faceDataset) {
      // Cleanup old images from ImageKit if re-registering
      const deletePromises = faceDataset.imagePaths.map((img) => 
        deleteFromImageKit(img.publicId).catch(() => {})
      );
      await Promise.all(deletePromises);

      faceDataset.imagePaths = imagePaths;
      faceDataset.qualityScore = cvResult.quality || 1.0;
      faceDataset.totalImages = imagePaths.length;
      faceDataset.isProcessed = true;
      await faceDataset.save();
    } else {
      faceDataset = await FaceDataset.create({
        student: studentId,
        imagePaths,
        qualityScore: cvResult.quality || 1.0,
        totalImages: imagePaths.length,
        isProcessed: true,
      });
    }

    // 4. Update Student face registration status (CV-API handles embedding storage locally)
    student.faceRegistered = true;
    student.faceDatasetPath = faceDataset._id.toString();
    // Save a placeholder or mock embedding since face embeddings are kept on FastAPI server
    student.faceEmbeddings = [1.0, 0.0, 0.0]; 
    await student.save();

    return new ApiResponse(200, {
      studentId,
      faceRegistered: true,
      faceDataset,
      cvResult,
    }, 'Face registered successfully').send(res);

  } catch (error) {
    // Rollback ImageKit uploads on error
    const rollbackPromises = imagePublicIds.map((id) => deleteFromImageKit(id).catch(() => {}));
    await Promise.all(rollbackPromises);

    throw ApiError.internal(`Face registration failed: ${error.message}`);
  }
});

/**
 * POST /api/v1/face/recognize
 * Recognize faces in an image by sending it to cv-api and returning matches.
 */
export const recognizeFace = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('Image file is required');
  }

  const threshold = req.body.threshold || 0.6;

  try {
    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append('image', blob, req.file.originalname);
    formData.append('threshold', String(threshold));

    const response = await fetch(`${CV_API_URL}/api/face/recognize`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`CV-API face recognition failed: ${errText}`);
    }

    const cvResult = await response.json();

    // Map matches to include student details
    const matches = await Promise.all(
      (cvResult.matches || []).map(async (match) => {
        if (match.matched && match.student_id) {
          const student = await Student.findById(match.student_id)
            .populate('user', 'name email avatar')
            .populate('department', 'name code')
            .lean();
          
          if (student) {
            return {
              matched: true,
              studentId: student._id,
              name: student.user?.name,
              rollNumber: student.rollNumber,
              department: student.department?.name,
              confidence: match.confidence,
              box: match.box,
            };
          }
        }
        return {
          matched: false,
          confidence: match.confidence,
          box: match.box,
        };
      })
    );

    return new ApiResponse(200, {
      faceCount: cvResult.face_count,
      matchedCount: matches.filter((m) => m.matched).length,
      matches,
    }, 'Face recognition completed').send(res);

  } catch (error) {
    throw ApiError.internal(`Face recognition failed: ${error.message}`);
  }
});

/**
 * GET /api/v1/face/dataset/:studentId
 * Get dataset info for a student.
 */
export const getDataset = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const dataset = await FaceDataset.findOne({ student: studentId }).lean();
  if (!dataset) throw ApiError.notFound('Face dataset not found for this student');

  try {
    const response = await fetch(`${CV_API_URL}/api/face/dataset/${studentId}`);
    let cvInfo = null;
    if (response.ok) {
      cvInfo = await response.json();
    }

    return new ApiResponse(200, {
      dataset,
      cvInfo,
    }, 'Dataset information retrieved').send(res);
  } catch (error) {
    // Return MongoDB dataset even if cv-api is offline
    return new ApiResponse(200, {
      dataset,
      cvInfo: null,
      warning: 'Could not connect to CV-API'
    }, 'Dataset information retrieved (offline)').send(res);
  }
});

/**
 * DELETE /api/v1/face/dataset/:studentId
 * Delete a student's face dataset.
 */
export const deleteDataset = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const student = await Student.findById(studentId);
  if (!student) throw ApiError.notFound('Student not found');

  // 1. Delete from ImageKit
  const dataset = await FaceDataset.findOne({ student: studentId });
  if (dataset) {
    const deletePromises = dataset.imagePaths.map((img) => 
      deleteFromImageKit(img.publicId).catch(() => {})
    );
    await Promise.all(deletePromises);
    await FaceDataset.findByIdAndDelete(dataset._id);
  }

  // 2. Delete from CV-API
  try {
    const response = await fetch(`${CV_API_URL}/api/face/dataset/${studentId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      console.warn(`CV-API delete dataset failed for ${studentId}`);
    }
  } catch (error) {
    console.error(`Failed to delete dataset from CV-API: ${error.message}`);
  }

  // 3. Update student model
  student.faceRegistered = false;
  student.faceDatasetPath = '';
  student.faceEmbeddings = [];
  await student.save();

  return new ApiResponse(200, null, 'Face dataset deleted successfully').send(res);
});
