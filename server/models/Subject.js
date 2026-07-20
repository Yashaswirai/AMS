import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
      maxlength: [150, 'Subject name cannot exceed 150 characters'],
    },
    code: {
      type: String,
      required: [true, 'Subject code is required'],
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: [15, 'Subject code cannot exceed 15 characters'],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      default: null,
    },
    credits: {
      type: Number,
      required: [true, 'Credits are required'],
      min: [1, 'Credits must be at least 1'],
      max: [6, 'Credits cannot exceed 6'],
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: [1, 'Semester must be at least 1'],
      max: [8, 'Semester cannot exceed 8'],
    },
    totalClasses: {
      type: Number,
      default: 0,
    },
    attendanceRequired: {
      type: Number,
      default: 75,
      min: [0, 'Attendance required cannot be negative'],
      max: [100, 'Attendance required cannot exceed 100'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    isElective: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

subjectSchema.index({ course: 1, semester: 1 });
subjectSchema.index({ teacher: 1 });
subjectSchema.index({ isActive: 1 });

const Subject = mongoose.model('Subject', subjectSchema);
export default Subject;
