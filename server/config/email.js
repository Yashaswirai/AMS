import nodemailer from 'nodemailer';

let transporter = null;

export const createTransporter = () => {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: parseInt(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });

  transporter.verify((error) => {
    if (error) {
      console.warn('⚠️  Email transporter verification failed:', error.message);
    } else {
      console.log('✅ Email transporter ready');
    }
  });

  return transporter;
};

export const getTransporter = () => {
  if (!transporter) {
    return createTransporter();
  }
  return transporter;
};

export default createTransporter;
