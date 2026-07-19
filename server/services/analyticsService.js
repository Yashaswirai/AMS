import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';
import Subject from '../models/Subject.js';
import Department from '../models/Department.js';
import Teacher from '../models/Teacher.js';
import User from '../models/User.js';
import { ATTENDANCE_THRESHOLDS, RISK_LEVELS } from '../utils/constants.js';

/**
 * Compute overall system overview statistics
 */
export const computeOverview = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalStudents,
    totalTeachers,
    totalSubjects,
    totalDepartments,
    todayAttendance,
    overallStats,
  ] = await Promise.all([
    Student.countDocuments({ isActive: true }),
    Teacher.countDocuments({ isActive: true }),
    Subject.countDocuments({ isActive: true }),
    Department.countDocuments({ isActive: true }),

    // Today's attendance
    Attendance.aggregate([
      { $match: { date: { $gte: today, $lt: tomorrow } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          present: {
            $sum: {
              $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0],
            },
          },
        },
      },
    ]),

    // Overall attendance percentage
    Attendance.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          present: {
            $sum: {
              $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0],
            },
          },
        },
      },
    ]),
  ]);

  const todayStats = todayAttendance[0] || { total: 0, present: 0 };
  const overall = overallStats[0] || { total: 0, present: 0 };

  const todayPercentage =
    todayStats.total > 0 ? (todayStats.present / todayStats.total) * 100 : 0;
  const avgAttendance =
    overall.total > 0 ? (overall.present / overall.total) * 100 : 0;

  // Weekly trend (last 7 days)
  const weeklyTrend = await getWeeklyTrend();

  // At-risk students count
  const atRiskCount = await getAtRiskCount();

  return {
    totalStudents,
    totalTeachers,
    totalSubjects,
    totalDepartments,
    todayAttendance: {
      total: todayStats.total,
      present: todayStats.present,
      percentage: Math.round(todayPercentage * 100) / 100,
    },
    avgAttendance: Math.round(avgAttendance * 100) / 100,
    weeklyTrend,
    atRiskStudents: atRiskCount,
  };
};

/**
 * Compute weekly attendance trend (last 7 days)
 */
export const getWeeklyTrend = async () => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }

  const results = await Promise.all(
    days.map(async (day) => {
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      const stats = await Attendance.aggregate([
        { $match: { date: { $gte: day, $lt: nextDay } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            present: {
              $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] },
            },
          },
        },
      ]);

      const s = stats[0] || { total: 0, present: 0 };
      return {
        date: day.toISOString().split('T')[0],
        dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.getDay()],
        total: s.total,
        present: s.present,
        percentage: s.total > 0 ? Math.round((s.present / s.total) * 10000) / 100 : 0,
      };
    })
  );

  return results;
};

/**
 * Department-wise attendance breakdown
 */
export const computeDepartmentBreakdown = async () => {
  const departments = await Department.find({ isActive: true }).lean();

  const breakdown = await Promise.all(
    departments.map(async (dept) => {
      // Get students in this department
      const studentIds = await Student.find({ department: dept._id, isActive: true })
        .select('_id')
        .lean();
      const sIds = studentIds.map((s) => s._id);

      if (sIds.length === 0) {
        return {
          department: dept.name,
          departmentCode: dept.code,
          totalStudents: 0,
          attendance: 0,
          present: 0,
          absent: 0,
          atRisk: 0,
        };
      }

      const stats = await Attendance.aggregate([
        { $match: { student: { $in: sIds } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            present: {
              $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] },
            },
            absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          },
        },
      ]);

      const s = stats[0] || { total: 0, present: 0, absent: 0 };
      const percentage = s.total > 0 ? Math.round((s.present / s.total) * 10000) / 100 : 0;

      // Count at-risk students (attendance < threshold)
      const atRisk = await countAtRiskStudentsInDept(sIds);

      return {
        department: dept.name,
        departmentCode: dept.code,
        departmentId: dept._id,
        totalStudents: sIds.length,
        totalClasses: s.total,
        present: s.present,
        absent: s.absent,
        attendance: percentage,
        atRisk,
      };
    })
  );

  return breakdown.sort((a, b) => b.attendance - a.attendance);
};

/**
 * Subject-wise attendance analysis
 */
export const computeSubjectAnalysis = async (filters = {}) => {
  const matchStage = {};
  if (filters.semester) matchStage.semester = parseInt(filters.semester);
  if (filters.course) matchStage.course = filters.course;

  const subjects = await Subject.find({ isActive: true, ...matchStage })
    .populate('teacher', 'user')
    .populate({ path: 'teacher', populate: { path: 'user', select: 'name' } })
    .lean();

  const analysis = await Promise.all(
    subjects.map(async (subject) => {
      const stats = await Attendance.aggregate([
        { $match: { subject: subject._id } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            present: {
              $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] },
            },
            absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
            late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          },
        },
      ]);

      const s = stats[0] || { total: 0, present: 0, absent: 0, late: 0 };
      const percentage = s.total > 0 ? Math.round((s.present / s.total) * 10000) / 100 : 0;

      // Count at-risk students for this subject
      const atRiskStudents = await countAtRiskForSubject(subject._id);

      return {
        subjectId: subject._id,
        subjectName: subject.name,
        subjectCode: subject.code,
        semester: subject.semester,
        credits: subject.credits,
        teacher: subject.teacher?.user?.name || 'Unassigned',
        totalClasses: subject.totalClasses,
        attendedClasses: s.total,
        present: s.present,
        absent: s.absent,
        late: s.late,
        attendance: percentage,
        atRiskStudents,
        requiredAttendance: subject.attendanceRequired,
      };
    })
  );

  return analysis.sort((a, b) => a.attendance - b.attendance);
};

/**
 * Monthly attendance trend for current year
 */
export const computeMonthlyTrends = async () => {
  const year = new Date().getFullYear();

  const monthly = await Attendance.aggregate([
    {
      $match: {
        date: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { month: { $month: '$date' } },
        total: { $sum: 1 },
        present: {
          $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] },
        },
      },
    },
    { $sort: { '_id.month': 1 } },
  ]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return months.map((month, idx) => {
    const data = monthly.find((m) => m._id.month === idx + 1);
    return {
      month,
      monthNumber: idx + 1,
      total: data?.total || 0,
      present: data?.present || 0,
      percentage:
        data?.total > 0 ? Math.round((data.present / data.total) * 10000) / 100 : 0,
    };
  });
};

/**
 * Heatmap: day of week vs period attendance matrix
 */
export const computeHeatmap = async () => {
  const heatmapData = await Attendance.aggregate([
    {
      $group: {
        _id: {
          dayOfWeek: { $dayOfWeek: '$date' }, // 1=Sun, 7=Sat
          period: '$period',
        },
        total: { $sum: 1 },
        present: {
          $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] },
        },
      },
    },
    {
      $project: {
        day: { $subtract: ['$_id.dayOfWeek', 1] }, // 0=Sun, 6=Sat
        period: '$_id.period',
        percentage: {
          $cond: [
            { $gt: ['$total', 0] },
            { $multiply: [{ $divide: ['$present', '$total'] }, 100] },
            0,
          ],
        },
        total: 1,
        present: 1,
      },
    },
    { $sort: { day: 1, period: 1 } },
  ]);

  return heatmapData;
};

/**
 * Student attendance rankings
 */
export const computeStudentRankings = async (limit = 10) => {
  const rankingData = await Attendance.aggregate([
    {
      $group: {
        _id: '$student',
        total: { $sum: 1 },
        present: {
          $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] },
        },
      },
    },
    {
      $addFields: {
        percentage: {
          $cond: [
            { $gt: ['$total', 0] },
            { $multiply: [{ $divide: ['$present', '$total'] }, 100] },
            0,
          ],
        },
      },
    },
    { $sort: { percentage: -1 } },
    {
      $facet: {
        topStudents: [{ $limit: limit }],
        bottomStudents: [{ $sort: { percentage: 1 } }, { $limit: limit }],
      },
    },
  ]);

  const { topStudents, bottomStudents } = rankingData[0];

  // Populate student info
  const populateStudents = async (list) => {
    return Promise.all(
      list.map(async (item) => {
        const student = await Student.findById(item._id)
          .populate('user', 'name email avatar')
          .populate('department', 'name code')
          .lean();
        return {
          studentId: item._id,
          name: student?.user?.name || 'Unknown',
          email: student?.user?.email || '',
          rollNumber: student?.rollNumber || '',
          department: student?.department?.name || '',
          totalClasses: item.total,
          presentClasses: item.present,
          percentage: Math.round(item.percentage * 100) / 100,
          riskLevel: getRiskLevel(item.percentage),
        };
      })
    );
  };

  const [top, bottom] = await Promise.all([
    populateStudents(topStudents),
    populateStudents(bottomStudents),
  ]);

  return { topStudents: top, bottomStudents: bottom };
};

/**
 * Get attendance stats for a specific student
 */
export const computeStudentStats = async (studentId) => {
  const subjectStats = await Attendance.aggregate([
    { $match: { student: studentId } },
    {
      $group: {
        _id: '$subject',
        total: { $sum: 1 },
        present: {
          $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] },
        },
        absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
        late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
      },
    },
    {
      $addFields: {
        percentage: {
          $cond: [
            { $gt: ['$total', 0] },
            { $round: [{ $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 2] },
            0,
          ],
        },
      },
    },
    {
      $lookup: {
        from: 'subjects',
        localField: '_id',
        foreignField: '_id',
        as: 'subject',
      },
    },
    { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
    { $sort: { percentage: 1 } },
  ]);

  const overall = subjectStats.reduce(
    (acc, s) => {
      acc.total += s.total;
      acc.present += s.present;
      return acc;
    },
    { total: 0, present: 0 }
  );

  return {
    overall: {
      total: overall.total,
      present: overall.present,
      percentage:
        overall.total > 0 ? Math.round((overall.present / overall.total) * 10000) / 100 : 0,
    },
    subjects: subjectStats.map((s) => ({
      subjectId: s._id,
      subjectName: s.subject?.name || 'Unknown',
      subjectCode: s.subject?.code || '',
      totalClasses: s.total,
      presentClasses: s.present,
      absentClasses: s.absent,
      lateClasses: s.late,
      percentage: s.percentage,
      isAtRisk: s.percentage < ATTENDANCE_THRESHOLDS.MINIMUM,
      riskLevel: getRiskLevel(s.percentage),
    })),
  };
};

// ----- Helper Functions -----

const getRiskLevel = (percentage) => {
  if (percentage >= ATTENDANCE_THRESHOLDS.SAFE) return RISK_LEVELS.LOW;
  if (percentage >= ATTENDANCE_THRESHOLDS.MINIMUM) return RISK_LEVELS.MEDIUM;
  if (percentage >= 60) return RISK_LEVELS.HIGH;
  return RISK_LEVELS.CRITICAL;
};

const countAtRiskStudentsInDept = async (studentIds) => {
  const result = await Attendance.aggregate([
    { $match: { student: { $in: studentIds } } },
    { $group: { _id: '$student', total: { $sum: 1 }, present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } } } },
    { $addFields: { pct: { $cond: [{ $gt: ['$total', 0] }, { $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 0] } } },
    { $match: { pct: { $lt: ATTENDANCE_THRESHOLDS.MINIMUM } } },
    { $count: 'atRisk' },
  ]);
  return result[0]?.atRisk || 0;
};

const countAtRiskForSubject = async (subjectId) => {
  const result = await Attendance.aggregate([
    { $match: { subject: subjectId } },
    { $group: { _id: '$student', total: { $sum: 1 }, present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } } } },
    { $addFields: { pct: { $cond: [{ $gt: ['$total', 0] }, { $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 0] } } },
    { $match: { pct: { $lt: ATTENDANCE_THRESHOLDS.MINIMUM } } },
    { $count: 'atRisk' },
  ]);
  return result[0]?.atRisk || 0;
};

const getAtRiskCount = async () => {
  const result = await Attendance.aggregate([
    { $group: { _id: '$student', total: { $sum: 1 }, present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } } } },
    { $addFields: { pct: { $cond: [{ $gt: ['$total', 0] }, { $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 0] } } },
    { $match: { pct: { $lt: ATTENDANCE_THRESHOLDS.MINIMUM } } },
    { $count: 'atRisk' },
  ]);
  return result[0]?.atRisk || 0;
};
