import React from 'react';
import { motion } from 'framer-motion';
import { RiCameraLensFill } from 'react-icons/ri';

function LoadingSpinner({ fullScreen = false, size = 'md', text = 'Loading...' }) {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        {/* Outer ring */}
        <motion.div
          className={`${sizes[size]} rounded-full border-2 border-transparent`}
          style={{
            borderTopColor: '#6366f1',
            borderRightColor: '#8b5cf6',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
        {/* Inner icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <RiCameraLensFill className="text-indigo-400" style={{ fontSize: size === 'lg' ? '1.5rem' : '1rem' }} />
        </div>
      </div>
      {text && (
        <motion.p
          className="text-sm font-medium"
          style={{ color: 'var(--text-muted)' }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center z-50"
        style={{ background: 'var(--bg)' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-6"
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
              <RiCameraLensFill className="text-white text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">AMS</h1>
              <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>Attendance Management</p>
            </div>
          </div>
          {spinner}
        </motion.div>
      </div>
    );
  }

  return spinner;
}

export default LoadingSpinner;
