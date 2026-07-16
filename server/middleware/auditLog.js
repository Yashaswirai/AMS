import AuditLog from '../models/AuditLog.js';
import { AUDIT_ACTIONS } from '../utils/constants.js';

/**
 * Middleware factory to create audit log entries
 * Usage: auditLog('create', 'Student')
 */
const auditLog = (action, resource) => {
  return async (req, res, next) => {
    // Capture original res.json
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      // Log after response is sent
      setImmediate(async () => {
        try {
          if (req.user) {
            const logEntry = {
              user: req.user.id,
              action: action || AUDIT_ACTIONS.READ,
              resource,
              resourceId: req.params.id || body?.data?._id || null,
              details: {
                method: req.method,
                path: req.originalUrl,
                query: req.query,
                statusCode: res.statusCode,
              },
              ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown',
              userAgent: req.headers['user-agent'] || '',
              status: res.statusCode < 400 ? 'success' : 'failure',
              timestamp: new Date(),
            };

            await AuditLog.create(logEntry);
          }
        } catch (err) {
          // Never let audit log failure break request
          console.error('Audit log error:', err.message);
        }
      });

      return originalJson(body);
    };

    next();
  };
};

/**
 * Direct audit log creation (for use inside controllers)
 */
export const createAuditLog = async ({
  userId,
  action,
  resource,
  resourceId = null,
  details = {},
  ipAddress = '',
  userAgent = '',
  status = 'success',
}) => {
  try {
    await AuditLog.create({
      user: userId,
      action,
      resource,
      resourceId,
      details,
      ipAddress,
      userAgent,
      status,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('Audit log creation error:', err.message);
  }
};

export default auditLog;
