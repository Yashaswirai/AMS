import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiArrowLeft, FiSend, FiCheck } from 'react-icons/fi';
import api from '../../services/api.js';
import toast from 'react-hot-toast';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { toast.error('Please enter your email'); return; }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Link to="/login" className="inline-flex items-center gap-2 text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
        <FiArrowLeft size={14} /> Back to Login
      </Link>

      {!sent ? (
        <>
          <div className="mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
              <FiMail size={24} className="text-indigo-400" />
            </div>
            <h2 className="text-3xl font-black mb-2" style={{ color: 'var(--text)' }}>Forgot Password?</h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No worries! Enter your email and we'll send you reset instructions.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Email Address</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-subtle)' }} />
                <input type="email" className="input-field pl-10" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Sending…
                </span>
              ) : <><FiSend /> Send Reset Link</>}
            </button>
          </form>
        </>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 15, delay: 0.1 }} className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4">
            <FiCheck size={36} className="text-white" />
          </motion.div>
          <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Check your email</h3>
          <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>We sent a reset link to</p>
          <p className="text-sm font-semibold mb-6" style={{ color: '#6366f1' }}>{email}</p>
          <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>Didn't receive it? Check spam or <button onClick={() => setSent(false)} className="text-indigo-400 font-semibold">try again</button></p>
        </motion.div>
      )}
    </motion.div>
  );
}

export default ForgotPassword;
