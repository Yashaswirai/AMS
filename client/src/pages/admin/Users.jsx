import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiUser, FiCheck, FiX, FiShield, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import DataTable from '../../components/common/DataTable.jsx';

const MOCK_USERS = [
  { id: '1', name: 'System Admin', email: 'admin@ams.edu', role: 'admin', status: 'active', lastLogin: '2026-07-16 10:15' },
  { id: '2', name: 'Dr. Alan Turing', email: 'turing@ams.edu', role: 'teacher', status: 'active', lastLogin: '2026-07-15 14:20' },
  { id: '3', name: 'Dr. Grace Hopper', email: 'hopper@ams.edu', role: 'teacher', status: 'active', lastLogin: '2026-07-16 09:05' },
  { id: '4', name: 'Ravi Kumar', email: 'ravi@ams.edu', role: 'student', status: 'active', lastLogin: '2026-07-14 11:30' },
  { id: '5', name: 'Sarah Miller', email: 'sarah@ams.edu', role: 'student', status: 'active', lastLogin: '2026-07-14 10:05' },
  { id: '6', name: 'Vijay Patel', email: 'vijay@ams.edu', role: 'student', status: 'suspended', lastLogin: '2026-07-02 16:40' },
];

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  
  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'student',
    status: 'active',
    password: ''
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data.users || res.data);
    } catch (err) {
      console.warn('API error, using mock users:', err);
      setUsers(MOCK_USERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenAdd = () => {
    setCurrentUser(null);
    setFormData({ name: '', email: '', role: 'student', status: 'active', password: '' });
    setModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setCurrentUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      password: '' // empty for edit
    });
    setModalOpen(true);
  };

  const handleOpenDelete = (user) => {
    setCurrentUser(user);
    setDeleteModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || (!currentUser && !formData.password)) {
      toast.error('Name, Email and Password are required');
      return;
    }

    try {
      if (currentUser) {
        await api.put(`/users/${currentUser.id}`, formData);
        setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, ...formData } : u));
        toast.success('User updated successfully');
      } else {
        const res = await api.post('/users', formData);
        const newUser = {
          id: res.data?.user?.id || Date.now().toString(),
          ...formData,
          lastLogin: 'Never'
        };
        setUsers(prev => [newUser, ...prev]);
        toast.success('User added successfully');
      }
      setModalOpen(false);
    } catch (err) {
      console.warn('API save error, simulating locally:', err);
      if (currentUser) {
        setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, ...formData } : u));
        toast.success('User updated (local)');
      } else {
        setUsers(prev => [{
          id: Date.now().toString(),
          ...formData,
          lastLogin: 'Never'
        }, ...prev]);
        toast.success('User added (local)');
      }
      setModalOpen(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/users/${currentUser.id}`);
      setUsers(prev => prev.filter(u => u.id !== currentUser.id));
      toast.success('User account removed');
    } catch (err) {
      console.warn('API delete error, simulating locally:', err);
      setUsers(prev => prev.filter(u => u.id !== currentUser.id));
      toast.success('User account removed (local)');
    } finally {
      setDeleteModalOpen(false);
    }
  };

  const toggleStatus = async (user) => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      await api.put(`/users/${user.id}/status`, { status: nextStatus });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: nextStatus } : u));
      toast.success(`Account status set to ${nextStatus}`);
    } catch (err) {
      console.warn('API status toggle error, simulating locally:', err);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: nextStatus } : u));
      toast.success(`Account status set to ${nextStatus} (local)`);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const columns = [
    {
      header: 'User Profile',
      accessor: 'name',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{val[0]}</span>
          </div>
          <div>
            <p className="font-semibold text-[var(--text)]">{val}</p>
            <p className="text-xs text-[var(--text-subtle)]">{row.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Role Security',
      accessor: 'role',
      render: (val) => (
        <span className={`badge ${val === 'admin' ? 'badge-danger' : val === 'teacher' ? 'badge-secondary' : 'badge-info'}`}>
          <FiShield size={10} />
          {val.toUpperCase()}
        </span>
      )
    },
    {
      header: 'Account Status',
      accessor: 'status',
      render: (val, row) => (
        <button
          onClick={() => toggleStatus(row)}
          className={`flex items-center gap-1.5 font-bold text-xs ${val === 'active' ? 'text-emerald-400' : 'text-red-400'}`}
        >
          {val === 'active' ? <FiToggleRight size={20} /> : <FiToggleLeft size={20} />}
          {val.toUpperCase()}
        </button>
      )
    },
    { header: 'Last Login Timestamp', accessor: 'lastLogin' },
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
          <h1 className="text-2xl font-black text-[var(--text)]">User Accounts Manager</h1>
          <p className="text-sm text-[var(--text-muted)]">Control system log credentials, suspend accounts, and adjust roles</p>
        </div>
        <button className="btn-primary" onClick={handleOpenAdd}>
          <FiPlus /> Add Credentials
        </button>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field sm:w-56"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Security Roles</option>
          <option value="admin">Administrator</option>
          <option value="teacher">Teacher</option>
          <option value="student">Student</option>
        </select>
      </div>

      {/* Table Card */}
      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <DataTable columns={columns} data={filteredUsers} />
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <FiX className="mx-auto text-4xl text-[var(--text-subtle)] mb-3" />
              <p className="text-[var(--text-muted)]">No active logs found matching the filter.</p>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={currentUser ? 'Edit User Roles' : 'Create User Credentials'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--text-muted)]">Full Name</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. John Doe"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-muted)]">Email Address</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@university.edu"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-muted)]">Account Status</label>
              <select
                className="input-field"
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="active">Active login enabled</option>
                <option value="suspended">Suspended / Blocked</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-muted)]">Security Role</label>
              <select
                className="input-field"
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              >
                <option value="student">Student Portal Access</option>
                <option value="teacher">Teacher Portal Access</option>
                <option value="admin">Administrator (Full Access)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-muted)]">
                {currentUser ? 'Reset Password (Optional)' : 'Log Password'}
              </label>
              <input
                type="password"
                className="input-field"
                placeholder={currentUser ? 'Leave blank to retain current' : 'Min. 6 characters'}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Save Account</button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirm Account Removal">
        <div className="space-y-4">
          <p className="text-[var(--text)]">Are you sure you want to permanently delete the account <strong>{currentUser?.name} ({currentUser?.email})</strong>? This action is irreversible and blocks all future login authorization tokens.</p>
          <div className="flex gap-3 justify-end pt-2">
            <button className="btn-secondary" onClick={() => setDeleteModalOpen(false)}>Cancel</button>
            <button className="btn-danger" onClick={handleDelete}>Delete Account</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Users;
