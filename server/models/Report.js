import mongoose from 'mongoose';
import { REPORT_TYPES } from '../utils/constants.js';

const reportSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Report title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    type: {
      type: String,
      enum: Object.values(REPORT_TYPES),
      required: [true, 'Report type is required'],
    },
    format: {
      type: String,
      enum: ['pdf', 'csv', 'excel'],
      required: true,
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    parameters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    filePath: {
      type: String,
      default: '',
    },
    fileUrl: {
      type: String,
      default: '',
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    error: {
      type: String,
      default: '',
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reportSchema.index({ generatedBy: 1, createdAt: -1 });
reportSchema.index({ type: 1, status: 1 });
reportSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL

const Report = mongoose.model('Report', reportSchema);
export default Report;
