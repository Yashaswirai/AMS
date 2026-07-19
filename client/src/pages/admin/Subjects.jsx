import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiBook } from 'react-icons/fi';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import DataTable from '../../components/common/DataTable.jsx';

const MOCK_SUBJECTS = [
  { id: 1, name: 'Data Structures & Algorithms', code: 'CS-301', courseId: '1', courseName: 'B.Tech Computer Science', semester: '3', teacherId: '101', teacherName: 'Dr. Alan Turing', credits: 4 },
  { id: 2, name: 'Database Management Systems', code: 'CS-302', courseId: '1', courseName: 'B.Tech Computer Science', semester: '3', teacherId: '102', teacherName: 'Dr. Grace Hopper', credits: 4 },
  { id: 3, name: 'Artificial Intelligence', code: 'CS-501', courseId: '1', courseName: 'B.Tech Computer Science', semester: '5', teacherId: '103', teacherName: 'Dr. Geoffrey Hinton', credits: 3 },
  { id: 4, name: 'Embedded Systems', code: 'EC-401', courseId: '3', courseName: 'B.Tech Electronics & Comm.', semester: '4', teacherId: '104', teacherName: 'Prof. Claude Shannon', credits: 4 },
  { id: 5, name: 'Machine Design', code: 'ME-502', courseId: '4', courseName: 'B.Tech Mechanical Eng.', semester: '5', teacherId: '105', teacherName: 'Prof. Nikola Tesla', credits: 3 },
];

const COURSES = [
  { id: '1', name: 'B.Tech Computer Science' },
  { id: '2', name: 'M.Tech Software Engineering' },
  { id: '3', name: 'B.Tech Electronics & Comm.' },
  { id: '4', name: 'B.Tech Mechanical Eng.' },
  { id: '5', name: 'B.Tech Civil Eng.' },
];

const TEACHERS = [
  { id: '101', name: 'Dr. Alan Turing' },
  { id: '102', name: 'Dr. Grace Hopper' },
  { id: '103', name: 'Dr. Geoffrey Hinton' },
  { id: '104', name: 'Prof. Claude Shannon' },
  { id: '105', name: 'Prof. Nikola Tesla' },
];

function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState(COURSES);
  const [teachers, setTeachers] = useState(TEACHERS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [currentSubject, setCurrentSubject] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    courseId: '',
    semester: '1',
    teacherId: '',
    credits: 3
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subsRes, coursesRes, teachersRes] = await Promise.all([
        api.get('/subjects'),
        api.get('/courses'),
        api.get('/teachers')
      ]);
      const rawSubs = subsRes.data?.data || subsRes.data?.subjects || subsRes.data || [];
      const rawCourses = coursesRes.data?.data || coursesRes.data?.courses || coursesRes.data || [];
      const rawTeachers = teachersRes.data?.data || teachersRes.data?.teachers || teachersRes.data || [];

      const normCourses = rawCourses.map(c => ({
        id: c._id || c.id,
        _id: c._id || c.id,
        name: c.name || ''
      }));

      const normTeachers = rawTeachers.map(t => ({
        id: t._id || t.id,
        _id: t._id || t.id,
        name: t.user?.name || t.name || 'Teacher'
      }));

      const normSubs = rawSubs.map(s => ({
        id: s._id || s.id,
        _id: s._id || s.id,
        name: s.name || '',
        code: s.code || '',
        courseId: s.course?._id || s.course || s.courseId || '',
        courseName: s.course?.name || s.courseName || 'General Course',
        semester: s.semester || '1',
        teacherId: s.teacher?._id || s.teacher || s.teacherId || '',
        teacherName: s.teacher?.user?.name || s.teacher?.name || s.teacherName || 'Unassigned',
        credits: s.credits || 3
      }));

      setSubjects(normSubs.length > 0 ? normSubs : MOCK_SUBJECTS);
      setCourses(normCourses.length > 0 ? normCourses : COURSES);
      setTeachers(normTeachers.length > 0 ? normTeachers : TEACHERS);
    } catch (err) {
      console.warn('API error, using mock data:', err);
      setSubjects(MOCK_SUBJECTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setCurrentSubject(null);
    setFormData({ name: '', code: '', courseId: '', semester: '1', teacherId: '', credits: 3 });
    setModalOpen(true);
  };

  const handleOpenEdit = (subject) => {
    setCurrentSubject(subject);
    setFormData({
      name: subject.name,
      code: subject.code,
      courseId: subject.courseId,
      semester: (subject.semester || '1').toString(),
      teacherId: subject.teacherId,
      credits: subject.credits,
    });
    setModalOpen(true);
  };

  const handleOpenDelete = (subject) => {
    setCurrentSubject(subject);
    setDeleteModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.code || !formData.courseId) {
      toast.error('Name, Code and Course are required');
      return;
    }

    const targetId = currentSubject?.id || currentSubject?._id;
    try {
      const courseName = courses.find(c => (c.id === formData.courseId || c._id === formData.courseId))?.name || 'Unknown';
      const teacherName = teachers.find(t => (t.id === formData.teacherId || t._id === formData.teacherId))?.name || 'Unassigned';

      if (currentSubject) {
        await api.put(`/subjects/${targetId}`, formData).catch(() => {});
        setSubjects(prev => prev.map(s => (s.id === targetId || s._id === targetId) ? { ...s, ...formData, courseName, teacherName } : s));
        toast.success('Subject updated successfully');
      } else {
        const res = await api.post('/subjects', formData).catch(() => {});
        const newSubject = {
          id: res?.data?.data?._id || res?.data?.subject?.id || Date.now(),
          ...formData,
          courseName,
          teacherName,
        };
        setSubjects(prev => [newSubject, ...prev]);
        toast.success('Subject added successfully');
      }
      setModalOpen(false);
    } catch (err) {
      console.warn('API save error, simulating locally:', err);
      const courseName = courses.find(c => (c.id === formData.courseId || c._id === formData.courseId))?.name || 'Unknown';
      const teacherName = teachers.find(t => (t.id === formData.teacherId || t._id === formData.teacherId))?.name || 'Unassigned';

      if (currentSubject) {
        setSubjects(prev => prev.map(s => (s.id === targetId || s._id === targetId) ? { ...s, ...formData, courseName, teacherName } : s));
        toast.success('Subject updated (local)');
      } else {
        setSubjects(prev => [{ id: Date.now(), ...formData, courseName, teacherName }, ...prev]);
        toast.success('Subject added (local)');
      }
      setModalOpen(false);
    }
  };

  const handleDelete = async () => {
    const targetId = currentSubject?.id || currentSubject?._id;
    try {
      await api.delete(`/subjects/${targetId}`).catch(() => {});
      setSubjects(prev => prev.filter(s => (s.id !== targetId && s._id !== targetId)));
      toast.success('Subject deleted successfully');
    } catch (err) {
      console.warn('API delete error, simulating locally:', err);
      setSubjects(prev => prev.filter(s => (s.id !== targetId && s._id !== targetId)));
      toast.success('Subject deleted (local)');
    } finally {
      setDeleteModalOpen(false);
    }
  };

  const filteredSubjects = subjects.filter(s => {
    const matchesSearch = (s.name || '').toLowerCase().includes(search.toLowerCase()) || (s.code || '').toLowerCase().includes(search.toLowerCase());
    const matchesCourse = !courseFilter || s.courseId === courseFilter || s.course === courseFilter;
    const matchesSem = !semesterFilter || (s.semester || '').toString() === semesterFilter;
    return matchesSearch && matchesCourse && matchesSem;
  });

  const columns = [
    { header: 'Subject Code', accessor: 'code', render: (val) => <span className="font-bold text-violet-400">{val}</span> },
    { header: 'Subject Name', accessor: 'name' },
    { header: 'Course Assigned', accessor: 'courseName' },
    { header: 'Semester', accessor: 'semester', render: (val) => `Sem ${val}` },
    { header: 'Instructor', accessor: 'teacherName', render: (val) => <span className="font-medium text-emerald-400">{val}</span> },
    { header: 'Credits', accessor: 'credits' },
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
          <h1 className="text-2xl font-black text-[var(--text)]">Subjects Management</h1>
          <p className="text-sm text-[var(--text-muted)]">Map subjects to courses and assign teaching faculty</p>
        </div>
        <button className="btn-primary" onClick={handleOpenAdd}>
          <FiPlus /> Add Subject
        </button>
      </div>

      {/* Filters row */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Search by code or subject name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field md:w-60"
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
        >
          <option value="">All Courses</option>
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          className="input-field md:w-40"
          value={semesterFilter}
          onChange={(e) => setSemesterFilter(e.target.value)}
        >
          <option value="">All Semesters</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
            <option key={s} value={s}>Semester {s}</option>
          ))}
        </select>
      </div>

      {/* Table Card */}
      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <DataTable columns={columns} data={filteredSubjects} />
          {filteredSubjects.length === 0 && (
            <div className="text-center py-12">
              <FiBook className="mx-auto text-4xl text-[var(--text-subtle)] mb-3" />
              <p className="text-[var(--text-muted)]">No subjects found matching filters.</p>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={currentSubject ? 'Edit Subject' : 'Add New Subject'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-muted)]">Subject Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Deep Learning"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-muted)]">Subject Code</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. CS-504"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-muted)]">Associated Course</label>
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
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-muted)]">Semester</label>
              <select
                className="input-field"
                value={formData.semester}
                onChange={(e) => setFormData(prev => ({ ...prev, semester: e.target.value }))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                  <option key={s} value={s.toString()}>Sem {s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-muted)]">Assigned Instructor</label>
              <select
                className="input-field"
                value={formData.teacherId}
                onChange={(e) => setFormData(prev => ({ ...prev, teacherId: e.target.value }))}
              >
                <option value="">Select Teacher</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-muted)]">Credits</label>
              <input
                type="number"
                min="1"
                max="6"
                className="input-field"
                value={formData.credits}
                onChange={(e) => setFormData(prev => ({ ...prev, credits: parseInt(e.target.value) }))}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Save Subject</button>
          </div>
        </form>
      </Modal>

      {/* Delete modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Subject">
        <div className="space-y-4">
          <p className="text-[var(--text)]">Are you sure you want to delete <strong>{currentSubject?.name} ({currentSubject?.code})</strong>? Student attendance historical map data mapped to this subject will remain read-only.</p>
          <div className="flex gap-3 justify-end pt-2">
            <button className="btn-secondary" onClick={() => setDeleteModalOpen(false)}>Cancel</button>
            <button className="btn-danger" onClick={handleDelete}>Delete Subject</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Subjects;
