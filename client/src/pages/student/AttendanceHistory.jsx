import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiCalendar, FiFilter } from 'react-icons/fi';
import api from '../../services/api.js';
import DataTable from '../../components/common/DataTable.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';

function StudentAttendanceHistory() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/history?studentId=me');
      const raw = res.data?.data?.records || (Array.isArray(res.data?.data) ? res.data.data : res.data?.records || res.data?.logs || []);
      const formatted = Array.isArray(raw) ? raw.map(item => ({
        id: item._id || item.id,
        date: item.date ? new Date(item.date).toLocaleDateString() : 'N/A',
        subject: item.subject?.name ? `${item.subject.code || ''} ${item.subject.name}` : 'Subject',
        time: item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
        status: item.status || 'absent',
        method: item.method ? item.method.toUpperCase() : 'Manual'
      })) : [];
      setLogs(formatted);
    } catch (err) {
      console.warn('API error fetching student attendance history:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(l => {
    const matchesSearch = l.subject.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    { header: 'Date', accessor: 'date' },
    { header: 'Class Subject', accessor: 'subject', render: (val) => <span className="font-bold text-indigo-400">{val}</span> },
    { header: 'Check-in Time', accessor: 'time' },
    {
      header: 'Roster Status',
      accessor: 'status',
      render: (val) => (
        <span className={`badge ${val === 'present' ? 'badge-success' : val === 'absent' ? 'badge-danger' : 'badge-warning'}`}>
          {val.toUpperCase()}
        </span>
      )
    },
    { header: 'Verification Method', accessor: 'method' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[var(--text)]">Check-in Logs</h1>
        <p className="text-sm text-[var(--text-muted)]">Track your daily class attendance logs and biometric verification records</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Search by class name or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field sm:w-56" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="present">Present</option>
          <option value="absent">Absent</option>
          <option value="late">Late</option>
        </select>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <DataTable columns={columns} data={filteredLogs} />
        </div>
      )}
    </div>
  );
}

export default StudentAttendanceHistory;
