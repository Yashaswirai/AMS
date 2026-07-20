import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiChevronLeft, FiChevronRight, FiCalendar } from 'react-icons/fi';
import AttendanceCalendar from '../../components/attendance/AttendanceCalendar.jsx';
import api from '../../services/api.js';

function StudentAttendanceCalendar() {
  const [subjectsList, setSubjectsList] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('All Courses');
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCalendarData = async () => {
      setLoading(true);
      try {
        const [subsRes, logsRes] = await Promise.all([
          api.get('/subjects').catch(() => null),
          api.get('/attendance/history?studentId=me').catch(() => null)
        ]);

        const rawSubs = subsRes?.data?.data || subsRes?.data?.subjects || subsRes?.data || [];
        if (Array.isArray(rawSubs)) {
          setSubjectsList(['All Courses', ...rawSubs.map(s => s.code ? `${s.code} ${s.name || ''}`.trim() : s.name)]);
        } else {
          setSubjectsList(['All Courses']);
        }

        const rawLogs = logsRes?.data?.data?.records || (Array.isArray(logsRes?.data?.data) ? logsRes.data.data : logsRes?.data?.records || logsRes?.data?.logs || []);
        const attMap = {};
        if (Array.isArray(rawLogs)) {
          rawLogs.forEach(item => {
            if (item.date) {
              const dateKey = new Date(item.date).toISOString().split('T')[0];
              attMap[dateKey] = item.status || 'present';
            }
          });
        }
        setAttendanceData(attMap);
      } catch (err) {
        console.warn('API error fetching student calendar data:', err);
        setAttendanceData({});
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarData();
  }, []);

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
            {subjectsList.map((sub, i) => (
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

        {/* Large Calendar Heatmap Card */}
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
            <AttendanceCalendar attendanceData={attendanceData} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentAttendanceCalendar;
