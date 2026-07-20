import mongoose from 'mongoose';
import { LEAVE_STATUS } from '../utils/constants.js';

const leaveRequestSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
      minlength: [10, 'Reason must be at least 10 characters'],
      maxlength: [1000, 'Reason cannot exceed 1000 characters'],
    },
    leaveType: {
      type: String,
      enum: ['medical', 'personal', 'family', 'academic', 'other'],
      default: 'personal',
    },
    status: {
      type: String,
      enum: Object.values(LEAVE_STATUS),
      default: LEAVE_STATUS.PENDING,
    },
    attachmentUrl: {
      type: String,
      default: '',
    },
    attachmentPublicId: {
      type: String,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [500, 'Remarks cannot exceed 500 characters'],
    },
    totalDays: {
      type: Number,
      default: 0,
    },
    affectedSubjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compute total days before save
leaveRequestSchema.pre('save', function () {
  if (this.startDate && this.endDate) {
    const diffMs = this.endDate.getTime() - this.startDate.getTime();
    this.totalDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
  }
});

leaveRequestSchema.index({ student: 1, status: 1 });
leaveRequestSchema.index({ status: 1 });
leaveRequestSchema.index({ startDate: 1, endDate: 1 });

const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);
export default LeaveRequest;
