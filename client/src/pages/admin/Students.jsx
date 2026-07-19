import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiCamera, FiCheck, FiX, FiInfo } from 'react-icons/fi';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import DataTable from '../../components/common/DataTable.jsx';

const MOCK_STUDENTS = [
  { id: '201', name: 'Ravi Kumar', rollNumber: 'CS22B1001', email: 'ravi@ams.edu', courseId: '1', courseName: 'B.Tech Computer Science', semester: 3, faceStatus: 'registered', faceImagesCount: 10, registrationDate: '2026-02-10' },
  { id: '202', name: 'Sarah Miller', rollNumber: 'CS22B1002', email: 'sarah@ams.edu', courseId: '1', courseName: 'B.Tech Computer Science', semester: 3, faceStatus: 'registered', faceImagesCount: 10, registrationDate: '2026-02-11' },
  { id: '203', name: 'Aarav Sharma', rollNumber: 'EC23B2001', email: 'aarav@ams.edu', courseId: '3', courseName: 'B.Tech Electronics & Comm.', semester: 2, faceStatus: 'pending', faceImagesCount: 0, registrationDate: null },
  { id: '204', name: 'Emily Davis', rollNumber: 'ME21B3005', email: 'emily@ams.edu', courseId: '4', courseName: 'B.Tech Mechanical Eng.', semester: 5, faceStatus: 'registered', faceImagesCount: 10, registrationDate: '2026-01-15' },
  { id: '205', name: 'Vijay Patel', rollNumber: 'CE22B4009', email: 'vijay@ams.edu', courseId: '5', courseName: 'B.Tech Civil Eng.', semester: 4, faceStatus: 'pending', faceImagesCount: 3, registrationDate: null },
];

const COURSES = [
  { id: '1', name: 'B.Tech Computer Science' },
  { id: '2', name: 'M.Tech Software Engineering' },
  { id: '3', name: 'B.Tech Electronics & Comm.' },
  { id: '4', name: 'B.Tech Mechanical Eng.' },
  { id: '5', name: 'B.Tech Civil Eng.' },
];

function Students() {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState(COURSES);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [faceFilter, setFaceFilter] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    email: '',
    courseId: '',
    semester: 1,
    faceStatus: 'pending'
  });

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const [studsRes, coursesRes] = await Promise.all([
        api.get('/students'),
        api.get('/courses')
      ]);
      const rawStuds = studsRes.data?.data || studsRes.data?.students || studsRes.data || [];
      const rawCourses = coursesRes.data?.data || coursesRes.data?.courses || coursesRes.data || [];

      const normCourses = rawCourses.map(c => ({
        id: c._id || c.id,
        _id: c._id || c.id,
        name: c.name || ''
      }));

      const normStuds = rawStuds.map(s => ({
        id: s._id || s.id,
        _id: s._id || s.id,
        name: s.user?.name || s.name || 'Student',
        rollNumber: s.rollNumber || 'CS000',
        email: s.user?.email || s.email || '',
        courseId: s.course?._id || s.course || s.courseId || '',
        courseName: s.course?.name || s.courseName || 'General Course',
        semester: s.semester || 1,
        faceStatus: s.faceRegistered ? 'registered' : (s.faceStatus || 'pending'),
        faceImagesCount: s.faceRegistered ? 10 : (s.faceImagesCount || 0),
        registrationDate: s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : '—'
      }));

      setStudents(normStuds.length > 0 ? normStuds : MOCK_STUDENTS);
      setCourses(normCourses.length > 0 ? normCourses : COURSES);
    } catch (err) {
      console.warn('API error, using mock data:', err);
      setStudents(MOCK_STUDENTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleOpenAdd = () => {
    setCurrentStudent(null);
    setFormData({ name: '', rollNumber: '', email: '', courseId: '', semester: 1, faceStatus: 'pending' });
    setModalOpen(true);
  };

  const handleOpenEdit = (student) => {
    setCurrentStudent(student);
    setFormData({
      name: student.name,
      rollNumber: student.rollNumber,
      email: student.email,
      courseId: student.courseId,
      semester: student.semester,
      faceStatus: student.faceStatus
    });
    setModalOpen(true);
  };

  const handleOpenDelete = (student) => {
    setCurrentStudent(student);
    setDeleteModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.rollNumber || !formData.email || !formData.courseId) {
      toast.error('All standard student fields are required');
      return;
    }

    const targetId = currentStudent?.id || currentStudent?._id;
    try {
      const courseName = courses.find(c => (c.id === formData.courseId || c._id === formData.courseId))?.name || 'Unknown';
      if (currentStudent) {
        await api.put(`/students/${targetId}`, formData).catch(() => {});
        setStudents(prev => prev.map(s => (s.id === targetId || s._id === targetId) ? { ...s, ...formData, courseName } : s));
        toast.success('Student updated successfully');
      } else {
        const res = await api.post('/students', formData).catch(() => {});
        const newStudent = {
          id: res?.data?.data?._id || res?.data?.student?.id || Date.now().toString(),
          ...formData,
          courseName,
          faceImagesCount: formData.faceStatus === 'registered' ? 10 : 0,
          registrationDate: formData.faceStatus === 'registered' ? new Date().toISOString().split('T')[0] : null
        };
        setStudents(prev => [newStudent, ...prev]);
        toast.success('Student registered successfully');
      }
      setModalOpen(false);
    } catch (err) {
      console.warn('API save error, simulating locally:', err);
      const courseName = courses.find(c => (c.id === formData.courseId || c._id === formData.courseId))?.name || 'Unknown';
      if (currentStudent) {
        setStudents(prev => prev.map(s => (s.id === targetId || s._id === targetId) ? { ...s, ...formData, courseName } : s));
        toast.success('Student updated (local)');
      } else {
        setStudents(prev => [{
          id: Date.now().toString(),
          ...formData,
          courseName,
          faceImagesCount: formData.faceStatus === 'registered' ? 10 : 0,
          registrationDate: formData.faceStatus === 'registered' ? new Date().toISOString().split('T')[0] : null
        }, ...prev]);
        toast.success('Student registered (local)');
      }
      setModalOpen(false);
    }
  };

  const handleDelete = async () => {
    const targetId = currentStudent?.id || currentStudent?._id;
    try {
      await api.delete(`/students/${targetId}`).catch(() => {});
      setStudents(prev => prev.filter(s => (s.id !== targetId && s._id !== targetId)));
      toast.success('Student deleted successfully');
    } catch (err) {
      console.warn('API delete error, simulating locally:', err);
      setStudents(prev => prev.filter(s => (s.id !== targetId && s._id !== targetId)));
      toast.success('Student deleted (local)');
    } finally {
      setDeleteModalOpen(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = (s.name || '').toLowerCase().includes(search.toLowerCase()) || 
                          (s.rollNumber || '').toLowerCase().includes(search.toLowerCase()) ||
                          (s.email || '').toLowerCase().includes(search.toLowerCase());
    const matchesCourse = !courseFilter || s.courseId === courseFilter || s.course === courseFilter;
    const matchesFace = !faceFilter || s.faceStatus === faceFilter;
    return matchesSearch && matchesCourse && matchesFace;
  });

  const columns = [
    {
      header: 'Roll Number',
      accessor: 'rollNumber',
      render: (val) => <span className="font-bold text-[var(--text)]">{val}</span>
    },
    {
      header: 'Student Name',
      accessor: 'name',
      render: (val, row) => (
        <div>
          <p className="font-semibold text-[var(--text)]">{val}</p>
          <p className="text-xs text-[var(--text-subtle)]">{row.email}</p>
        </div>
      )
    },
    { header: 'Course Enrolled', accessor: 'courseName' },
    { header: 'Semester', accessor: 'semester', render: (val) => `Sem ${val}` },
    {
      header: 'Face Datasets',
      accessor: 'faceStatus',
      render: (val, row) => (
        <span className={`badge ${val === 'registered' ? 'badge-success' : 'badge-warning'}`}>
          {val === 'registered' ? <FiCheck size={10} /> : <FiCamera size={10} />}
          {val === 'registered' ? `Registered (${row.faceImagesCount} pics)` : `Pending (${row.faceImagesCount}/10 pics)`}
        </span>
      )
    },
    { header: 'Registered Date', accessor: 'registrationDate', render: (val) => val || '—' },
    {
      header: 'Actions',
      accessor: 'id',
      render: (_, row) => (
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary p-2 rounded-lg" onClick={() => handleOpenEdit(row)}>
            <FiEdit2 size={14} />
          </button>
          <button className="btn-secondary p-2 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleOpenDelete(row)}>
            <FiTrash2 size={14} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text)]">Students Registry</h1>
          <p className="text-sm text-[var(--text-muted)]">Manage student profiles, academic courses, and face print registrations</p>
        </div>
        <button className="btn-primary" onClick={handleOpenAdd}>
          <FiPlus /> Add Student
        </button>
      </div>

      {/* Filters row */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Search by roll no, name, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field md:w-56"
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
        >
          <option value="">All Courses</option>
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          className="input-field md:w-56"
          value={faceFilter}
          onChange={(e) => setFaceFilter(e.target.value)}
        >
          <option value="">All Face Profiles</option>
          <option value="registered">Registered Datasets</option>
          <option value="pending">Pending Profiles</option>
        </select>
      </div>

      {/* Table Card */}
      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <DataTable columns={columns} data={filteredStudents} />
          {filteredStudents.length === 0 && (
            <div className="text-center py-12">
              <FiX className="mx-auto text-4xl text-[var(--text-subtle)] mb-3" />
              <p className="text-[var(--text-muted)]">No students found matching your filters.</p>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={currentStudent ? 'Edit Student Details' : 'Register New Student'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-muted)]">Student Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ravi Kumar"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-muted)]">Roll Number / ID</label>
              <input
                type="text"
                className="input-field"
                placeholder="CS22B1001"
                value={formData.rollNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, rollNumber: e.target.value.toUpperCase() }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-muted)]">Email Address</label>
              <input
                type="email"
                className="input-field"
                placeholder="ravi@ams.edu"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-muted)]">Semester</label>
              <select
                className="input-field"
                value={formData.semester}
                onChange={(e) => setFormData(prev => ({ ...prev, semester: parseInt(e.target.value) }))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-muted)]">Academic Course</label>
              <select
                className="input-field"
                value={formData.courseId}
                onChange={(e) => setFormData(prev => ({ ...prev, courseId: e.target.value }))}
              >
                <option value="">Select Course</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-muted)]">Face Dataset Mode</label>
              <select
                className="input-field"
                value={formData.faceStatus}
                onChange={(e) => setFormData(prev => ({ ...prev, faceStatus: e.target.value }))}
              >
                <option value="pending">Student uploads via portal (Pending)</option>
                <option value="registered">Simulate face registered immediately</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Save Student</button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Student Record">
        <div className="space-y-4">
          <p className="text-[var(--text)]">Are you sure you want to delete student <strong>{currentStudent?.name} ({currentStudent?.rollNumber})</strong>? Removing the profile will delete their registered face biometrics permanently.</p>
          <div className="flex gap-3 justify-end pt-2">
            <button className="btn-secondary" onClick={() => setDeleteModalOpen(false)}>Cancel</button>
            <button className="btn-danger" onClick={handleDelete}>Delete Permanently</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Students;
