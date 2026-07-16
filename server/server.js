import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
import connectDB, { closeDB } from './config/db.js';
import imagekit from './config/imagekit.js';
import { createTransporter } from './config/email.js';

// Middlewares
import errorHandler from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimiter.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';
import timetableRoutes from './routes/timetableRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import faceRoutes from './routes/faceRoutes.js';

const app = express();
const server = createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL || 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  },
});

app.set('io', io);
global.io = io; // Fallback helper

io.on('connection', (socket) => {
  console.log(`🔌 Socket client connected: ${socket.id}`);
  
  socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log(`🔌 Client ${socket.id} joined room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket client disconnected: ${socket.id}`);
  });
});

// Setup helmet & cors
app.use(helmet());
app.use(
  cors({
    origin: [process.env.CLIENT_URL || 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  })
);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Request parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate limiters
app.use('/api/', generalLimiter);

// API Route mounts
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/teachers', teacherRoutes);
app.use('/api/v1/departments', departmentRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/subjects', subjectRoutes);
app.use('/api/v1/timetable', timetableRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/leaves', leaveRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/face', faceRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'UP',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use(errorHandler);

// Connect dependencies
const startServer = async () => {
  try {
    // 1. Connect MongoDB
    await connectDB();

    // 2. Configure ImageKit (verified by import instantiation)
    console.log('✅ ImageKit configured successfully');

    // 3. Initialize Nodemailer Transporter
    createTransporter();

    // 4. Start listening
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`🚀 FRAMS Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start FRAMS server:', error.message);
    process.exit(1);
  }
};

startServer();

// Graceful Shutdown
const handleGracefulShutdown = () => {
  console.log('🛑 SIGINT/SIGTERM received. Starting graceful shutdown...');
  server.close(async () => {
    console.log('✅ HTTP server closed.');
    await closeDB();
    console.log('👋 Clean exit.');
    process.exit(0);
  });
};

process.on('SIGTERM', handleGracefulShutdown);
process.on('SIGINT', handleGracefulShutdown);
