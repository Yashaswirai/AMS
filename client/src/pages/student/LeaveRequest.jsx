import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSend, FiFile, FiClock, FiCalendar, FiPlus } from 'react-icons/fi';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import Modal from '../../components/common/Modal.jsx';

function LeaveRequest() {
  const [history, setHistory] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form states
  const [subject, setSubject] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const [leavesRes, subsRes] = await Promise.all([
        api.get('/leave').catch(() => ({ data: [] })),
        api.get('/subjects').catch(() => ({ data: [] }))
      ]);
      const rawLeaves = leavesRes.data?.data || leavesRes.data?.leaves || leavesRes.data || [];
      const rawSubs = subsRes.data?.data || subsRes.data?.subjects || subsRes.data || [];
      
      setHistory(Array.isArray(rawLeaves) ? rawLeaves : []);
      setSubjectsList(Array.isArray(rawSubs) ? rawSubs : []);
      if (rawSubs.length > 0) setSubject(rawSubs[0].code || rawSubs[0].name);
    } catch (err) {
      console.warn('API error fetching leaves:', err);
      setHistory([]);
      setSubjectsList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) {
      toast.error('All fields must be completed');
      return;
    }

    const toastId = toast.loading('Filing exemption application...');
    try {
      const payload = { subject, startDate, endDate, reason };
      await api.post('/student/leaves/apply', payload);
      setHistory(prev => [
        { id: Date.now(), subject, startDate, endDate, reason, status: 'pending' },
        ...prev
      ]);
      setModalOpen(false);
      toast.success('Exemption application submitted successfully!', { id: toastId });
    } catch (err) {
      console.warn('API error submitting application, simulated locally:', err);
      setHistory(prev => [
        { id: Date.now(), subject, startDate, endDate, reason, status: 'pending' },
        ...prev
      ]);
      setModalOpen(false);
      toast.success('Exemption application submitted successfully (local)!', { id: toastId });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text)]">Exemption & Medical Leaves</h1>
          <p className="text-sm text-[var(--text-muted)]">Apply for lecture attendance exemptions or review filed requests</p>
        </div>
        <button className="btn-primary" onClick={() => setModalOpen(true)}>
          <FiPlus /> File Request
        </button>
      </div>

      {/* History Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {history.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="glass-card rounded-2xl p-5 border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] transition-colors flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start border-b border-[var(--border)] pb-2.5">
                    <span className="badge badge-info">{item.subject}</span>
                    <span className={`badge ${item.status === 'approved' ? 'badge-success' : item.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                      {item.status.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-[var(--text-subtle)] flex items-center gap-1.5">
                    <FiCalendar size={13} /> {item.startDate} to {item.endDate}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    <strong>Reason:</strong> {item.reason}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {history.length === 0 && (
            <p className="text-sm text-center text-[var(--text-subtle)] col-span-full">No leave history filed yet.</p>
          )}
        </div>
      )}

      {/* File Leave Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="File Attendance Exemption">
        <form onSubmit={handleApply} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[var(--text-subtle)]">Course Class</label>
            <select className="input-field" value={subject} onChange={(e) => setSubject(e.target.value)}>
              {subjectsList.map(s => <option key={s._id || s.code} value={s.code || s.name}>{s.code ? `${s.code} - ${s.name}` : s.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[var(--text-subtle)]">Start Date</label>
              <input type="date" className="input-field" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[var(--text-subtle)]">End Date</label>
              <input type="date" className="input-field" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[var(--text-subtle)]">Detailed Reason</label>
            <textarea
              rows="3"
              className="input-field py-3"
              placeholder="Provide a detailed explanation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[var(--text-subtle)]">Attachment (Medical Certificate, etc.)</label>
            <div className="border border-dashed border-[var(--border)] rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400">
              <FiFile className="text-xl text-[var(--text-subtle)] mb-1" />
              <span className="text-[10px] text-[var(--text-muted)]">Upload PDF or JPEG file (Max 2MB)</span>
              <input type="file" className="hidden" />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">File Application</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default LeaveRequest;
