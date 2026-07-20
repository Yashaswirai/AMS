import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true,
      maxlength: [150, 'Course name cannot exceed 150 characters'],
    },
    code: {
      type: String,
      required: [true, 'Course code is required'],
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: [15, 'Course code cannot exceed 15 characters'],
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
    },
    duration: {
      type: Number,
      required: [true, 'Duration (in years) is required'],
      min: [1, 'Duration must be at least 1 year'],
      max: [6, 'Duration cannot exceed 6 years'],
    },
    totalSeats: {
      type: Number,
      required: [true, 'Total seats are required'],
      min: [1, 'Must have at least 1 seat'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    totalSemesters: {
      type: Number,
      default: function () {
        return this.duration * 2;
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

courseSchema.index({ department: 1 });
courseSchema.index({ isActive: 1 });

const Course = mongoose.model('Course', courseSchema);
export default Course;
