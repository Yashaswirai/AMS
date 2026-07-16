import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff, FiArrowRight, FiArrowLeft, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';

const STEPS = [
  { label: 'Role', title: 'Choose Your Role' },
  { label: 'Info', title: 'Personal Information' },
  { label: 'Account', title: 'Account Details' },
  { label: 'Done', title: 'All Set!' },
];

const ROLES = [
  { id: 'student', label: 'Student', emoji: '🎓', desc: 'Track your attendance & leave requests' },
  { id: 'teacher', label: 'Teacher', emoji: '👨‍🏫', desc: 'Manage attendance & student records' },
];

function Register() {
  const { register } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({
    role: '',
    name: '',
    phone: '',
    department: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const update = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const next = () => {
    if (step === 0 && !form.role) { toast.error('Please select a role'); return; }
    if (step === 1 && (!form.name || !form.department)) { toast.error('Please fill all fields'); return; }
    if (step === 2) {
      if (!form.email || !form.password) { toast.error('Please fill all fields'); return; }
      if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
      if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await register(form);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Registration failed');
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="mb-6">
        <h2 className="text-3xl font-black mb-1" style={{ color: 'var(--text)' }}>Create Account</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Join the AMS platform</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <React.Fragment key={i}>
            <div className={`step-dot ${i < step ? 'completed' : i === step ? 'active' : ''}`}>
              {i < step ? <FiCheck size={14} /> : i + 1}
            </div>
            {i < STEPS.length - 1 && <div className={`step-line ${i < step ? 'completed' : ''}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step title */}
      <h3 className="text-lg font-bold mb-6" style={{ color: 'var(--text)' }}>{STEPS[step]?.title}</h3>

      <AnimatePresence mode="wait">
        {/* Step 0: Role */}
        {step === 0 && (
          <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            {ROLES.map((r) => (
              <motion.button
                key={r.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => update('role', r.id)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left"
                style={{
                  background: form.role === r.id ? 'rgba(99,102,241,0.1)' : 'var(--surface)',
                  borderColor: form.role === r.id ? '#6366f1' : 'var(--border)',
                }}
              >
                <span className="text-3xl">{r.emoji}</span>
                <div>
                  <p className="font-semibold" style={{ color: 'var(--text)' }}>{r.label}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.desc}</p>
                </div>
                {form.role === r.id && (
                  <div className="ml-auto w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                    <FiCheck size={12} className="text-white" />
                  </div>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Step 1: Personal info */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Full Name</label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-subtle)' }} />
                <input type="text" className="input-field pl-10" placeholder="John Doe" value={form.name} onChange={(e) => update('name', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Phone Number</label>
              <input type="tel" className="input-field" placeholder="+91 9876543210" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Department</label>
              <select className="input-field" value={form.department} onChange={(e) => update('department', e.target.value)}>
                <option value="">Select Department</option>
                <option value="cs">Computer Science</option>
                <option value="ec">Electronics</option>
                <option value="me">Mechanical</option>
                <option value="ce">Civil</option>
                <option value="ch">Chemical</option>
              </select>
            </div>
          </motion.div>
        )}

        {/* Step 2: Account */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Email Address</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-subtle)' }} />
                <input type="email" className="input-field pl-10" placeholder="you@university.edu" value={form.email} onChange={(e) => update('email', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-subtle)' }} />
                <input type={showPw ? 'text' : 'password'} className="input-field pl-10 pr-10" placeholder="Min. 6 characters" value={form.password} onChange={(e) => update('password', e.target.value)} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowPw(s => !s)} style={{ color: 'var(--text-subtle)' }}>
                  {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Confirm Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-subtle)' }} />
                <input type="password" className="input-field pl-10" placeholder="Repeat password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} />
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15, delay: 0.2 }}
              className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4"
            >
              <FiCheck size={40} className="text-white" />
            </motion.div>
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>You're all set!</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              Your account has been created as <strong>{form.role}</strong>. Click below to complete setup.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        {step > 0 && step < 3 && (
          <button className="btn-secondary flex-1" onClick={() => setStep(s => s - 1)}>
            <FiArrowLeft /> Back
          </button>
        )}
        {step < 2 && (
          <button className="btn-primary flex-1" onClick={next}>
            Continue <FiArrowRight />
          </button>
        )}
        {step === 2 && (
          <motion.button
            className="btn-primary flex-1"
            onClick={next}
            whileTap={{ scale: 0.98 }}
          >
            Review <FiArrowRight />
          </motion.button>
        )}
        {step === 3 && (
          <motion.button
            className="btn-primary flex-1 py-3"
            onClick={handleSubmit}
            disabled={loading}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Creating Account…
              </span>
            ) : 'Complete Registration'}
          </motion.button>
        )}
      </div>

      <p className="text-center text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
        Already have an account? <Link to="/login" className="font-semibold" style={{ color: '#6366f1' }}>Sign in</Link>
      </p>
    </motion.div>
  );
}

export default Register;
