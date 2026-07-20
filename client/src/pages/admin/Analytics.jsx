import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiActivity, FiUsers, FiCalendar, FiPieChart } from 'react-icons/fi';
import AttendanceAreaChart from '../../components/charts/AttendanceAreaChart.jsx';
import DepartmentPieChart from '../../components/charts/DepartmentPieChart.jsx';
import AttendanceBarChart from '../../components/charts/AttendanceBarChart.jsx';
import AttendanceHeatmap from '../../components/charts/AttendanceHeatmap.jsx';
import api from '../../services/api.js';

function Analytics() {
  const [metrics, setMetrics] = useState({
    avgAttendance: '0%',
    peakDay: '—',
    atRiskCount: '0 students',
    efficiencyGains: '0%'
  });
  const [trendData, setTrendData] = useState([]);
  const [deptData, setDeptData] = useState([]);
  const [courseData, setCourseData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const [dashRes, deptRes, crsRes] = await Promise.all([
          api.get('/admin/dashboard').catch(() => null),
          api.get('/analytics/departments').catch(() => null),
          api.get('/analytics/courses').catch(() => null)
        ]);

        const overview = dashRes?.data?.data || dashRes?.data || {};
        if (overview) {
          const avg = overview.todayAttendance?.percentage ?? 0;
          const atRisk = overview.atRiskStudents ?? 0;
          setMetrics({
            avgAttendance: `${avg}%`,
            peakDay: overview.peakDay || '—',
            atRiskCount: `${atRisk} students`,
            efficiencyGains: overview.uptime || '100%'
          });

          if (Array.isArray(overview.weeklyTrend)) {
            setTrendData(overview.weeklyTrend.map(t => ({
              day: t.dayName || t.date,
              present: t.percentage || 0,
              absent: t.total > 0 ? Math.round(((t.total - t.present) / t.total) * 100) : 0
            })));
          }
        }

        const depts = deptRes?.data?.data || deptRes?.data || [];
        if (Array.isArray(depts)) {
          setDeptData(depts.map(d => ({
            name: d.department || d.departmentCode || 'Dept',
            value: d.attendance || 0
          })));
        }

        const courses = crsRes?.data?.data || crsRes?.data || [];
        if (Array.isArray(courses)) {
          setCourseData(courses.map(c => ({
            name: c.courseCode ? `${c.courseCode}` : (c.courseName || 'Course'),
            attendance: c.attendance || 0
          })));
        }
      } catch (err) {
        console.warn('API error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[var(--text)]">Attendance Analytics & Insights</h1>
        <p className="text-sm text-[var(--text-muted)]">Visualise academic engagement trends and automated classification stats</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Term Average Attendance', value: metrics.avgAttendance, icon: FiTrendingUp, color: 'text-indigo-400', bg: 'rgba(99,102,241,0.1)' },
          { label: 'Highest Attendance Day', value: metrics.peakDay, icon: FiCalendar, color: 'text-emerald-400', bg: 'rgba(16,185,129,0.1)' },
          { label: 'Identified At-Risk Profiles', value: metrics.atRiskCount, icon: FiUsers, color: 'text-red-400', bg: 'rgba(239,68,68,0.1)' },
          { label: 'System Service Status', value: metrics.efficiencyGains, icon: FiActivity, color: 'text-violet-400', bg: 'rgba(139,92,246,0.1)' },
        ].map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card rounded-2xl p-5 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: m.bg }}>
              <m.icon className={m.color} size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] leading-normal">{m.label}</p>
              <p className="text-xl font-black text-[var(--text)] mt-1">{loading ? '—' : m.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <AttendanceAreaChart data={trendData} title="Interactive Enrollment & Daily Attendance Chart" />
        </div>
        <div>
          <DepartmentPieChart data={deptData} />
        </div>
      </div>

      {/* Second Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <AttendanceBarChart data={courseData} title="Subject Attendance Averages" />
        </div>
        <div className="xl:col-span-2">
          <AttendanceHeatmap title="System Activity Tracker (Monthly Heatmap)" />
        </div>
      </div>
    </div>
  );
}

export default Analytics;
