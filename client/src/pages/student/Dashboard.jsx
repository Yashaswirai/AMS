import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RiCalendarCheckLine, RiBookOpenLine, RiRobotLine, RiArrowRightUpLine, RiAlertLine } from 'react-icons/ri';
import api from '../../services/api.js';
import StatCard from '../../components/common/StatCard.jsx';
import AttendanceCalendar from '../../components/attendance/AttendanceCalendar.jsx';

function StudentDashboard() {
  const [stats, setStats] = useState({
    overallPercentage: 0,
    totalClasses: 0,
    attendedClasses: 0,
    absentClasses: 0,
    subjects: [],
    aiInsight: 'Welcome to FRAMS! You currently have no logged attendance records. Attend classes to start building your academic attendance profile.'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentStats = async () => {
      setLoading(true);
      try {
        const res = await api.get('/attendance/stats/me');
        const data = res.data?.data || res.data;
        if (data && data.overall) {
          const overallPct = data.overall.percentage || 0;
          const total = data.overall.total || 0;
          const present = data.overall.present || 0;
          const absent = total - present;

          const subjectsList = (data.subjects || []).map(s => ({
            code: s.subjectCode || 'SUB',
            name: s.subjectName || 'Subject',
            percentage: s.percentage || 0,
            classesAttended: s.presentClasses || 0,
            classesTotal: s.totalClasses || 0,
          }));

          let insight = 'Your attendance records are up to date.';
          if (total === 0) {
            insight = 'Welcome to FRAMS! You currently have no logged attendance records. Attend classes to start building your academic attendance profile.';
          } else if (overallPct >= 85) {
            insight = `Great job! Your attendance rate is ${overallPct}%. Keep up the good work across all your enrolled courses.`;
          } else if (overallPct >= 75) {
            insight = `Your attendance rate is ${overallPct}%. Stay consistent to avoid falling below the mandatory 75% threshold.`;
          } else {
            insight = `Warning: Your attendance rate is ${overallPct}%, which is below the 75% threshold. Please attend upcoming lectures to raise your compliance score.`;
          }

          setStats({
            overallPercentage: overallPct,
            totalClasses: total,
            attendedClasses: present,
            absentClasses: absent > 0 ? absent : 0,
            subjects: subjectsList,
            aiInsight: insight,
          });
        }
      } catch (err) {
        console.warn('Could not fetch student stats from API:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentStats();
  }, []);

  // Compute Circular Stroke details
  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (stats.overallPercentage / 100) * circumference;

  const getPercentageColor = (pct) => {
    if (pct < 75) return '#ef4444';
    if (pct < 85) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[var(--text)]">Student Hub</h1>
        <p className="text-sm text-[var(--text-muted)]">Check your academic records and compliance ratings</p>
      </div>

      {/* Overview Rows */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Overall Attendance Circle */}
        <div className="glass-card rounded-3xl p-6 flex flex-col items-center justify-center text-center">
          <h3 className="font-bold text-sm text-[var(--text-muted)] uppercase tracking-wider mb-4">Overall Performance</h3>
          
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="circular-progress w-full h-full">
              <circle
                className="text-[var(--border)]"
                strokeWidth={strokeWidth}
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx="72"
                cy="72"
              />
              <circle
                className="progress-ring-circle"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke={getPercentageColor(stats.overallPercentage)}
                fill="transparent"
                r={radius}
                cx="72"
                cy="72"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-[var(--text)]">{stats.overallPercentage}%</span>
              <span className="text-[10px] text-[var(--text-muted)] font-semibold">Attendance</span>
            </div>
          </div>

          <div className="mt-4 flex gap-4 text-xs text-[var(--text-muted)] font-semibold">
            <p>Attended: <strong className="text-emerald-400">{stats.attendedClasses}</strong></p>
            <p>Absent: <strong className="text-red-400">{stats.absentClasses}</strong></p>
          </div>
        </div>

        {/* Right: AI Insights Card */}
        <div className="xl:col-span-2 glass-card rounded-3xl p-6 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <RiRobotLine className="text-indigo-400 text-lg animate-pulse" />
            </div>
            <h3 className="font-bold text-[var(--text)]">Cognitive Attendance Insights</h3>
          </div>

          <p className="text-xs text-[var(--text-muted)] leading-relaxed bg-[var(--surface-elevated)] p-4 rounded-2xl border border-[var(--border)]">
            {stats.aiInsight}
          </p>

          <div className="flex gap-3 mt-4 text-xs text-indigo-400 font-semibold cursor-pointer items-center hover:underline">
            View low attendance counseling resources <RiArrowRightUpLine />
          </div>
        </div>
      </div>

      {/* Subject-Wise breakdown & Mini Calendar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Subject progress list */}
        <div className="xl:col-span-2 glass-card rounded-3xl p-6 space-y-5">
          <h3 className="font-bold text-[var(--text)] border-b border-[var(--border)] pb-3">Course Attendance Progress</h3>
          <div className="space-y-4">
            {stats.subjects.length === 0 ? (
              <div className="text-center py-8 text-xs text-[var(--text-muted)]">
                No course attendance logged yet. Attendance progress will appear here once classes are conducted and marked.
              </div>
            ) : (
              stats.subjects.map((sub, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-[var(--text)]">{sub.code} - {sub.name}</span>
                    <span className="font-bold" style={{ color: getPercentageColor(sub.percentage) }}>
                      {sub.percentage}% ({sub.classesAttended}/{sub.classesTotal})
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${sub.percentage}%`,
                        backgroundColor: getPercentageColor(sub.percentage)
                      }}
                    />
                  </div>
                  {sub.percentage < 75 && (
                    <p className="text-[10px] text-red-400 flex items-center gap-1 font-semibold">
                      <RiAlertLine /> Critical: At-Risk. Exemptions or additional check-ins required to reach compliance.
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Mini Calendar heatmap */}
        <div className="xl:col-span-1 glass-card rounded-3xl p-4">
          <h3 className="font-bold text-sm text-[var(--text)] mb-3">Attendance Heatmap</h3>
          <AttendanceCalendar />
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
