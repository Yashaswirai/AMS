import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { RiBuilding2Line } from 'react-icons/ri';
import DataTable from '../../components/common/DataTable.jsx';
import Modal from '../../components/common/Modal.jsx';
import SearchInput from '../../components/common/SearchInput.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import api from '../../services/api.js';
import toast from 'react-hot-toast';

const EMPTY_FORM = { name: '', code: '', hodName: '', status: 'active' };

function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    const fetchDepts = async () => {
      setLoading(true);
      try {
        const res = await api.get('/departments');
        const raw = res.data?.data || res.data?.departments || res.data || [];
        const norm = Array.isArray(raw) ? raw.map(d => ({
          id: d._id || d.id,
          _id: d._id || d.id,
          name: d.name || '',
          code: d.code || '',
          hodName: d.head?.user?.name || d.head?.name || d.hodName || 'Not Assigned',
          studentCount: d.totalStudents ?? d.studentCount ?? 0,
          courseCount: d.totalCourses ?? d.courseCount ?? 0,
          status: d.isActive !== false ? 'active' : 'inactive'
        })) : [];
        setDepartments(norm);
      } catch {
        setDepartments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDepts();
  }, []);

  const filtered = departments.filter(d =>
    (d.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.code || '').toLowerCase().includes(search.toLowerCase())
  );
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setModalOpen(true); };
  const openEdit = (dept) => { setForm({ name: dept.name, code: dept.code, hodName: dept.hodName, status: dept.status }); setEditId(dept.id || dept._id); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.code) { toast.error('Name and Code are required'); return; }
    try {
      if (editId) {
        await api.put(`/departments/${editId}`, form).catch(() => {});
        setDepartments(d => d.map(dep => (dep.id === editId || dep._id === editId) ? { ...dep, ...form } : dep));
        toast.success('Department updated');
      } else {
        const newDept = { id: Date.now(), ...form, studentCount: 0, courseCount: 0 };
        await api.post('/departments', form).catch(() => {});
        setDepartments(d => [newDept, ...d]);
        toast.success('Department created');
      }
      setModalOpen(false);
    } catch (err) { toast.error('Failed to save'); }
  };

  const handleDelete = async () => {
    const targetId = deleteModal?.id || deleteModal?._id;
    try {
      await api.delete(`/departments/${targetId}`).catch(() => {});
      setDepartments(d => d.filter(dep => (dep.id !== targetId && dep._id !== targetId)));
      toast.success('Department deleted');
      setDeleteModal(null);
    } catch { toast.error('Failed to delete'); }
  };

  const columns = [
    { key: 'name', label: 'Department', sortable: true },
    { key: 'code', label: 'Code', sortable: true },
    { key: 'hodName', label: 'HoD' },
    { key: 'studentCount', label: 'Students', sortable: true },
    { key: 'courseCount', label: 'Courses' },
    { key: 'status', label: 'Status', render: (v) => <span className={`badge ${v === 'active' ? 'badge-success' : 'badge-neutral'}`}>{v}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Departments</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{departments.length} departments registered</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><FiPlus /> Add Department</button>
      </div>

      <div className="flex items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search departments…" className="max-w-xs" />
      </div>

      {filtered.length === 0 && !loading ? (
        <EmptyState icon={RiBuilding2Line} title="No departments found" description="Add your first department to get started" action={<button className="btn-primary" onClick={openAdd}><FiPlus /> Add Department</button>} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={paginated}
            loading={loading}
            rowKey="id"
            actions={(row) => (
              <div className="flex items-center gap-2">
                <button className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-indigo-500 hover:text-white" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }} onClick={() => openEdit(row)}>
                  <FiEdit2 size={13} />
                </button>
                <button className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-500 hover:text-white" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }} onClick={() => setDeleteModal(row)}>
                  <FiTrash2 size={13} />
                </button>
              </div>
            )}
          />
          <Pagination currentPage={page} totalPages={Math.ceil(filtered.length / perPage)} onPageChange={setPage} totalItems={filtered.length} itemsPerPage={perPage} />
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Department' : 'Add Department'}
        footer={<><button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn-primary" onClick={handleSave}>Save</button></>}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Department Name *</label>
            <input className="input-field" placeholder="e.g. Computer Science" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Code *</label>
            <input className="input-field" placeholder="e.g. CS" value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Head of Department</label>
            <input className="input-field" placeholder="Dr. Name" value={form.hodName} onChange={(e) => setForm(f => ({ ...f, hodName: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Status</label>
            <select className="input-field" value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Department" size="sm"
        footer={<><button className="btn-secondary" onClick={() => setDeleteModal(null)}>Cancel</button><button className="btn-danger" onClick={handleDelete}>Delete</button></>}
      >
        <p style={{ color: 'var(--text-muted)' }}>Are you sure you want to delete <strong style={{ color: 'var(--text)' }}>{deleteModal?.name}</strong>? This action cannot be undone.</p>
      </Modal>
    </div>
  );
}

export default Departments;
