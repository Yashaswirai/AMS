import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBell, FiCheckCircle, FiInfo } from 'react-icons/fi';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';

function StudentNotifications() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      const raw = res.data?.data || res.data?.notifications || res.data || [];
      const formatted = Array.isArray(raw) ? raw.map(n => ({
        id: n._id || n.id,
        sender: n.sender?.name || n.sender || 'Faculty',
        subject: n.title || 'Announcement',
        message: n.message || '',
        date: n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Recently',
        read: !!n.isRead
      })) : [];
      setNotifs(formatted);
    } catch (err) {
      console.warn('API student notifications error:', err);
      setNotifs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/student/notifications/${id}/read`);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      toast.success('Marked notification as read');
    } catch (err) {
      console.warn('API read error, simulating locally:', err);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      toast.success('Marked notification as read (local)');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[var(--text)]">Announcements Board</h1>
        <p className="text-sm text-[var(--text-muted)]">Read broadcast messages sent by teachers and department administrators</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : (
        <div className="max-w-3xl space-y-4">
          <AnimatePresence mode="popLayout">
            {notifs.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`glass-card rounded-3xl p-5 border border-[var(--border)] relative ${
                  item.read ? 'bg-[var(--surface)] opacity-85' : 'bg-[rgba(99,102,241,0.05)] border-indigo-500/25'
                }`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="badge badge-info">{item.subject}</span>
                      <span className="text-xs font-bold text-[var(--text-subtle)]">From {item.sender}</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">{item.message}</p>
                    <span className="block text-[10px] text-[var(--text-subtle)] font-semibold">{item.date}</span>
                  </div>

                  {!item.read && (
                    <button
                      onClick={() => handleMarkRead(item.id)}
                      className="btn-secondary text-[10px] py-1 px-2.5 rounded-lg flex items-center gap-1 shrink-0"
                    >
                      <FiCheckCircle size={10} /> Mark Read
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {notifs.length === 0 && (
            <div className="text-center py-12 text-[var(--text-subtle)]">
              No notifications or alerts found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default StudentNotifications;
