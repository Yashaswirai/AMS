import mongoose from 'mongoose';
import { RISK_LEVELS } from '../utils/constants.js';

const predictionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    predictedAttendance: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    currentAttendance: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    riskLevel: {
      type: String,
      enum: Object.values(RISK_LEVELS),
      required: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      required: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    features: {
      recentTrend: { type: Number, default: 0 },
      consecutiveAbsences: { type: Number, default: 0 },
      weeklyPattern: { type: [Number], default: [] },
      monthlyPattern: { type: [Number], default: [] },
    },
    recommendation: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

predictionSchema.index({ student: 1, subject: 1, generatedAt: -1 });
predictionSchema.index({ riskLevel: 1 });
predictionSchema.index({ generatedAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 }); // TTL 7 days

const Prediction = mongoose.model('Prediction', predictionSchema);
export default Prediction;
