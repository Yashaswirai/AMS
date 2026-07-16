import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl p-3 shadow-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-sm font-bold" style={{ color: '#6366f1' }}>
          {payload[0].value}% Attendance
        </p>
      </div>
    );
  }
  return null;
};

function AttendanceBarChart({ data = [], title = 'Subject-wise Attendance', horizontal = false }) {
  const sampleData = data.length > 0 ? data : [
    { name: 'Mathematics', attendance: 88 },
    { name: 'Physics', attendance: 72 },
    { name: 'Chemistry', attendance: 91 },
    { name: 'English', attendance: 85 },
    { name: 'CS Fundamentals', attendance: 95 },
    { name: 'Lab Work', attendance: 79 },
  ];

  const getColor = (value) => {
    if (value >= 85) return '#10b981';
    if (value >= 75) return '#f59e0b';
    return '#ef4444';
  };

  if (horizontal) {
    return (
      <div className="card rounded-2xl p-6">
        <h3 className="text-base font-bold mb-6" style={{ color: 'var(--text)' }}>{title}</h3>
        <ResponsiveContainer width="100%" height={Math.max(260, sampleData.length * 50)}>
          <BarChart data={sampleData} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={90} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="attendance" radius={[0, 6, 6, 0]} maxBarSize={20}>
              {sampleData.map((entry, index) => (
                <Cell key={index} fill={getColor(entry.attendance)} />
              ))}
              <LabelList dataKey="attendance" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 11, fill: 'var(--text-muted)', fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="card rounded-2xl p-6">
      <h3 className="text-base font-bold mb-6" style={{ color: 'var(--text)' }}>{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={sampleData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="attendance" radius={[6, 6, 0, 0]} maxBarSize={36}>
            {sampleData.map((entry, index) => (
              <Cell key={index} fill={`url(#barGrad${index})`} />
            ))}
          </Bar>
          <defs>
            {sampleData.map((_, i) => (
              <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            ))}
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default AttendanceBarChart;
