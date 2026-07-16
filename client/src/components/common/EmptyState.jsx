import React from 'react';
import { motion } from 'framer-motion';
import { FiInbox } from 'react-icons/fi';

function EmptyState({ icon: Icon = FiInbox, title = 'No data found', description = 'There is nothing to show here yet.', action }) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
      >
        <Icon size={36} style={{ color: '#6366f1', opacity: 0.7 }} />
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>{title}</h3>
      <p className="text-sm max-w-xs mb-6" style={{ color: 'var(--text-muted)' }}>{description}</p>
      {action}
    </motion.div>
  );
}

export default EmptyState;
