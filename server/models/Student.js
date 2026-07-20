import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    rollNumber: {
      type: String,
      required: [true, 'Roll number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: [1, 'Year must be at least 1'],
      max: [4, 'Year cannot exceed 4'],
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: [1, 'Semester must be at least 1'],
      max: [8, 'Semester cannot exceed 8'],
    },
    faceEmbeddings: {
      type: [Number],
      default: [],
      select: false,
    },
    faceRegistered: {
      type: Boolean,
      default: false,
    },
    faceDatasetPath: {
      type: String,
      default: '',
    },
    cgpa: {
      type: Number,
      default: 0,
      min: [0, 'CGPA cannot be negative'],
      max: [10, 'CGPA cannot exceed 10'],
    },
    parentEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid parent email'],
    },
    parentPhone: {
      type: String,
      trim: true,
    },
    enrollmentDate: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    address: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    attendancePercentage: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

studentSchema.index({ department: 1, course: 1 });
studentSchema.index({ semester: 1 });
studentSchema.index({ faceRegistered: 1 });
studentSchema.index({ isActive: 1 });

const Student = mongoose.model('Student', studentSchema);
export default Student;
