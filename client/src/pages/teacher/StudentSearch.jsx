import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiUser, FiCalendar, FiBook, FiCheckCircle, FiInfo } from 'react-icons/fi';
import useDebounce from '../../hooks/useDebounce.js';
import api from '../../services/api.js';
import Modal from '../../components/common/Modal.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';

const MOCK_STUDENT_PROFILES = [
  {
    id: '201',
    name: 'Ravi Kumar',
    rollNumber: 'CS22B1001',
    email: 'ravi@ams.edu',
    department: 'Computer Science',
    courseName: 'B.Tech Computer Science',
    semester: 3,
    faceStatus: 'registered',
    overallAttendance: 87.5,
    subjects: [
      { name: 'Data Structures & Algorithms', percentage: 92 },
      { name: 'Database Management Systems', percentage: 85 },
      { name: 'Artificial Intelligence', percentage: 83 }
    ]
  },
  {
    id: '202',
    name: 'Sarah Miller',
    rollNumber: 'CS22B1002',
    email: 'sarah@ams.edu',
    department: 'Computer Science',
    courseName: 'B.Tech Computer Science',
    semester: 3,
    faceStatus: 'registered',
    overallAttendance: 93.8,
    subjects: [
      { name: 'Data Structures & Algorithms', percentage: 95 },
      { name: 'Database Management Systems', percentage: 92 },
      { name: 'Artificial Intelligence', percentage: 94 }
    ]
  },
  {
    id: '203',
    name: 'Aarav Sharma',
    rollNumber: 'EC23B2001',
    email: 'aarav@ams.edu',
    department: 'Electronics',
    courseName: 'B.Tech Electronics & Comm.',
    semester: 2,
    faceStatus: 'pending',
    overallAttendance: 68.8,
    subjects: [
      { name: 'Embedded Systems', percentage: 70 },
      { name: 'Signals & Systems', percentage: 65 },
    ]
  },
];

function StudentSearch() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  // Profile modal
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchStudents = async (query = '') => {
    setLoading(true);
    try {
      const res = await api.get(`/students/search?q=${query}`);
      setStudents(res.data.students || res.data);
    } catch (err) {
      console.warn('API student search error, running mock search:', err);
      // Filter mock profiles
      const filtered = MOCK_STUDENT_PROFILES.filter(s =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.rollNumber.toLowerCase().includes(query.toLowerCase())
      );
      setStudents(filtered);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents(debouncedSearch);
  }, [debouncedSearch]);

  const handleOpenProfile = (student) => {
    setSelectedStudent(student);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[var(--text)]">Search Student Directory</h1>
        <p className="text-sm text-[var(--text-muted)]">Query individual attendance statistics and face print states</p>
      </div>

      {/* Search Input */}
      <div className="relative max-w-lg">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
        <input
          type="text"
          className="input-field pl-10"
          placeholder="Type roll number or student name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Student List Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {students.map((student, i) => (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => handleOpenProfile(student)}
              className="glass-card rounded-2xl p-5 cursor-pointer border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] transition-all hover:-translate-y-1"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold flex-shrink-0">
                    {student.name[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-[var(--text)] text-sm">{student.name}</h4>
                    <p className="text-xs text-[var(--text-subtle)] font-bold">{student.rollNumber}</p>
                  </div>
                </div>
                <span className={`badge ${student.overallAttendance >= 75 ? 'badge-success' : 'badge-danger'}`}>
                  {student.overallAttendance}%
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 border-t border-[var(--border)] pt-3 text-xs text-[var(--text-muted)]">
                <div>
                  <p className="font-semibold text-[var(--text-subtle)] uppercase text-[9px] tracking-wider">Course</p>
                  <p className="font-semibold mt-0.5 truncate pr-1">{student.courseName}</p>
                </div>
                <div>
                  <p className="font-semibold text-[var(--text-subtle)] uppercase text-[9px] tracking-wider">Biometrics</p>
                  <p className={`font-semibold mt-0.5 ${student.faceStatus === 'registered' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {student.faceStatus === 'registered' ? 'Registered' : 'Pending Upload'}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}

          {students.length === 0 && (
            <div className="col-span-full text-center py-12 text-[var(--text-subtle)]">
              No students found. Type a different search query.
            </div>
          )}
        </div>
      )}

      {/* Student detail profile modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Student Audit Card">
        {selectedStudent && (
          <div className="space-y-6">
            {/* Top Details */}
            <div className="flex items-center gap-4 border-b border-[var(--border)] pb-4">
              <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-white text-lg font-black">
                {selectedStudent.name[0]}
              </div>
              <div>
                <h3 className="text-lg font-black text-[var(--text)]">{selectedStudent.name}</h3>
                <p className="text-xs text-[var(--text-subtle)] font-bold">{selectedStudent.rollNumber} • {selectedStudent.email}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">{selectedStudent.courseName} • Sem {selectedStudent.semester}</p>
              </div>
            </div>

            {/* Circular Progress & Face Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-[var(--text)]">{selectedStudent.overallAttendance}%</span>
                <span className="text-xs text-[var(--text-muted)] mt-1">Term Average</span>
              </div>
              <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] flex flex-col items-center justify-center">
                <span className={`text-sm font-black ${selectedStudent.faceStatus === 'registered' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {selectedStudent.faceStatus === 'registered' ? 'Registered' : 'Pending Setup'}
                </span>
                <span className="text-xs text-[var(--text-muted)] mt-2">Biometric State</span>
              </div>
            </div>

            {/* Subject Wise breakdown */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-[var(--text)] flex items-center gap-2">
                <FiBook size={14} className="text-indigo-400" /> Subject Specific Performance
              </h4>
              <div className="space-y-2">
                {selectedStudent.subjects.map((sub, i) => (
                  <div key={i} className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] flex justify-between items-center">
                    <span className="text-xs font-semibold text-[var(--text)]">{sub.name}</span>
                    <span className={`text-xs font-bold ${sub.percentage >= 75 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {sub.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default StudentSearch;
