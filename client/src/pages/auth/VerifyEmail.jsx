import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiCheckCircle, FiXCircle, FiArrowLeft, FiMail, FiRefreshCw } from 'react-icons/fi';
import api from '../../services/api.js';
import toast from 'react-hot-toast';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [resending, setResending] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [showResendInput, setShowResendInput] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided in the link. Please check your email link or request a new verification.');
      return;
    }

    const verify = async () => {
      try {
        const res = await api.post('/auth/verify-email', { token });
        setStatus('success');
        setMessage(res.data?.message || 'Email verified successfully! You can now log in.');
      } catch (err) {
        setStatus('error');
        setMessage(err?.response?.data?.message || 'Invalid or expired verification token. Please request a new verification link.');
      }
    };

    verify();
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail) {
      toast.error('Please enter your email address');
      return;
    }
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email: resendEmail });
      toast.success('Verification link sent! Please check your inbox.');
      setShowResendInput(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to resend verification email');
    } finally {
      setResending(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Link to="/login" className="inline-flex items-center gap-2 text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
        <FiArrowLeft size={14} /> Back to Login
      </Link>

      {status === 'verifying' && (
        <div className="text-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-6"
          />
          <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--text)' }}>Verifying Your Email…</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Please wait while we confirm your verification token.</p>
        </div>
      )}

      {status === 'success' && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20"
          >
            <FiCheckCircle size={44} className="text-white" />
          </motion.div>
          <h2 className="text-3xl font-black mb-3" style={{ color: 'var(--text)' }}>Email Verified!</h2>
          <p className="text-base mb-8 max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>{message}</p>
          <Link to="/login" className="btn-primary inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base">
            Proceed to Login
          </Link>
        </motion.div>
      )}

      {status === 'error' && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            className="w-20 h-20 rounded-full bg-rose-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-rose-500/20"
          >
            <FiXCircle size={44} className="text-white" />
          </motion.div>
          <h2 className="text-2xl font-black mb-3 text-rose-500">Verification Failed</h2>
          <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>{message}</p>

          {!showResendInput ? (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setShowResendInput(true)}
                className="btn-primary inline-flex items-center justify-center gap-2 py-3 px-6 text-sm"
              >
                <FiRefreshCw size={16} /> Resend Verification Link
              </button>
              <Link to="/login" className="btn-secondary inline-flex items-center justify-center gap-2 py-3 px-6 text-sm">
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleResend} className="max-w-sm mx-auto space-y-4 text-left">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Your Registered Email</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-subtle)' }} />
                  <input
                    type="email"
                    className="input-field pl-10"
                    placeholder="you@university.edu"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowResendInput(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={resending}>
                  {resending ? 'Sending…' : 'Send Link'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

export default VerifyEmail;
