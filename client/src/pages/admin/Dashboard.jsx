import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RiGroupLine, RiTeamLine, RiCalendarCheckLine, RiAlertLine, RiArrowUpLine, RiRobotLine, RiRefreshLine } from 'react-icons/ri';
import StatCard from '../../components/common/StatCard.jsx';
import AttendanceAreaChart from '../../components/charts/AttendanceAreaChart.jsx';
import DepartmentPieChart from '../../components/charts/DepartmentPieChart.jsx';
import AttendanceBarChart from '../../components/charts/AttendanceBarChart.jsx';
import api from '../../services/api.js';

const RECENT_ACTIVITY = [
  { id: 1, type: 'attendance', msg: 'CS301 attendance marked by Dr. Smith', time: '2 min ago', icon: '✅' },
  { id: 2, type: 'alert', msg: 'Ravi Kumar attendance below 75%', time: '15 min ago', icon: '⚠️' },
  { id: 3, type: 'face', msg: 'Face profile registered for Sarah M.', time: '1 hr ago', icon: '👤' },
  { id: 4, type: 'leave', msg: 'Leave request approved for Batch B', time: '2 hr ago', icon: '📋' },
  { id: 5, type: 'system', msg: 'AI model retrained with 200 new images', time: '3 hr ago', icon: '🤖' },
];

const AI_ALERTS = [
  { id: 1, severity: 'high', msg: '12 students have attendance below 60% — immediate action required', subject: 'CS101' },
  { id: 2, severity: 'medium', msg: 'Attendance drop detected in PHY201 on Fridays — consider schedule review', subject: 'PHY201' },
  { id: 3, severity: 'low', msg: '5 students consistently late — recommend counseling', subject: 'MATH301' },
];

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState(AI_ALERTS);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data?.data || res.data);
    } catch {
      // Fallback mock data
      setStats({
        totalStudents: 1248,
        totalTeachers: 84,
        todayAttendance: 87.3,
        atRiskStudents: 23,
        studentChange: 12,
        teacherChange: 5,
        attendanceChange: -2.1,
        riskChange: -8,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const getSeverityStyle = (severity) => {
    if (severity === 'high') return { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', color: '#ef4444', badge: 'badge-danger' };
    if (severity === 'medium') return { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', color: '#f59e0b', badge: 'badge-warning' };
    return { bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)', color: '#6366f1', badge: 'badge-info' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          className="btn-secondary text-sm flex items-center gap-1.5"
          onClick={fetchStats}
          disabled={loading}
        >
          <RiRefreshLine className={loading ? 'animate-spin' : ''} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={loading ? '—' : stats?.totalStudents?.toLocaleString()} change={stats?.studentChange} changeType="positive" icon={RiGroupLine} color="primary" loading={loading} subtitle="Enrolled this semester" />
        <StatCard title="Total Teachers" value={loading ? '—' : stats?.totalTeachers} change={stats?.teacherChange} changeType="positive" icon={RiTeamLine} color="secondary" loading={loading} subtitle="Active faculty" />
        <StatCard title="Today's Attendance" value={loading ? '—' : `${stats?.todayAttendance}%`} change={Math.abs(stats?.attendanceChange || 0)} changeType={stats?.attendanceChange >= 0 ? 'positive' : 'negative'} icon={RiCalendarCheckLine} color="accent" loading={loading} subtitle="Across all departments" />
        <StatCard title="At-Risk Students" value={loading ? '—' : stats?.atRiskStudents} change={Math.abs(stats?.riskChange || 0)} changeType="negative" icon={RiAlertLine} color="danger" loading={loading} subtitle="Below 75% attendance" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <AttendanceAreaChart title="Weekly Attendance Trend" />
        </div>
        <DepartmentPieChart />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* AI Alerts */}
        <div className="xl:col-span-2 card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
                <RiRobotLine className="text-white text-sm" />
              </div>
              <h3 className="font-bold" style={{ color: 'var(--text)' }}>AI Insights & Alerts</h3>
            </div>
            <span className="badge badge-info">{aiInsights.length} alerts</span>
          </div>
          <div className="space-y-3">
            {aiInsights.map((alert, i) => {
              const style = getSeverityStyle(alert.severity);
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: style.bg, border: `1px solid ${style.border}` }}
                >
                  <RiAlertLine style={{ color: style.color, flexShrink: 0, marginTop: 2 }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: 'var(--text)' }}>{alert.msg}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Subject: {alert.subject}</p>
                  </div>
                  <span className={`badge ${style.badge} flex-shrink-0`}>{alert.severity}</span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card rounded-2xl p-6">
          <h3 className="font-bold mb-4" style={{ color: 'var(--text)' }}>Recent Activity</h3>
          <div className="space-y-4">
            {RECENT_ACTIVITY.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-3"
              >
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug" style={{ color: 'var(--text)' }}>{item.msg}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-subtle)' }}>{item.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Subject chart */}
      <AttendanceBarChart title="Subject-wise Attendance" horizontal />
    </div>
  );
}

export default AdminDashboard;
