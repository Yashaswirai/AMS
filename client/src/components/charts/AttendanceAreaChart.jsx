import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl p-3 shadow-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-sm font-bold" style={{ color: p.color }}>
            {p.name}: {p.value}%
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function AttendanceAreaChart({ data = [], title = 'Attendance Trend' }) {
  const sampleData = data.length > 0 ? data : [
    { day: 'Mon', present: 88, absent: 12, late: 5 },
    { day: 'Tue', present: 92, absent: 8, late: 3 },
    { day: 'Wed', present: 79, absent: 21, late: 8 },
    { day: 'Thu', present: 95, absent: 5, late: 2 },
    { day: 'Fri', present: 85, absent: 15, late: 6 },
    { day: 'Sat', present: 70, absent: 30, late: 4 },
    { day: 'Sun', present: 60, absent: 40, late: 1 },
  ];

  return (
    <div className="card rounded-2xl p-6">
      <h3 className="text-base font-bold mb-6" style={{ color: 'var(--text)' }}>{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={sampleData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="absentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', color: 'var(--text-muted)', paddingTop: '16px' }}
          />
          <Area type="monotone" dataKey="present" name="Present" stroke="#6366f1" strokeWidth={2.5} fill="url(#presentGrad)" dot={false} />
          <Area type="monotone" dataKey="absent" name="Absent" stroke="#ef4444" strokeWidth={2} fill="url(#absentGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default AttendanceAreaChart;
