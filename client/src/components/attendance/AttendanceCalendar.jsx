import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

const STATUS_CONFIG = {
  present: { color: '#10b981', bg: 'rgba(16,185,129,0.15)', label: 'Present' },
  absent: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'Absent' },
  late: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', label: 'Late' },
  holiday: { color: '#64748b', bg: 'rgba(100,116,139,0.1)', label: 'Holiday' },
  no_class: { color: '#475569', bg: 'rgba(71,85,105,0.08)', label: 'No Class' },
};

function AttendanceCalendar({ attendanceData = {}, title = 'Attendance Calendar' }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  // Sample data
  const sampleData = Object.keys(attendanceData).length > 0 ? attendanceData : (() => {
    const d = {};
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const r = Math.random();
      if (date.getDay() === 0) d[dateStr] = 'holiday';
      else if (r < 0.7) d[dateStr] = 'present';
      else if (r < 0.85) d[dateStr] = 'absent';
      else if (r < 0.95) d[dateStr] = 'late';
      else d[dateStr] = 'no_class';
    }
    return d;
  })();

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-base font-bold" style={{ color: 'var(--text)' }}>{title}</h3>
      <div className="flex items-center gap-2">
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <FiChevronLeft size={14} />
        </button>
        <span className="text-sm font-semibold min-w-[100px] text-center" style={{ color: 'var(--text)' }}>
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <FiChevronRight size={14} />
        </button>
      </div>
    </div>
  );

  const renderDays = () => (
    <div className="grid grid-cols-7 mb-2">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
        <div key={day} className="text-center py-1">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-subtle)' }}>{day}</span>
        </div>
      ))}
    </div>
  );

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = new Date(day);
        const dateStr = format(cloneDay, 'yyyy-MM-dd');
        const status = sampleData[dateStr];
        const config = status ? STATUS_CONFIG[status] : null;
        const isToday = isSameDay(cloneDay, new Date());
        const isCurrentMonth = isSameMonth(cloneDay, monthStart);

        days.push(
          <motion.div
            key={dateStr}
            whileHover={{ scale: isCurrentMonth ? 1.1 : 1 }}
            onClick={() => isCurrentMonth && status && setSelectedDay({ date: cloneDay, status, dateStr })}
            className="flex items-center justify-center aspect-square"
            style={{ cursor: isCurrentMonth && status ? 'pointer' : 'default' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center relative"
              style={{
                background: config ? config.bg : 'transparent',
                border: isToday ? '2px solid #6366f1' : 'none',
                opacity: isCurrentMonth ? 1 : 0.2,
              }}
            >
              <span className="text-xs font-medium" style={{ color: config ? config.color : 'var(--text-muted)' }}>
                {format(cloneDay, 'd')}
              </span>
            </div>
          </motion.div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div key={day.toString()} className="grid grid-cols-7">{days}</div>);
      days = [];
    }
    return rows;
  };

  return (
    <div className="card rounded-2xl p-5">
      {renderHeader()}
      {renderDays()}
      {renderCells()}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: cfg.color }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Day detail modal */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-4 p-4 rounded-xl flex items-center justify-between"
            style={{ background: STATUS_CONFIG[selectedDay.status]?.bg, border: `1px solid ${STATUS_CONFIG[selectedDay.status]?.color}30` }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: STATUS_CONFIG[selectedDay.status]?.color }}>
                {STATUS_CONFIG[selectedDay.status]?.label}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {format(selectedDay.date, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
            <button onClick={() => setSelectedDay(null)}>
              <FiX size={14} style={{ color: 'var(--text-muted)' }} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AttendanceCalendar;
