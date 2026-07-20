import mongoose from 'mongoose';

const faceDatasetSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      unique: true,
    },
    imagePaths: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    embeddingPath: {
      type: String,
      default: '',
    },
    qualityScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    totalImages: {
      type: Number,
      default: 0,
    },
    isProcessed: {
      type: Boolean,
      default: false,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    processingError: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

faceDatasetSchema.index({ isProcessed: 1 });

const FaceDataset = mongoose.model('FaceDataset', faceDatasetSchema);
export default FaceDataset;
