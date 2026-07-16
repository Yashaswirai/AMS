import { getTransporter } from '../config/email.js';

const FROM = `"FRAMS - Attendance System" <${process.env.EMAIL_USER}>`;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

/**
 * Send email verification link
 */
export const sendVerificationEmail = async (user, rawToken) => {
  const transporter = getTransporter();
  const verifyUrl = `${CLIENT_URL}/verify-email?token=${rawToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Verify Your Email</title></head>
    <body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
      <div style="max-width: 600px; margin: auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2563eb;">FRAMS</h1>
          <p style="color: #666;">AI-Powered Attendance Management</p>
        </div>
        <h2 style="color: #1f2937;">Verify Your Email Address</h2>
        <p>Hi <strong>${user.name}</strong>,</p>
        <p>Thank you for registering! Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">This link will expire in <strong>24 hours</strong>.</p>
        <p style="color: #666; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          If the button doesn't work, copy this link: <br>
          <a href="${verifyUrl}" style="color: #2563eb;">${verifyUrl}</a>
        </p>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: FROM,
    to: user.email,
    subject: '🎓 Verify Your FRAMS Account Email',
    html,
    text: `Hi ${user.name},\n\nPlease verify your email: ${verifyUrl}\n\nThis link expires in 24 hours.`,
  });
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (user, rawToken) => {
  const transporter = getTransporter();
  const resetUrl = `${CLIENT_URL}/reset-password?token=${rawToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Reset Your Password</title></head>
    <body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
      <div style="max-width: 600px; margin: auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2563eb;">FRAMS</h1>
        </div>
        <h2 style="color: #1f2937;">Reset Your Password</h2>
        <p>Hi <strong>${user.name}</strong>,</p>
        <p>You requested to reset your password. Click the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">This link will expire in <strong>1 hour</strong>.</p>
        <p style="color: #666; font-size: 14px;">If you did not request this, please ignore this email and your password will remain unchanged.</p>
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 4px; margin: 20px 0;">
          <p style="color: #92400e; margin: 0; font-size: 14px;">⚠️ Never share this link with anyone.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: FROM,
    to: user.email,
    subject: '🔒 Password Reset Request - FRAMS',
    html,
    text: `Hi ${user.name},\n\nReset your password: ${resetUrl}\n\nExpires in 1 hour.`,
  });
};

/**
 * Send low attendance alert to student
 */
export const sendAttendanceAlert = async (user, subjectName, percentage) => {
  const transporter = getTransporter();

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Low Attendance Alert</title></head>
    <body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
      <div style="max-width: 600px; margin: auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; border-radius: 4px; margin-bottom: 20px;">
          <h2 style="color: #dc2626; margin: 0;">⚠️ Low Attendance Warning</h2>
        </div>
        <p>Dear <strong>${user.name}</strong>,</p>
        <p>Your attendance in <strong>${subjectName}</strong> has dropped to <strong style="color: #dc2626;">${percentage.toFixed(1)}%</strong>.</p>
        <p>The minimum required attendance is <strong>75%</strong>. Please attend classes regularly to avoid being barred from exams.</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Subject:</strong> ${subjectName}</p>
          <p style="margin: 5px 0 0;"><strong>Current Attendance:</strong> <span style="color: #dc2626;">${percentage.toFixed(1)}%</span></p>
          <p style="margin: 5px 0 0;"><strong>Required Minimum:</strong> 75%</p>
        </div>
        <p>If you have any concerns, please contact your class teacher or department coordinator.</p>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: FROM,
    to: user.email,
    subject: `⚠️ Low Attendance Alert: ${subjectName} - FRAMS`,
    html,
    text: `Dear ${user.name},\n\nYour attendance in ${subjectName} is ${percentage.toFixed(1)}%. Minimum required is 75%.`,
  });
};

/**
 * Send parent notification
 */
export const sendParentNotification = async (parentEmail, studentName, subjectName, percentage, parentName = 'Parent/Guardian') => {
  const transporter = getTransporter();

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Parent Notification</title></head>
    <body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
      <div style="max-width: 600px; margin: auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2563eb;">FRAMS</h1>
        </div>
        <p>Dear <strong>${parentName}</strong>,</p>
        <p>We wish to inform you that your ward <strong>${studentName}</strong> has low attendance in <strong>${subjectName}</strong>.</p>
        <div style="background: #fee2e2; padding: 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <p style="margin: 0;"><strong>Current Attendance:</strong> <span style="color: #dc2626;">${percentage.toFixed(1)}%</span></p>
          <p style="margin: 5px 0 0;"><strong>Minimum Required:</strong> 75%</p>
        </div>
        <p>We request you to encourage your ward to attend classes regularly. Please contact the institution if you need more information.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">This is an automated notification from FRAMS.</p>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: FROM,
    to: parentEmail,
    subject: `📋 Attendance Notice: ${studentName} - ${subjectName}`,
    html,
    text: `Dear ${parentName},\n\n${studentName}'s attendance in ${subjectName} is ${percentage.toFixed(1)}%. Please encourage regular attendance.`,
  });
};

/**
 * Send leave request notification
 */
export const sendLeaveNotification = async (recipientEmail, recipientName, studentName, leaveType, status, startDate, endDate) => {
  const transporter = getTransporter();
  const statusColor = status === 'approved' ? '#16a34a' : status === 'rejected' ? '#dc2626' : '#d97706';
  const statusText = status.charAt(0).toUpperCase() + status.slice(1);

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Leave Request ${statusText}</title></head>
    <body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
      <div style="max-width: 600px; margin: auto; background: white; border-radius: 8px; padding: 30px;">
        <h2 style="color: ${statusColor};">Leave Request ${statusText}</h2>
        <p>Dear <strong>${recipientName}</strong>,</p>
        <p>The leave request for <strong>${studentName}</strong> has been <strong style="color: ${statusColor};">${status}</strong>.</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Type:</strong> ${leaveType}</p>
          <p style="margin: 5px 0 0;"><strong>From:</strong> ${new Date(startDate).toLocaleDateString()}</p>
          <p style="margin: 5px 0 0;"><strong>To:</strong> ${new Date(endDate).toLocaleDateString()}</p>
          <p style="margin: 5px 0 0;"><strong>Status:</strong> <span style="color: ${statusColor};">${statusText}</span></p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: FROM,
    to: recipientEmail,
    subject: `📋 Leave Request ${statusText} - FRAMS`,
    html,
    text: `Leave request for ${studentName} has been ${status}.`,
  });
};
