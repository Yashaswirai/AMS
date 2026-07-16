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
    avgAttendance: '85.4%',
    peakDay: 'Wednesday',
    atRiskCount: '24 students',
    efficiencyGains: '+4.2%'
  });

  const [loading, setLoading] = useState(false);

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
          { label: 'Biometric Scanner Uptime', value: '99.9%', icon: FiActivity, color: 'text-violet-400', bg: 'rgba(139,92,246,0.1)' },
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
              <p className="text-xl font-black text-[var(--text)] mt-1">{m.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <AttendanceAreaChart title="Interactive Enrollment & Daily Attendance Chart" />
        </div>
        <div>
          <DepartmentPieChart />
        </div>
      </div>

      {/* Second Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <AttendanceBarChart title="Subject Attendance Averages" />
        </div>
        <div className="xl:col-span-2">
          <AttendanceHeatmap title="System Activity Tracker (Monthly Heatmap)" />
        </div>
      </div>
    </div>
  );
}

export default Analytics;
