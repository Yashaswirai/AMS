import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="rounded-xl p-3 shadow-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-sm font-bold" style={{ color: item.payload.fill }}>{item.name}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Attendance: <span className="font-semibold text-white">{item.value}%</span>
        </p>
      </div>
    );
  }
  return null;
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

function DepartmentPieChart({ data = [], title = 'Department-wise Attendance' }) {
  const sampleData = data.length > 0 ? data : [
    { name: 'Computer Science', value: 87 },
    { name: 'Electronics', value: 82 },
    { name: 'Mechanical', value: 79 },
    { name: 'Civil', value: 91 },
    { name: 'Chemical', value: 75 },
  ];

  return (
    <div className="card rounded-2xl p-6">
      <h3 className="text-base font-bold mb-6" style={{ color: 'var(--text)' }}>{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={sampleData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            labelLine={false}
            label={renderCustomLabel}
          >
            {sampleData.map((entry, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '12px', color: 'var(--text-muted)' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default DepartmentPieChart;
