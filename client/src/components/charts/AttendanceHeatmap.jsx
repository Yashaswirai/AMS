import React, { useState } from 'react';
import { motion } from 'framer-motion';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function AttendanceHeatmap({ data = [], title = 'Yearly Attendance Heatmap' }) {
  const [tooltip, setTooltip] = useState(null);

  // Generate last 52 weeks of data
  const generateWeeks = () => {
    const weeks = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);

    for (let w = 0; w < 53; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + w * 7 + d);
        if (date > today) { week.push(null); continue; }

        const dateStr = date.toISOString().split('T')[0];
        const dayData = data.find(item => item.date === dateStr);
        const value = dayData ? dayData.value : 0;

        week.push({ date: dateStr, value, dayOfWeek: date.getDay(), month: date.getMonth() });
      }
      weeks.push(week);
    }
    return weeks;
  };

  const weeks = generateWeeks();

  const getColor = (value) => {
    if (value === null || value === 0) return 'rgba(99,102,241,0.06)';
    if (value === 1) return 'rgba(99,102,241,0.25)';
    if (value === 2) return 'rgba(99,102,241,0.5)';
    if (value === 3) return 'rgba(99,102,241,0.75)';
    return '#6366f1';
  };

  const getLegendLabel = (v) => {
    if (v === 0) return 'No data';
    if (v === 1) return '1-25% present';
    if (v === 2) return '26-50% present';
    if (v === 3) return '51-75% present';
    return '76-100% present';
  };

  // Get month labels
  const monthLabels = [];
  weeks.forEach((week, wi) => {
    const firstDay = week.find(d => d !== null);
    if (firstDay && (wi === 0 || weeks[wi - 1]?.find(d => d !== null)?.month !== firstDay.month)) {
      monthLabels.push({ wi, label: MONTHS[firstDay.month] });
    }
  });

  return (
    <div className="card rounded-2xl p-6">
      <h3 className="text-base font-bold mb-4" style={{ color: 'var(--text)' }}>{title}</h3>

      <div className="overflow-x-auto">
        <div style={{ minWidth: '700px' }}>
          {/* Month labels */}
          <div className="flex mb-1 pl-8">
            {weeks.map((_, wi) => {
              const ml = monthLabels.find(m => m.wi === wi);
              return (
                <div key={wi} style={{ width: '14px', marginRight: '2px', flexShrink: 0 }}>
                  {ml && (
                    <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-subtle)', fontSize: '10px' }}>
                      {ml.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Day labels + Grid */}
          <div className="flex">
            <div className="flex flex-col justify-around mr-2" style={{ width: '24px' }}>
              {DAYS.map((day, i) => (
                <span key={i} className="text-xs" style={{ color: 'var(--text-subtle)', fontSize: '10px', height: '14px', lineHeight: '14px' }}>
                  {i % 2 === 1 ? day : ''}
                </span>
              ))}
            </div>

            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col" style={{ marginRight: '2px' }}>
                {week.map((day, di) => (
                  <div
                    key={di}
                    className="heatmap-cell relative"
                    style={{
                      width: '14px',
                      height: '14px',
                      marginBottom: '2px',
                      background: day ? getColor(day.value) : 'transparent',
                      borderRadius: '2px',
                      cursor: day ? 'pointer' : 'default',
                    }}
                    onMouseEnter={(e) => {
                      if (day) setTooltip({ ...day, x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-3 pl-8">
            <span className="text-xs" style={{ color: 'var(--text-subtle)', fontSize: '10px' }}>Less</span>
            {[0, 1, 2, 3, 4].map(v => (
              <div key={v} style={{ width: '14px', height: '14px', background: getColor(v), borderRadius: '2px' }} />
            ))}
            <span className="text-xs" style={{ color: 'var(--text-subtle)', fontSize: '10px' }}>More</span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed z-50 pointer-events-none rounded-lg p-2 shadow-xl"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 40,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{tooltip.date}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{getLegendLabel(tooltip.value)}</p>
        </motion.div>
      )}
    </div>
  );
}

export default AttendanceHeatmap;
