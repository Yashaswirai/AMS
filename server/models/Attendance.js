import mongoose from 'mongoose';
import { ATTENDANCE_STATUS, ATTENDANCE_METHOD } from '../utils/constants.js';

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student is required'],
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    period: {
      type: Number,
      required: [true, 'Period is required'],
      min: [1, 'Period must be at least 1'],
      max: [10, 'Period cannot exceed 10'],
    },
    status: {
      type: String,
      enum: Object.values(ATTENDANCE_STATUS),
      required: [true, 'Status is required'],
    },
    method: {
      type: String,
      enum: Object.values(ATTENDANCE_METHOD),
      required: [true, 'Marking method is required'],
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null, // Only for face recognition
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [500, 'Remarks cannot exceed 500 characters'],
    },
    correctionRequested: {
      type: Boolean,
      default: false,
    },
    correctionReason: {
      type: String,
      trim: true,
    },
    correctionApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    qrSessionId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index: unique attendance per student per subject per date per period
attendanceSchema.index({ student: 1, subject: 1, date: 1, period: 1 }, { unique: true });
attendanceSchema.index({ subject: 1, date: 1 });
attendanceSchema.index({ student: 1, date: 1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ date: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
