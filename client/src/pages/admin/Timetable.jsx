import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiTrash2, FiClock, FiCalendar, FiMapPin } from 'react-icons/fi';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIMESLOTS = [
  '09:00 - 10:00',
  '10:00 - 11:00',
  '11:00 - 12:00',
  '12:00 - 13:00',
  '14:00 - 15:00',
  '15:00 - 16:00'
];

function Timetable() {
  const [timetable, setTimetable] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState(1);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    day: 'Monday',
    timeSlot: '09:00 - 10:00',
    subjectCode: '',
    room: 'LHC-101'
  });

  const fetchTimetable = async () => {
    setLoading(true);
    try {
      const [tableRes, coursesRes] = await Promise.all([
        api.get(`/timetable?courseId=${courseFilter}&semester=${semesterFilter}`).catch(() => null),
        api.get('/courses').catch(() => null)
      ]);
      const rawTable = tableRes?.data?.data || tableRes?.data?.timetable || tableRes?.data || [];
      const rawCourses = coursesRes?.data?.data || coursesRes?.data?.courses || coursesRes?.data || [];

      const normCourses = rawCourses.map(c => ({
        id: c._id || c.id,
        _id: c._id || c.id,
        name: c.name || ''
      }));

      const normTable = rawTable.map(t => ({
        id: t._id || t.id,
        _id: t._id || t.id,
        courseId: t.course?._id || t.course || t.courseId || courseFilter,
        semester: t.semester || semesterFilter,
        day: typeof t.day === 'number' ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][t.day] : (t.day || 'Monday'),
        timeSlot: t.startTime && t.endTime ? `${t.startTime} - ${t.endTime}` : (t.timeSlot || '09:00 - 10:00'),
        subjectCode: t.subject?.code || t.subjectCode || 'SUB',
        subjectName: t.subject?.name || t.subjectName || 'Subject',
        teacherName: t.teacher?.user?.name || t.teacher?.name || t.teacherName || 'Faculty',
        room: t.room || 'LHC-101'
      }));

      setTimetable(normTable);
      setCourses(normCourses);
      if (!courseFilter && normCourses.length > 0) {
        setCourseFilter(normCourses[0].id);
      }
    } catch (err) {
      console.warn('API error fetching timetable:', err);
      setTimetable([]);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, [courseFilter, semesterFilter]);

  const handleOpenAdd = () => {
    setFormData({
      day: 'Monday',
      timeSlot: '09:00 - 10:00',
      subjectCode: SUBJECTS[0]?.code || '',
      room: 'LHC-101'
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.subjectCode) {
      toast.error('Please select a subject');
      return;
    }

    // Check if slot already taken
    const conflict = timetable.find(
      t => t.courseId === courseFilter &&
           t.semester === semesterFilter &&
           t.day === formData.day &&
           t.timeSlot === formData.timeSlot
    );

    if (conflict) {
      toast.error(`Conflict! A class (${conflict.subjectCode}) is already scheduled for this slot.`);
      return;
    }

    try {
      const subject = SUBJECTS.find(s => s.code === formData.subjectCode);
      const newSlot = {
        courseId: courseFilter,
        semester: semesterFilter,
        ...formData,
        subjectName: subject?.name || '',
        teacherName: subject?.teacher || 'Faculty',
      };
      
      const res = await api.post('/timetable', newSlot);
      setTimetable(prev => [...prev, { id: res.data?.slot?.id || Date.now(), ...newSlot }]);
      toast.success('Timetable slot added successfully');
      setModalOpen(false);
    } catch (err) {
      console.warn('API save timetable error, simulating locally:', err);
      const subject = SUBJECTS.find(s => s.code === formData.subjectCode);
      const newSlot = {
        id: Date.now(),
        courseId: courseFilter,
        semester: semesterFilter,
        ...formData,
        subjectName: subject?.name || '',
        teacherName: subject?.teacher || 'Faculty',
      };
      setTimetable(prev => [...prev, newSlot]);
      toast.success('Timetable slot added (local)');
      setModalOpen(false);
    }
  };

  const handleDeleteSlot = async (id) => {
    try {
      await api.delete(`/timetable/${id}`);
      setTimetable(prev => prev.filter(t => t.id !== id));
      toast.success('Slot removed successfully');
    } catch (err) {
      console.warn('API delete timetable error, simulating locally:', err);
      setTimetable(prev => prev.filter(t => t.id !== id));
      toast.success('Slot removed (local)');
    }
  };

  // Organize classes into a mapping for quick lookup: [day][timeslot]
  const timetableMap = {};
  DAYS.forEach(day => {
    timetableMap[day] = {};
    TIMESLOTS.forEach(slot => {
      timetableMap[day][slot] = null;
    });
  });

  timetable.forEach(item => {
    if (item.courseId === courseFilter && item.semester === semesterFilter) {
      if (timetableMap[item.day] && timetableMap[item.day][item.timeSlot] !== undefined) {
        timetableMap[item.day][item.timeSlot] = item;
      }
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text)]">Weekly Timetable</h1>
          <p className="text-sm text-[var(--text-muted)]">Configure weekly lecture schedules for automated attendance tracking</p>
        </div>
        <button className="btn-primary" onClick={handleOpenAdd}>
          <FiPlus /> Schedule Lecture
        </button>
      </div>

      {/* Selector Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          className="input-field sm:w-64"
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
        >
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          className="input-field sm:w-40"
          value={semesterFilter}
          onChange={(e) => setSemesterFilter(parseInt(e.target.value))}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
            <option key={s} value={s}>Semester {s}</option>
          ))}
        </select>
      </div>

      {/* Timetable Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : (
        <div className="glass-card rounded-2xl p-6 overflow-x-auto">
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr>
                <th className="p-3 text-left border-b border-[var(--border)] text-[var(--text-muted)] text-sm font-semibold w-32">Day</th>
                {TIMESLOTS.map(slot => (
                  <th key={slot} className="p-3 text-center border-b border-[var(--border)] text-[var(--text-muted)] text-xs font-semibold">
                    <div className="flex items-center justify-center gap-1">
                      <FiClock size={12} />
                      {slot}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map(day => (
                <tr key={day} className="border-b border-[var(--border)] last:border-none">
                  <td className="p-4 font-bold text-[var(--text)] text-sm border-r border-[var(--border)]">{day}</td>
                  {TIMESLOTS.map(slot => {
                    const lecture = timetableMap[day][slot];
                    return (
                      <td key={slot} className="p-2 w-[150px] align-middle">
                        {lecture ? (
                          <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="p-3 rounded-xl flex flex-col relative group text-left border"
                            style={{
                              background: 'rgba(99,102,241,0.06)',
                              borderColor: 'rgba(99,102,241,0.2)',
                            }}
                          >
                            <button
                              onClick={() => handleDeleteSlot(lecture.id)}
                              className="absolute top-2 right-2 p-1 text-red-500 rounded-lg bg-transparent hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete lecture slot"
                            >
                              <FiTrash2 size={12} />
                            </button>
                            <span className="text-xs font-black text-indigo-400">{lecture.subjectCode}</span>
                            <span className="text-sm font-bold truncate text-[var(--text)] mt-0.5" title={lecture.subjectName}>
                              {lecture.subjectName}
                            </span>
                            <span className="text-xs text-[var(--text-muted)] mt-1 font-medium">{lecture.teacherName}</span>
                            <span className="text-xs text-[var(--text-subtle)] mt-1 flex items-center gap-1 font-semibold">
                              <FiMapPin size={10} /> {lecture.room}
                            </span>
                          </motion.div>
                        ) : (
                          <div className="h-16 rounded-xl border border-dashed border-[var(--border)] flex items-center justify-center text-[var(--text-subtle)] text-xs">
                            —
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add class modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Schedule New Class">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-muted)]">Day of Week</label>
              <select
                className="input-field"
                value={formData.day}
                onChange={(e) => setFormData(prev => ({ ...prev, day: e.target.value }))}
              >
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-muted)]">Time Slot</label>
              <select
                className="input-field"
                value={formData.timeSlot}
                onChange={(e) => setFormData(prev => ({ ...prev, timeSlot: e.target.value }))}
              >
                {TIMESLOTS.map(ts => <option key={ts} value={ts}>{ts}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-muted)]">Subject & Faculty</label>
              <select
                className="input-field"
                value={formData.subjectCode}
                onChange={(e) => setFormData(prev => ({ ...prev, subjectCode: e.target.value }))}
              >
                <option value="">Select Subject</option>
                {SUBJECTS.map(s => (
                  <option key={s.code} value={s.code}>{s.code} - {s.name} ({s.teacher})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-muted)]">Lecture Room / Lab</label>
              <input
                type="text"
                className="input-field"
                value={formData.room}
                onChange={(e) => setFormData(prev => ({ ...prev, room: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Schedule Lecture</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Timetable;
