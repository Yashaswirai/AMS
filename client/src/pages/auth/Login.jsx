import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiAlertCircle } from 'react-icons/fi';
import { RiCameraLensFill, RiShieldLine, RiTeamLine, RiGroupLine } from 'react-icons/ri';
import toast from 'react-hot-toast';

const ROLES = [
  { id: 'student', label: 'Student', icon: RiGroupLine, color: '#10b981' },
  { id: 'teacher', label: 'Teacher', icon: RiTeamLine, color: '#8b5cf6' },
  { id: 'admin', label: 'Admin', icon: RiShieldLine, color: '#6366f1' },
];

function Login() {
  const { login } = useAuth();
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateEmail = (val) => {
    if (!val.trim()) return 'Email address is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Please enter a valid email address';
    return '';
  };

  const validatePassword = (val) => {
    if (!val) return 'Password is required';
    return '';
  };

  const handleEmailChange = (val) => {
    setEmail(val);
    setErrors(prev => ({ ...prev, email: validateEmail(val) }));
  };

  const handlePasswordChange = (val) => {
    setPassword(val);
    setErrors(prev => ({ ...prev, password: validatePassword(val) }));
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    if (field === 'email') setErrors(prev => ({ ...prev, email: validateEmail(email) }));
    if (field === 'password') setErrors(prev => ({ ...prev, password: validatePassword(password) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailErr = validateEmail(email);
    const pwErr = validatePassword(password);
    setTouched({ email: true, password: true });
    setErrors({ email: emailErr, password: pwErr });

    if (emailErr || pwErr) {
      toast.error(emailErr || pwErr);
      return;
    }

    setLoading(true);
    try {
      await login({ email, password, role });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = ROLES.find(r => r.id === role);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-black mb-2" style={{ color: 'var(--text)' }}>Welcome back</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sign in to your account to continue</p>
      </div>

      {/* Role selector */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-subtle)' }}>Sign in as</p>
        <div className="flex gap-2">
          {ROLES.map((r) => (
            <motion.button
              key={r.id}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setRole(r.id)}
              className="flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all"
              style={{
                background: role === r.id ? `${r.color}15` : 'var(--surface)',
                borderColor: role === r.id ? r.color : 'var(--border)',
                boxShadow: role === r.id ? `0 4px 16px ${r.color}30` : 'none',
              }}
            >
              <r.icon size={20} style={{ color: role === r.id ? r.color : 'var(--text-muted)' }} />
              <span className="text-xs font-semibold" style={{ color: role === r.id ? r.color : 'var(--text-muted)' }}>
                {r.label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Email</label>
          <div className="relative">
            <FiMail className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-subtle)' }} />
            <input
              type="email"
              className="input-field pl-10"
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              onBlur={() => handleBlur('email')}
              autoComplete="email"
              style={{ borderColor: errors.email && touched.email ? '#ef4444' : undefined }}
            />
          </div>
          {errors.email && touched.email && (
            <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1 font-medium">
              <FiAlertCircle size={12} /> {errors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Password</label>
            <Link to="/forgot-password" className="text-xs font-medium" style={{ color: '#6366f1' }}>Forgot password?</Link>
          </div>
          <div className="relative">
            <FiLock className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-subtle)' }} />
            <input
              type={showPw ? 'text' : 'password'}
              className="input-field pl-10 pr-10"
              placeholder="••••••••"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              onBlur={() => handleBlur('password')}
              autoComplete="current-password"
              style={{ borderColor: errors.password && touched.password ? '#ef4444' : undefined }}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2"
              onClick={() => setShowPw(s => !s)}
              style={{ color: 'var(--text-subtle)' }}
            >
              {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
            </button>
          </div>
          {errors.password && touched.password && (
            <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1 font-medium">
              <FiAlertCircle size={12} /> {errors.password}
            </p>
          )}
        </div>

        {/* Remember me */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="remember"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="w-4 h-4 rounded"
            style={{ accentColor: '#6366f1' }}
          />
          <label htmlFor="remember" className="text-sm" style={{ color: 'var(--text-muted)' }}>Remember me for 30 days</label>
        </div>

        {/* Submit */}
        <motion.button
          type="submit"
          className="btn-primary w-full text-base py-3"
          disabled={loading}
          whileHover={{ scale: loading ? 1 : 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
              />
              Signing in…
            </span>
          ) : (
            <>
              Sign In as {selectedRole?.label}
              <FiArrowRight />
            </>
          )}
        </motion.button>
      </form>

      {/* Register link */}
      <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
        Don't have an account?{' '}
        <Link to="/register" className="font-semibold" style={{ color: '#6366f1' }}>Create one</Link>
      </p>

      {/* Demo credentials */}
      <div className="mt-6 p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.06)', border: '1px dashed rgba(99,102,241,0.3)' }}>
        <p className="text-xs font-semibold mb-1" style={{ color: '#6366f1' }}>Seeded Demo Credentials</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Admin: admin@frams.edu / Admin@123</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Teacher: teacher1@frams.edu / Teacher@123</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Student: student1@frams.edu / Student@123</p>
      </div>
    </motion.div>
  );
}

export default Login;
