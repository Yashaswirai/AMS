import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RiGroupLine, RiTeamLine, RiCalendarCheckLine, RiAlertLine, RiRobotLine, RiRefreshLine } from 'react-icons/ri';
import StatCard from '../../components/common/StatCard.jsx';
import AttendanceAreaChart from '../../components/charts/AttendanceAreaChart.jsx';
import DepartmentPieChart from '../../components/charts/DepartmentPieChart.jsx';
import AttendanceBarChart from '../../components/charts/AttendanceBarChart.jsx';
import api from '../../services/api.js';

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState([]);
  const [deptData, setDeptData] = useState([]);
  const [courseData, setCourseData] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Admin Overview Stats
      const overviewRes = await api.get('/admin/dashboard');
      const overview = overviewRes.data?.data || overviewRes.data || {};
      setStats(overview);

      // Transform weekly trend data for chart
      if (Array.isArray(overview.weeklyTrend)) {
        setTrendData(overview.weeklyTrend.map(t => ({
          day: t.dayName || t.date,
          present: t.percentage || 0,
          absent: t.total > 0 ? Math.round(((t.total - t.present) / t.total) * 100) : 0
        })));
      }

      // 2. Fetch Department Breakdown
      const deptRes = await api.get('/analytics/departments').catch(() => ({ data: [] }));
      const depts = deptRes.data?.data || deptRes.data || [];
      if (Array.isArray(depts)) {
        setDeptData(depts.map(d => ({
          name: d.department || d.departmentCode || 'Dept',
          value: d.attendance || 0
        })));
      }

      // 3. Fetch Course Breakdown
      const crsRes = await api.get('/analytics/courses').catch(() => ({ data: [] }));
      const courses = crsRes.data?.data || crsRes.data || [];
      if (Array.isArray(courses)) {
        setCourseData(courses.map(c => ({
          name: c.courseCode ? `${c.courseCode}` : (c.courseName || 'Course'),
          attendance: c.attendance || 0
        })));
      }

      // 4. Fetch Real Audit Logs (Recent Activity)
      const auditRes = await api.get('/admin/audit-logs?limit=5').catch(() => ({ data: [] }));
      const logs = auditRes.data?.data?.logs || auditRes.data?.data || auditRes.data || [];
      if (Array.isArray(logs) && logs.length > 0) {
        setRecentActivity(logs.map((l, i) => ({
          id: l._id || i,
          msg: `${l.action || 'Event'}: ${l.resource || 'System'} ${l.details || ''}`,
          time: l.createdAt ? new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently',
          icon: '📌'
        })));
      } else {
        setRecentActivity([]);
      }

      // 5. Fetch Real AI Insights
      const aiRes = await api.get('/ai/insights').catch(() => ({ data: [] }));
      const insights = aiRes.data?.data?.insights || aiRes.data?.data || [];
      if (Array.isArray(insights) && insights.length > 0) {
        setAiInsights(insights.map((item, idx) => ({
          id: idx,
          title: item.title || 'Attendance Alert',
          severity: item.impact || item.severity || 'info',
          msg: item.observation || item.message || item.msg || item.title || 'Attendance System Insight',
          recommendation: item.recommendation || ''
        })));
      } else {
        setAiInsights([]);
      }
    } catch (err) {
      console.warn('Failed to load live dashboard stats:', err);
      setStats({
        totalStudents: 0,
        totalTeachers: 0,
        todayAttendance: { percentage: 0, present: 0, total: 0 },
        atRiskStudents: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getSeverityStyle = (severity) => {
    if (severity === 'high' || severity === 'critical') return { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', color: '#ef4444', badge: 'badge-danger' };
    if (severity === 'medium' || severity === 'warning') return { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', color: '#f59e0b', badge: 'badge-warning' };
    return { bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)', color: '#6366f1', badge: 'badge-info' };
  };

  const todayPercentage = typeof stats?.todayAttendance === 'object'
    ? (stats.todayAttendance?.percentage || 0)
    : (stats?.todayAttendance || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Admin Control Panel</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          className="btn-secondary text-sm flex items-center gap-1.5"
          onClick={fetchDashboardData}
          disabled={loading}
        >
          <RiRefreshLine className={loading ? 'animate-spin' : ''} />
          {loading ? 'Refreshing...' : 'Refresh Live Data'}
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={loading ? '—' : stats?.totalStudents?.toLocaleString()} icon={RiGroupLine} color="primary" loading={loading} subtitle="Active database profiles" />
        <StatCard title="Total Teachers" value={loading ? '—' : stats?.totalTeachers} icon={RiTeamLine} color="secondary" loading={loading} subtitle="Active faculty members" />
        <StatCard title="Today's Attendance" value={loading ? '—' : `${todayPercentage}%`} icon={RiCalendarCheckLine} color="accent" loading={loading} subtitle={stats?.todayAttendance?.total ? `${stats.todayAttendance.present} of ${stats.todayAttendance.total} checked in` : 'No check-ins today yet'} />
        <StatCard title="At-Risk Students" value={loading ? '—' : stats?.atRiskStudents} icon={RiAlertLine} color="danger" loading={loading} subtitle="Below 75% attendance threshold" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <AttendanceAreaChart data={trendData} title="Weekly Live Attendance Trend" />
        </div>
        <DepartmentPieChart data={deptData} title="Department Attendance Breakdown" />
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
            <span className="badge badge-info">{aiInsights.length} active alerts</span>
          </div>
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
            {aiInsights.map((alert, i) => {
              const style = getSeverityStyle(alert.severity);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: style.bg, border: `1px solid ${style.border}` }}
                >
                  <RiAlertLine style={{ color: style.color, flexShrink: 0, marginTop: 2 }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--text)]">{alert.title}</p>
                    <p className="text-xs mt-0.5 text-[var(--text-muted)]">{alert.msg}</p>
                    {alert.recommendation && (
                      <p className="text-xs mt-1.5 text-indigo-400 font-medium flex items-center gap-1">
                        💡 {alert.recommendation}
                      </p>
                    )}
                  </div>
                  <span className={`badge ${style.badge} flex-shrink-0`}>{alert.severity}</span>
                </motion.div>
              );
            })}

            {aiInsights.length === 0 && (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                No active critical AI alerts detected for the current session.
              </p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card rounded-2xl p-6">
          <h3 className="font-bold mb-4" style={{ color: 'var(--text)' }}>Recent System Activity</h3>
          <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
            {recentActivity.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start gap-3"
              >
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug" style={{ color: 'var(--text)' }}>{item.msg}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-subtle)' }}>{item.time}</p>
                </div>
              </motion.div>
            ))}

            {recentActivity.length === 0 && (
              <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>
                No recent activity logged yet today.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Course chart */}
      <AttendanceBarChart data={courseData} title="Course-wise Attendance Distribution" horizontal />

      {/* Admin Geofencing Control Section */}
      <GeofenceSettingsCard />
    </div>
  );
}

function GeofenceSettingsCard() {
  const [geofence, setGeofence] = useState({
    enabled: true,
    latitude: 28.6139,
    longitude: 77.2090,
    radiusMeters: 100,
    locationName: 'Main Campus Lecture Building'
  });
  const [saving, setSaving] = useState(false);
  const [fetchingLoc, setFetchingLoc] = useState(false);

  useEffect(() => {
    api.get('/admin/geofence')
      .then(res => {
        const data = res.data?.data || res.data;
        if (data) setGeofence(data);
      })
      .catch(err => console.warn('Failed to load geofence settings:', err));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/admin/geofence', geofence);
      const updated = res.data?.data || res.data;
      setGeofence(updated);
      alert('Geofence configuration saved successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save geofence configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleAcquireGPS = () => {
    if ('geolocation' in navigator) {
      setFetchingLoc(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeofence(prev => ({
            ...prev,
            latitude: parseFloat(pos.coords.latitude.toFixed(6)),
            longitude: parseFloat(pos.coords.longitude.toFixed(6))
          }));
          setFetchingLoc(false);
        },
        (err) => {
          alert('GPS Location access denied or timed out.');
          setFetchingLoc(false);
        },
        { timeout: 10000 }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  return (
    <div className="card rounded-2xl p-6 mt-6 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[var(--border)] pb-4 gap-3">
        <div>
          <h3 className="font-bold text-lg text-[var(--text)] flex items-center gap-2">
            📍 Campus Geofencing Configuration
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Restrict student QR Code Attendance check-ins strictly to designated physical GPS campus coordinates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${geofence.enabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
            {geofence.enabled ? '✓ Geofence Active' : '✕ Disabled'}
          </span>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4 pt-2">
        <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)]">
          <div>
            <p className="text-xs font-bold text-[var(--text)]">Enable Geofencing Enforcer</p>
            <p className="text-[10px] text-[var(--text-subtle)]">Students outside radius will be blocked during QR check-in</p>
          </div>
          <input
            type="checkbox"
            checked={geofence.enabled}
            onChange={(e) => setGeofence(prev => ({ ...prev, enabled: e.target.checked }))}
            className="w-5 h-5 accent-indigo-500 cursor-pointer"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-[var(--text-subtle)]">Location Name</label>
            <input
              type="text"
              className="input-field text-xs"
              value={geofence.locationName || ''}
              onChange={(e) => setGeofence(prev => ({ ...prev, locationName: e.target.value }))}
              placeholder="e.g. Main Campus Block A"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-[var(--text-subtle)]">Latitude</label>
            <input
              type="number"
              step="any"
              className="input-field text-xs"
              value={geofence.latitude}
              onChange={(e) => setGeofence(prev => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-[var(--text-subtle)]">Longitude</label>
            <input
              type="number"
              step="any"
              className="input-field text-xs"
              value={geofence.longitude}
              onChange={(e) => setGeofence(prev => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-[var(--text-subtle)]">Max Radius (Meters)</label>
            <input
              type="number"
              className="input-field text-xs"
              value={geofence.radiusMeters}
              onChange={(e) => setGeofence(prev => ({ ...prev, radiusMeters: parseInt(e.target.value) || 50 }))}
              min="10"
              max="5000"
              required
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleAcquireGPS}
            disabled={fetchingLoc}
            className="btn-secondary py-2 px-4 text-xs rounded-xl flex items-center gap-1.5"
          >
            {fetchingLoc ? 'Acquiring GPS...' : '📍 Use My Current GPS Location'}
          </button>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary py-2 px-6 text-xs rounded-xl"
          >
            {saving ? 'Saving...' : 'Save Geofence Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AdminDashboard;
