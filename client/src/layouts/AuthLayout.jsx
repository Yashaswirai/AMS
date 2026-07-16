import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext.jsx';
import { RiCameraLensFill } from 'react-icons/ri';

function AuthLayout() {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user) {
    const roleRoutes = { admin: '/admin/dashboard', teacher: '/teacher/dashboard', student: '/student/dashboard' };
    return <Navigate to={roleRoutes[user.role] || '/login'} replace />;
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Left panel - branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)' }}>
        {/* Animated circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute w-96 h-96 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', top: '-10%', left: '-10%' }}
            animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute w-64 h-64 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)', bottom: '10%', right: '5%' }}
            animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: 'linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }} />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
            <RiCameraLensFill className="text-white text-2xl" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">AMS</h1>
            <p className="text-xs text-indigo-300">AI Attendance System</p>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="animate-float w-32 h-32 rounded-3xl gradient-primary flex items-center justify-center shadow-2xl mb-8 mx-auto"
              style={{ boxShadow: '0 25px 50px rgba(99,102,241,0.4)' }}>
              <RiCameraLensFill className="text-white text-6xl" />
            </div>
            <h2 className="text-4xl font-black text-white mb-4 leading-tight">
              Smart Attendance<br />
              <span className="gradient-text">Powered by AI</span>
            </h2>
            <p className="text-indigo-300 text-lg leading-relaxed">
              Real-time face recognition • Automated tracking • Intelligent insights
            </p>
          </motion.div>
        </div>

        {/* Features list */}
        <div className="relative z-10 space-y-3">
          {[
            '🎯 99.2% Face Recognition Accuracy',
            '⚡ Real-time Attendance Marking',
            '📊 AI-Powered Analytics & Insights',
            '🔐 Enterprise-Grade Security',
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="flex items-center gap-3 text-sm text-indigo-200"
            >
              <span>{item}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          key="auth-content"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center">
              <RiCameraLensFill className="text-white text-xl" />
            </div>
            <h1 className="text-xl font-black gradient-text">AMS</h1>
          </div>
          <Outlet />
        </motion.div>
      </div>
    </div>
  );
}

export default AuthLayout;
