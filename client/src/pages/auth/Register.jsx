import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff, FiArrowRight, FiArrowLeft, FiCheck, FiAlertCircle } from 'react-icons/fi';
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

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = (field, value, currentForm = form) => {
    let err = '';
    if (field === 'role' && !value) {
      err = 'Please select a role';
    } else if (field === 'name') {
      if (!value.trim()) err = 'Full name is required';
      else if (value.trim().length < 2) err = 'Name must be at least 2 characters';
    } else if (field === 'phone') {
      if (value && !/^[+]?[\d\s\-().]{7,15}$/.test(value)) err = 'Invalid phone number format';
    } else if (field === 'department') {
      if (!value) err = 'Please select your department';
    } else if (field === 'email') {
      if (!value.trim()) err = 'Email address is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) err = 'Please enter a valid email address';
    } else if (field === 'password') {
      if (!value) err = 'Password is required';
      else if (value.length < 8) err = 'Password must be at least 8 characters';
    } else if (field === 'confirmPassword') {
      if (!value) err = 'Please confirm your password';
      else if (value !== currentForm.password) err = 'Passwords do not match';
    }
    return err;
  };

  const update = (field, val) => {
    const updatedForm = { ...form, [field]: val };
    setForm(updatedForm);

    // Perform real-time validation on typing
    const err = validateField(field, val, updatedForm);
    setErrors(prev => ({ ...prev, [field]: err }));

    // Re-validate confirm password if password changes
    if (field === 'password' && updatedForm.confirmPassword) {
      const confirmErr = validateField('confirmPassword', updatedForm.confirmPassword, updatedForm);
      setErrors(prev => ({ ...prev, confirmPassword: confirmErr }));
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const err = validateField(field, form[field]);
    setErrors(prev => ({ ...prev, [field]: err }));
  };

  const next = () => {
    if (step === 0) {
      const err = validateField('role', form.role);
      setTouched(prev => ({ ...prev, role: true }));
      setErrors(prev => ({ ...prev, role: err }));
      if (err) { toast.error(err); return; }
    } else if (step === 1) {
      const nameErr = validateField('name', form.name);
      const deptErr = validateField('department', form.department);
      const phoneErr = validateField('phone', form.phone);
      setTouched(prev => ({ ...prev, name: true, department: true, phone: true }));
      setErrors(prev => ({ ...prev, name: nameErr, department: deptErr, phone: phoneErr }));
      if (nameErr || deptErr || phoneErr) { toast.error(nameErr || deptErr || phoneErr); return; }
    } else if (step === 2) {
      const emailErr = validateField('email', form.email);
      const pwErr = validateField('password', form.password);
      const confirmErr = validateField('confirmPassword', form.confirmPassword);
      setTouched(prev => ({ ...prev, email: true, password: true, confirmPassword: true }));
      setErrors(prev => ({ ...prev, email: emailErr, password: pwErr, confirmPassword: confirmErr }));
      if (emailErr || pwErr || confirmErr) { toast.error(emailErr || pwErr || confirmErr); return; }
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await register(form);
    } catch (err) {
      const errMsg = err?.response?.data?.errors?.[0]?.message || err?.response?.data?.message || 'Registration failed';
      toast.error(errMsg);
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
                  borderColor: form.role === r.id ? '#6366f1' : errors.role && touched.role ? '#ef4444' : 'var(--border)',
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
            {errors.role && touched.role && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1 font-medium">
                <FiAlertCircle size={12} /> {errors.role}
              </p>
            )}
          </motion.div>
        )}

        {/* Step 1: Personal info */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Full Name *</label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-subtle)' }} />
                <input
                  type="text"
                  className="input-field pl-10"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  onBlur={() => handleBlur('name')}
                  style={{ borderColor: errors.name && touched.name ? '#ef4444' : undefined }}
                />
              </div>
              {errors.name && touched.name && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1 font-medium">
                  <FiAlertCircle size={12} /> {errors.name}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Phone Number (Optional)</label>
              <input
                type="tel"
                className="input-field"
                placeholder="+91 9876543210"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                onBlur={() => handleBlur('phone')}
                style={{ borderColor: errors.phone && touched.phone ? '#ef4444' : undefined }}
              />
              {errors.phone && touched.phone && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1 font-medium">
                  <FiAlertCircle size={12} /> {errors.phone}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Department *</label>
              <select
                className="input-field"
                value={form.department}
                onChange={(e) => update('department', e.target.value)}
                onBlur={() => handleBlur('department')}
                style={{ borderColor: errors.department && touched.department ? '#ef4444' : undefined }}
              >
                <option value="">Select Department</option>
                <option value="cs">Computer Science</option>
                <option value="ec">Electronics</option>
                <option value="me">Mechanical</option>
                <option value="ce">Civil</option>
                <option value="ch">Chemical</option>
              </select>
              {errors.department && touched.department && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1 font-medium">
                  <FiAlertCircle size={12} /> {errors.department}
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 2: Account */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Email Address *</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-subtle)' }} />
                <input
                  type="email"
                  className="input-field pl-10"
                  placeholder="you@university.edu"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  style={{ borderColor: errors.email && touched.email ? '#ef4444' : undefined }}
                />
              </div>
              {errors.email && touched.email && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1 font-medium">
                  <FiAlertCircle size={12} /> {errors.email}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Password *</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-subtle)' }} />
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input-field pl-10 pr-10"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  style={{ borderColor: errors.password && touched.password ? '#ef4444' : undefined }}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowPw(s => !s)} style={{ color: 'var(--text-subtle)' }}>
                  {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
              {errors.password && touched.password && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1 font-medium">
                  <FiAlertCircle size={12} /> {errors.password}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Confirm Password *</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-subtle)' }} />
                <input
                  type="password"
                  className="input-field pl-10"
                  placeholder="Repeat password"
                  value={form.confirmPassword}
                  onChange={(e) => update('confirmPassword', e.target.value)}
                  onBlur={() => handleBlur('confirmPassword')}
                  style={{ borderColor: errors.confirmPassword && touched.confirmPassword ? '#ef4444' : undefined }}
                />
              </div>
              {errors.confirmPassword && touched.confirmPassword && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1 font-medium">
                  <FiAlertCircle size={12} /> {errors.confirmPassword}
                </p>
              )}
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
