import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RiCalendarCheckLine, RiTimeLine, RiUserAddLine, RiCheckDoubleFill, RiErrorWarningLine } from 'react-icons/ri';
import api from '../../services/api.js';
import StatCard from '../../components/common/StatCard.jsx';
import AttendanceBarChart from '../../components/charts/AttendanceBarChart.jsx';

function TeacherDashboard() {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayClasses: 0,
    avgAttendance: 0,
    pendingLeaves: 0,
    unmarkedSlots: 0,
  });

  useEffect(() => {
    const fetchTeacherData = async () => {
      setLoading(true);
      try {
        const [ttRes, leavesRes] = await Promise.all([
          api.get('/timetable').catch(() => null),
          api.get('/leave').catch(() => null)
        ]);

        const rawSchedule = ttRes?.data?.data || ttRes?.data?.timetable || ttRes?.data || [];
        const rawLeaves = leavesRes?.data?.data || leavesRes?.data?.leaves || leavesRes?.data || [];

        const pending = Array.isArray(rawLeaves) ? rawLeaves.filter(l => l.status === 'pending').length : 0;

        const formattedSchedule = Array.isArray(rawSchedule) ? rawSchedule.map((item, idx) => ({
          id: item._id || item.id || idx,
          subjectCode: item.subject?.code || item.subjectCode || 'SUB',
          subjectName: item.subject?.name || item.subjectName || 'Subject',
          timeSlot: item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : (item.timeSlot || '09:00 - 10:00'),
          room: item.room || 'LHC-101',
          registeredCount: item.totalStudents || 0,
          marked: !!item.marked
        })) : [];

        setSchedule(formattedSchedule);
        setStats({
          todayClasses: formattedSchedule.length,
          avgAttendance: 0,
          pendingLeaves: pending,
          unmarkedSlots: formattedSchedule.filter(s => !s.marked).length
        });
      } catch (err) {
        console.warn('API error fetching teacher data:', err);
        setSchedule([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[var(--text)]">Teacher Portal</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Welcome back! Today is {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Today's Timetable Slots" value={stats.todayClasses} icon={RiTimeLine} color="primary" subtitle="Lectures scheduled today" />
        <StatCard title="Average Attendance Rate" value={`${stats.avgAttendance}%`} icon={RiCalendarCheckLine} color="accent" subtitle="Across courses this month" />
        <StatCard title="Pending Leave Requests" value={stats.pendingLeaves} icon={RiUserAddLine} color="warning" subtitle="Requires faculty approval" />
        <StatCard title="Unmarked Attendance" value={stats.unmarkedSlots} icon={RiErrorWarningLine} color="danger" subtitle="Action needed today" />
      </div>

      {/* Today's Schedule & Subject Performance */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Schedule */}
        <div className="xl:col-span-2 glass-card rounded-3xl p-6">
          <h3 className="font-bold text-lg text-[var(--text)] mb-4 flex items-center gap-2">
            <RiTimeLine className="text-indigo-400" /> Today's Lecture Schedule
          </h3>
          <div className="space-y-4">
            {schedule.length === 0 ? (
              <p className="text-center py-8 text-xs text-[var(--text-muted)]">No lectures scheduled for today.</p>
            ) : (
              schedule.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] transition-colors"
                >
                  <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex flex-col items-center justify-center text-white">
                      <span className="text-[10px] uppercase font-bold">Room</span>
                      <span className="text-sm font-black">{item.room.split('-')[1] || item.room}</span>
                    </div>
                    <div>
                      <span className="text-xs font-black text-indigo-400">{item.subjectCode}</span>
                      <h4 className="font-bold text-[var(--text)] text-sm mt-0.5">{item.subjectName}</h4>
                      <p className="text-xs text-[var(--text-muted)] mt-1">{item.timeSlot} • {item.registeredCount} students</p>
                    </div>
                  </div>

                  <div>
                    {item.marked ? (
                      <span className="badge badge-success flex items-center gap-1">
                        <RiCheckDoubleFill /> Marked
                      </span>
                    ) : (
                      <span className="badge badge-warning flex items-center gap-1">
                        Pending Mark
                      </span>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Quick Insights chart */}
        <div className="xl:col-span-1">
          <AttendanceBarChart title="Subject Roll Attendance Trend" />
        </div>
      </div>
    </div>
  );
}

export default TeacherDashboard;
