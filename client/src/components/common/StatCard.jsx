import React from 'react';
import { motion } from 'framer-motion';

function StatCard({ title, value, change, changeType = 'positive', icon: Icon, color = 'primary', loading = false, subtitle }) {
  const colorMap = {
    primary: { bg: 'rgba(99,102,241,0.15)', icon: '#6366f1', border: 'rgba(99,102,241,0.2)' },
    secondary: { bg: 'rgba(139,92,246,0.15)', icon: '#8b5cf6', border: 'rgba(139,92,246,0.2)' },
    accent: { bg: 'rgba(16,185,129,0.15)', icon: '#10b981', border: 'rgba(16,185,129,0.2)' },
    danger: { bg: 'rgba(239,68,68,0.15)', icon: '#ef4444', border: 'rgba(239,68,68,0.2)' },
    warning: { bg: 'rgba(245,158,11,0.15)', icon: '#f59e0b', border: 'rgba(245,158,11,0.2)' },
  };

  const c = colorMap[color] || colorMap.primary;

  if (loading) {
    return (
      <div className="card rounded-2xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="skeleton w-10 h-10 rounded-xl" />
          <div className="skeleton w-16 h-5 rounded-full" />
        </div>
        <div className="skeleton w-24 h-8 rounded-lg mb-2" />
        <div className="skeleton w-32 h-4 rounded" />
      </div>
    );
  }

  return (
    <motion.div
      className="card card-interactive rounded-2xl p-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: c.bg, border: `1px solid ${c.border}` }}
        >
          {Icon && <Icon style={{ color: c.icon, fontSize: '1.25rem' }} />}
        </div>
        {change !== undefined && (
          <span
            className={`badge text-xs ${changeType === 'positive' ? 'badge-success' : changeType === 'negative' ? 'badge-danger' : 'badge-neutral'}`}
          >
            {changeType === 'positive' ? '↑' : changeType === 'negative' ? '↓' : '→'} {Math.abs(change)}%
          </span>
        )}
      </div>

      <div className="mb-1">
        <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{value}</p>
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{title}</p>
      {subtitle && <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>{subtitle}</p>}
    </motion.div>
  );
}

export default StatCard;
