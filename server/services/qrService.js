import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { QR_SESSION_EXPIRY } from '../utils/constants.js';
import ApiError from '../utils/ApiError.js';

// In-memory QR session store
// In production, replace with Redis
const qrSessions = new Map();

/**
 * Generate a new QR session for a class
 */
export const generateQRSession = async ({ subjectId, teacherId, date, period, expirySeconds }) => {
  const sessionId = uuidv4();
  const expiry = expirySeconds || QR_SESSION_EXPIRY;
  const expiresAt = Date.now() + expiry * 1000;

  const sessionData = {
    sessionId,
    subjectId: subjectId.toString(),
    teacherId: teacherId.toString(),
    date: new Date(date).toISOString().split('T')[0],
    period,
    expiresAt,
    createdAt: Date.now(),
    usedBy: new Set(), // Track who already scanned
  };

  qrSessions.set(sessionId, sessionData);

  // Auto-cleanup after expiry
  setTimeout(() => {
    qrSessions.delete(sessionId);
  }, expiry * 1000);

  // Payload embedded in QR
  const qrPayload = JSON.stringify({
    sessionId,
    subjectId,
    date: sessionData.date,
    period,
    exp: expiresAt,
  });

  // Generate QR code as base64 data URL
  const qrDataURL = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    quality: 0.92,
    margin: 2,
    width: 400,
    color: {
      dark: '#1e3a5f',
      light: '#ffffff',
    },
  });

  return {
    sessionId,
    qrCode: qrDataURL,
    qrPayload,
    expiresAt: new Date(expiresAt).toISOString(),
    expiresInSeconds: expiry,
    subjectId,
    date: sessionData.date,
    period,
  };
};

/**
 * Validate a QR session
 */
export const validateQRSession = (sessionId, studentId) => {
  const session = qrSessions.get(sessionId);

  if (!session) {
    throw ApiError.badRequest('QR session not found or has expired. Please ask your teacher to generate a new QR code.');
  }

  if (Date.now() > session.expiresAt) {
    qrSessions.delete(sessionId);
    throw ApiError.badRequest('QR session has expired. Please ask your teacher to generate a new QR code.');
  }

  if (session.usedBy.has(studentId.toString())) {
    throw ApiError.conflict('You have already marked attendance for this session.');
  }

  return {
    subjectId: session.subjectId,
    teacherId: session.teacherId,
    date: session.date,
    period: session.period,
    expiresAt: session.expiresAt,
  };
};

/**
 * Mark a student as having used a QR session
 */
export const markQRSessionUsed = (sessionId, studentId) => {
  const session = qrSessions.get(sessionId);
  if (session) {
    session.usedBy.add(studentId.toString());
  }
};

/**
 * Get active QR sessions for a teacher
 */
export const getActiveSessionsForTeacher = (teacherId) => {
  const now = Date.now();
  const activeSessions = [];

  for (const [sessionId, session] of qrSessions) {
    if (session.teacherId === teacherId.toString() && session.expiresAt > now) {
      activeSessions.push({
        sessionId,
        subjectId: session.subjectId,
        date: session.date,
        period: session.period,
        expiresAt: new Date(session.expiresAt).toISOString(),
        scannedCount: session.usedBy.size,
      });
    }
  }

  return activeSessions;
};

/**
 * Invalidate/revoke a QR session
 */
export const revokeQRSession = (sessionId) => {
  const existed = qrSessions.has(sessionId);
  qrSessions.delete(sessionId);
  return existed;
};

/**
 * Get QR session info
 */
export const getQRSessionInfo = (sessionId) => {
  const session = qrSessions.get(sessionId);
  if (!session) return null;

  return {
    sessionId,
    subjectId: session.subjectId,
    teacherId: session.teacherId,
    date: session.date,
    period: session.period,
    expiresAt: new Date(session.expiresAt).toISOString(),
    isExpired: Date.now() > session.expiresAt,
    scannedCount: session.usedBy.size,
  };
};
