import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Models
import User from '../models/User.js';
import Department from '../models/Department.js';
import Course from '../models/Course.js';
import Subject from '../models/Subject.js';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import Attendance from '../models/Attendance.js';
import Timetable from '../models/Timetable.js';
import Notification from '../models/Notification.js';
import LeaveRequest from '../models/LeaveRequest.js';
import FaceDataset from '../models/FaceDataset.js';
import AuditLog from '../models/AuditLog.js';

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/frams';

const seed = async () => {
  try {
    console.log('⏳ Connecting to database...');
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to database');

    console.log('🧹 Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Department.deleteMany({}),
      Course.deleteMany({}),
      Subject.deleteMany({}),
      Student.deleteMany({}),
      Teacher.deleteMany({}),
      Attendance.deleteMany({}),
      Timetable.deleteMany({}),
      Notification.deleteMany({}),
      LeaveRequest.deleteMany({}),
      FaceDataset.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);
    console.log('🧹 DB cleared.');

    // 1. Create Admin
    console.log('👤 Seeding Admin...');
    const adminPassword = 'Admin@123';
    const teacherPassword = 'Teacher@123';
    const studentPassword = 'Student@123';

    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@frams.edu',
      password: adminPassword,
      role: 'admin',
      isVerified: true,
      isActive: true,
    });

    // 2. Create 5 Departments
    console.log('🏢 Seeding Departments...');
    const deptsData = [
      { name: 'Computer Science & Engineering', code: 'CS', description: 'Department of Computer Science', establishedYear: 2010 },
      { name: 'Electronics & Communication Engineering', code: 'ECE', description: 'Department of Electronics', establishedYear: 2012 },
      { name: 'Mechanical Engineering', code: 'ME', description: 'Department of Mechanical Engineering', establishedYear: 2011 },
      { name: 'Civil Engineering', code: 'CE', description: 'Department of Civil Engineering', establishedYear: 2014 },
      { name: 'Business Administration', code: 'MBA', description: 'Department of Management Studies', establishedYear: 2015 },
    ];
    const departments = await Department.insertMany(deptsData);
    console.log(`✅ Created ${departments.length} departments.`);

    // 3. Create 10 Courses (2 per dept)
    console.log('🎓 Seeding Courses...');
    const coursesData = [];
    departments.forEach((dept) => {
      coursesData.push(
        {
          name: `Bachelor of Technology in ${dept.code}`,
          code: `BTECH-${dept.code}`,
          department: dept._id,
          duration: 4,
          totalSeats: 60,
          description: `4-year undergraduate B.Tech program in ${dept.name}`,
        },
        {
          name: `Master of Technology in ${dept.code}`,
          code: `MTECH-${dept.code}`,
          department: dept._id,
          duration: 2,
          totalSeats: 18,
          description: `2-year postgraduate M.Tech program in ${dept.name}`,
        }
      );
    });
    const courses = await Course.insertMany(coursesData);
    console.log(`✅ Created ${courses.length} courses.`);

    // 4. Create 10 Teachers
    console.log('👨‍🏫 Seeding Teachers...');
    const teachers = [];
    for (let i = 1; i <= 10; i++) {
      const deptIdx = Math.floor((i - 1) / 2); // 2 teachers per department
      const dept = departments[deptIdx];

      const user = await User.create({
        name: `Dr. Teacher ${i}`,
        email: `teacher${i}@frams.edu`,
        password: teacherPassword,
        role: 'teacher',
        isVerified: true,
        isActive: true,
      });

      const teacher = await Teacher.create({
        user: user._id,
        employeeId: `EMP${1000 + i}`,
        department: dept._id,
        qualification: 'Ph.D. in Engineering',
        specialization: 'Artificial Intelligence & Machine Learning',
        experience: Math.floor(Math.random() * 15) + 3,
        designation: i % 4 === 0 ? 'Professor' : 'Assistant Professor',
      });
      teachers.push(teacher);
    }
    console.log(`✅ Created ${teachers.length} teachers.`);

    // Set Department heads
    for (let i = 0; i < 5; i++) {
      departments[i].head = teachers[i * 2]._id;
      await departments[i].save();
    }

    // 5. Create 30 Subjects (3 per course)
    console.log('📚 Seeding Subjects...');
    const subjects = [];
    const courseSubjectNames = {
      'BTECH-CS': ['Data Structures & Algorithms', 'Database Management Systems', 'Computer Networks'],
      'MTECH-CS': ['Advanced Machine Learning', 'Distributed Systems', 'Cloud Computing Architecture'],
      'BTECH-ECE': ['Signals and Systems', 'Digital Electronics', 'Analog Circuits'],
      'MTECH-ECE': ['VLSI Design', 'Embedded Systems', 'Digital Image Processing'],
      'BTECH-ME': ['Thermodynamics', 'Fluid Mechanics', 'Theory of Machines'],
      'MTECH-ME': ['Advanced Dynamics', 'CAD/CAM Systems', 'Robotics and Automation'],
      'BTECH-CE': ['Surveying', 'Structural Analysis', 'Geotechnical Engineering'],
      'MTECH-CE': ['Structural Dynamics', 'Foundation Engineering', 'Bridge Engineering'],
      'BTECH-MBA': ['Managerial Economics', 'Financial Accounting', 'Marketing Management'],
      'MTECH-MBA': ['Corporate Governance', 'Strategic Management', 'Operations Research'],
    };

    for (const course of courses) {
      const names = courseSubjectNames[course.code] || [`Subject A for ${course.code}`, `Subject B for ${course.code}`, `Subject C for ${course.code}`];
      
      for (let j = 0; j < 3; j++) {
        // Assign teacher from the same department
        const deptTeachers = teachers.filter((t) => t.department.toString() === course.department.toString());
        const teacher = deptTeachers[j % deptTeachers.length];

        const sub = await Subject.create({
          name: names[j],
          code: `${course.code}-${101 + j}`,
          course: course._id,
          teacher: teacher._id,
          credits: Math.floor(Math.random() * 2) + 3, // 3 or 4 credits
          semester: j + 1, // Semester 1, 2, or 3
          totalClasses: 45,
          attendanceRequired: 75,
          description: `Detailed study of ${names[j]}`,
        });

        // Sync with Teacher profile
        await Teacher.findByIdAndUpdate(teacher._id, {
          $addToSet: { subjects: sub._id }
        });

        subjects.push(sub);
      }
    }
    console.log(`✅ Created ${subjects.length} subjects.`);

    // 6. Create 100 Students (10 per course)
    console.log('🎓 Seeding 100 Students...');
    const students = [];
    let studentCounter = 1;
    for (const course of courses) {
      const dept = departments.find((d) => d._id.toString() === course.department.toString());
      
      for (let sIdx = 1; sIdx <= 10; sIdx++) {
        const year = sIdx <= 5 ? 1 : 2;
        const semester = year === 1 ? 1 : 3;

        const user = await User.create({
          name: `Student ${studentCounter}`,
          email: `student${studentCounter}@frams.edu`,
          password: studentPassword,
          role: 'student',
          isVerified: true,
          isActive: true,
          phoneNumber: `98765432${(studentCounter % 90) + 10}`,
        });

        const student = await Student.create({
          user: user._id,
          rollNumber: `2026${course.code.substring(0, 4)}${studentCounter.toString().padStart(3, '0')}`,
          department: dept._id,
          course: course._id,
          year,
          semester,
          cgpa: (Math.random() * 3 + 6.5).toFixed(2), // 6.50 to 9.50
          parentEmail: `parent${studentCounter}@gmail.com`,
          parentPhone: `91234567${(studentCounter % 90) + 10}`,
          faceRegistered: true,
          faceEmbeddings: [1.0, 0.0, 0.0],
        });

        // Create sample FaceDataset entry
        await FaceDataset.create({
          student: student._id,
          imagePaths: [
            {
              url: `https://ik.imagekit.io/dummy/frams/faces/${student._id}/img1.jpg`,
              publicId: `mock_file_id_1_${student._id}`,
            },
            {
              url: `https://ik.imagekit.io/dummy/frams/faces/${student._id}/img2.jpg`,
              publicId: `mock_file_id_2_${student._id}`,
            }
          ],
          qualityScore: 0.85,
          totalImages: 2,
          isProcessed: true,
        });

        students.push(student);
        studentCounter++;
      }
    }
    console.log(`✅ Created ${students.length} students.`);

    // Update total students in departments
    for (const dept of departments) {
      const count = await Student.countDocuments({ department: dept._id });
      dept.totalStudents = count;
      await dept.save();
    }

    // 7. Seed Timetable
    console.log('📅 Seeding Timetable...');
    // Create timetable entries for each subject
    // Monday-Friday, periods 1, 2, or 3
    const timetables = [];
    for (const subject of subjects) {
      const teacherId = subject.teacher;
      const subCourse = courses.find((c) => c._id.toString() === subject.course.toString());
      
      const day = Math.floor(Math.random() * 5) + 1; // Mon to Fri (1-5)
      const period = Math.floor(Math.random() * 3) + 1; // 1, 2 or 3
      const startTimes = { 1: '09:00', 2: '10:30', 3: '12:00' };
      const endTimes = { 1: '10:15', 2: '11:45', 3: '13:15' };

      const entry = await Timetable.create({
        subject: subject._id,
        teacher: teacherId,
        day,
        startTime: startTimes[period],
        endTime: endTimes[period],
        room: `LH-${100 + period}`,
        semester: subject.semester,
        period,
        course: subject.course,
        department: subCourse.department,
      });
      timetables.push(entry);
    }
    console.log(`✅ Created ${timetables.length} timetable entries.`);

    // 8. Seed 6 months of Attendance data (approx 120 weekdays)
    console.log('📝 Seeding 6 Months Attendance Data (this might take a moment)...');
    
    const attendanceRecords = [];
    const today = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);

    // Loop through days from 6 months ago to today
    for (let day = new Date(startDate); day <= today; day.setDate(day.getDate() + 1)) {
      const dayOfWeek = day.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // weekdays only

      const dateStr = day.toISOString().split('T')[0];
      const formattedDate = new Date(dateStr);

      // Find timetables for this weekday
      const scheduledClasses = timetables.filter((t) => t.day === dayOfWeek);

      for (const scheduled of scheduledClasses) {
        // Enrolled students in this course & semester
        const enrolled = students.filter((s) => 
          s.course.toString() === scheduled.course.toString() &&
          s.semester === scheduled.semester
        );

        for (const student of enrolled) {
          // Determine status (85% present, 10% absent, 5% late)
          const rand = Math.random();
          let status = 'present';
          let isLate = false;
          let method = 'face';

          if (rand < 0.10) {
            status = 'absent';
          } else if (rand < 0.15) {
            status = 'late';
            isLate = true;
          }

          // Method distribution
          const methodRand = Math.random();
          if (methodRand < 0.5) {
            method = 'face';
          } else if (methodRand < 0.9) {
            method = 'qr';
          } else {
            method = 'manual';
          }

          attendanceRecords.push({
            student: student._id,
            subject: scheduled.subject,
            date: formattedDate,
            period: scheduled.period,
            status,
            method,
            confidence: method === 'face' ? parseFloat((Math.random() * 0.2 + 0.8).toFixed(2)) : null,
            markedBy: teachers.find((t) => t._id.toString() === scheduled.teacher.toString())?.user || admin._id,
            isLate,
          });
        }
      }
    }

    // Insert attendance in chunks of 5000 to prevent BSON size overflow
    const chunkSize = 5000;
    for (let i = 0; i < attendanceRecords.length; i += chunkSize) {
      const chunk = attendanceRecords.slice(i, i + chunkSize);
      await Attendance.insertMany(chunk, { ordered: false });
      console.log(`   Seeded ${Math.min(i + chunkSize, attendanceRecords.length)} / ${attendanceRecords.length} records...`);
    }

    console.log('✅ Attendance data seeding completed.');

    // 9. Update all students' attendance percentages in DB
    console.log('📊 Recalculating overall attendance percentages for all students...');
    for (const student of students) {
      const total = await Attendance.countDocuments({ student: student._id });
      const present = await Attendance.countDocuments({
        student: student._id,
        status: { $in: ['present', 'late'] }
      });
      student.attendancePercentage = total > 0 ? parseFloat(((present / total) * 100).toFixed(2)) : 0;
      await student.save();
    }
    console.log('📊 Attendance percentages recalculated.');

    // 10. Sample notifications & leave requests
    console.log('📋 Seeding notifications and leave requests...');
    
    // Notifications
    const notificationList = [
      {
        recipient: students[0].user,
        type: 'system',
        title: 'Welcome to FRAMS',
        message: 'Your account is verified and face recognition profile is registered.',
      },
      {
        recipient: teachers[0].user,
        type: 'leave_request',
        title: 'New leave application',
        message: 'A student has submitted a new leave application for your review.',
      }
    ];
    await Notification.insertMany(notificationList);

    // Leave request
    await LeaveRequest.create({
      student: students[0]._id,
      startDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      endDate: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000), // tomorrow
      reason: 'Suffering from viral fever. Doctor advised bed rest.',
      leaveType: 'medical',
      status: 'pending',
      affectedSubjects: [subjects[0]._id],
    });

    console.log('🏁 Seed script completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding failed:', error.message, error.stack);
    process.exit(1);
  }
};

seed();
