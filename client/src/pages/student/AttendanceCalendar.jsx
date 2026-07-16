import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiChevronLeft, FiChevronRight, FiCalendar } from 'react-icons/fi';
import AttendanceCalendar from '../../components/attendance/AttendanceCalendar.jsx';

const SUBJECTS = ['All Courses', 'CS-301 Data Structures', 'CS-302 Database Management', 'CS-303 Computer Networks'];

function StudentAttendanceCalendar() {
  const [selectedSubject, setSelectedSubject] = useState('All Courses');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[var(--text)]">Academic Attendance Calendar</h1>
        <p className="text-sm text-[var(--text-muted)]">Visualise daily class participation and monthly check-in grids</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Course Filter Card */}
        <div className="lg:col-span-1 glass-card rounded-3xl p-6 h-fit space-y-4">
          <h3 className="font-bold text-[var(--text)] border-b border-[var(--border)] pb-3">Course Scope</h3>
          <div className="space-y-2">
            {SUBJECTS.map((sub, i) => (
              <div
                key={i}
                onClick={() => setSelectedSubject(sub)}
                className={`p-3 rounded-2xl cursor-pointer text-xs font-semibold border transition-all ${
                  selectedSubject === sub
                    ? 'border-indigo-400 bg-indigo-500/10 text-indigo-400'
                    : 'border-[var(--border)] hover:bg-[var(--surface-elevated)] text-[var(--text)]'
                }`}
              >
                {sub}
              </div>
            ))}
          </div>
        </div>

        {/* Large Calendar Calendar Heatmap Card */}
        <div className="lg:col-span-3 glass-card rounded-3xl p-6">
          <div className="flex justify-between items-center border-b border-[var(--border)] pb-4 mb-4">
            <h3 className="font-black text-lg text-[var(--text)] flex items-center gap-2">
              <FiCalendar className="text-indigo-400" /> Monthly Audit Grid ({selectedSubject})
            </h3>
            <div className="flex gap-4 text-xs font-bold text-[var(--text-muted)]">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Present</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Absent</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Late</span>
            </div>
          </div>

          <div className="p-4 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-2xl">
            {/* Renders custom date heat grids */}
            <AttendanceCalendar />
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentAttendanceCalendar;
