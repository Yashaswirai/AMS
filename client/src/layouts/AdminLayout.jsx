import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import {
  RiCameraLensFill, RiDashboardLine, RiBuilding2Line, RiBookOpenLine,
  RiBookmarkLine, RiTeamLine, RiGroupLine, RiCalendarLine, RiDatabase2Line,
  RiBarChartBoxLine, RiFileChartLine, RiRobotLine, RiUserSettingsLine,
  RiMenuFoldLine, RiMenuUnfoldLine, RiBellLine, RiSunLine, RiMoonLine,
  RiSearchLine, RiLogoutBoxLine, RiUserLine, RiShieldLine
} from 'react-icons/ri';
import { FiChevronDown } from 'react-icons/fi';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { path: '/admin/dashboard', icon: RiDashboardLine, label: 'Dashboard' },
    ]
  },
  {
    label: 'Management',
    items: [
      { path: '/admin/departments', icon: RiBuilding2Line, label: 'Departments' },
      { path: '/admin/courses', icon: RiBookOpenLine, label: 'Courses' },
      { path: '/admin/subjects', icon: RiBookmarkLine, label: 'Subjects' },
      { path: '/admin/teachers', icon: RiTeamLine, label: 'Teachers' },
      { path: '/admin/students', icon: RiGroupLine, label: 'Students' },
      { path: '/admin/timetable', icon: RiCalendarLine, label: 'Timetable' },
      { path: '/admin/users', icon: RiUserSettingsLine, label: 'Users' },
    ]
  },
  {
    label: 'Face System',
    items: [
      { path: '/admin/face-datasets', icon: RiDatabase2Line, label: 'Face Datasets' },
    ]
  },
  {
    label: 'Reports & AI',
    items: [
      { path: '/admin/analytics', icon: RiBarChartBoxLine, label: 'Analytics' },
      { path: '/admin/reports', icon: RiFileChartLine, label: 'Reports' },
      { path: '/admin/ai-assistant', icon: RiRobotLine, label: 'AI Assistant' },
    ]
  },
];

function AdminLayout() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications] = useState(3);
  const navigate = useNavigate();
  const userMenuRef = useRef();

  useEffect(() => {
    const handleClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 mb-2">
        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-lg animate-glow-pulse">
          <RiCameraLensFill className="text-white text-lg" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}>
              <p className="font-black text-base gradient-text">AMS</p>
              <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>Admin Panel</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Admin badge */}
      {!collapsed && (
        <div className="mx-4 mb-4 px-3 py-2 rounded-xl flex items-center gap-2" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <RiShieldLine className="text-indigo-400" size={14} />
          <span className="text-xs font-semibold text-indigo-400">Administrator</span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 overflow-y-auto space-y-1">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-3">
            {!collapsed && (
              <p className="text-xs font-semibold uppercase tracking-widest px-2 mb-2" style={{ color: 'var(--text-subtle)' }}>
                {section.label}
              </p>
            )}
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={18} className="flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Collapse button */}
      <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => setCollapsed(c => !c)}
          className="nav-link w-full justify-center"
        >
          {collapsed ? <RiMenuUnfoldLine size={18} /> : <><RiMenuFoldLine size={18} /><span>Collapse</span></>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="glass-sidebar hidden lg:flex flex-col flex-shrink-0 overflow-hidden z-30"
        style={{ minHeight: '100vh' }}
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="sidebar-overlay lg:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed left-0 top-0 bottom-0 z-50 w-64 glass-sidebar flex flex-col lg:hidden"
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="glass-nav flex items-center justify-between px-4 py-3 z-20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
              style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}
              onClick={() => setMobileOpen(true)}
            >
              <RiMenuUnfoldLine size={18} />
            </button>
            {/* Search */}
            <div className="hidden sm:flex relative">
              <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-subtle)', fontSize: '0.9rem' }} />
              <input
                type="text"
                placeholder="Search students, teachers…"
                className="input-field pl-9 text-sm"
                style={{ width: 240 }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
              style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              {isDark ? <RiSunLine size={16} /> : <RiMoonLine size={16} />}
            </button>

            {/* Notifications */}
            <button className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
              style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              <RiBellLine size={16} />
              {notifications > 0 && <div className="notification-badge">{notifications}</div>}
            </button>

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:scale-105"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                onClick={() => setUserMenuOpen(o => !o)}
              >
                <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">{user?.name?.[0] || 'A'}</span>
                </div>
                <span className="hidden sm:block text-sm font-semibold" style={{ color: 'var(--text)' }}>{user?.name || 'Admin'}</span>
                <FiChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-48 rounded-2xl shadow-xl overflow-hidden z-50"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  >
                    <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
                      <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{user?.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
                    </div>
                    <div className="p-2">
                      <button className="nav-link w-full" onClick={() => { setUserMenuOpen(false); navigate('/admin/users'); }}>
                        <RiUserLine size={16} /> Profile
                      </button>
                      <button className="nav-link w-full text-red-400 hover:text-red-400 hover:bg-red-50" onClick={logout}>
                        <RiLogoutBoxLine size={16} /> Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <motion.div
            key="admin-page"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
