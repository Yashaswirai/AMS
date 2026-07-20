import mongoose from 'mongoose';

const timetableSchema = new mongoose.Schema(
  {
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject is required'],
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher is required'],
    },
    day: {
      type: Number,
      required: [true, 'Day is required'],
      min: [0, 'Day must be 0-6 (Sun-Sat)'],
      max: [6, 'Day must be 0-6 (Sun-Sat)'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in HH:mm format'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be in HH:mm format'],
    },
    room: {
      type: String,
      trim: true,
      maxlength: [50, 'Room cannot exceed 50 characters'],
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: [1, 'Semester must be at least 1'],
      max: [8, 'Semester cannot exceed 8'],
    },
    period: {
      type: Number,
      required: [true, 'Period number is required'],
      min: [1],
      max: [10],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

timetableSchema.index({ teacher: 1, day: 1 });
timetableSchema.index({ subject: 1, day: 1 });
timetableSchema.index({ semester: 1, day: 1 });
timetableSchema.index({ course: 1, semester: 1, day: 1 });

const Timetable = mongoose.model('Timetable', timetableSchema);
export default Timetable;
