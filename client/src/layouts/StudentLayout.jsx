import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import RouteContentBoundary from '../components/common/RouteErrorBoundary.jsx';
import {
  RiCameraLensFill, RiDashboardLine, RiCalendarCheckLine, RiCalendar2Line,
  RiUserSmileLine, RiFileTextLine, RiBellLine, RiFileChartLine,
  RiSunLine, RiMoonLine, RiMenuUnfoldLine, RiLogoutBoxLine
} from 'react-icons/ri';
import { FiChevronDown } from 'react-icons/fi';

const NAV_ITEMS = [
  { path: '/student/dashboard', icon: RiDashboardLine, label: 'Dashboard' },
  { path: '/student/attendance', icon: RiCalendarCheckLine, label: 'My Attendance' },
  { path: '/student/calendar', icon: RiCalendar2Line, label: 'Calendar' },
  { path: '/student/face-profile', icon: RiUserSmileLine, label: 'Face Profile' },
  { path: '/student/leave', icon: RiFileTextLine, label: 'Leave Request' },
  { path: '/student/notifications', icon: RiBellLine, label: 'Notifications' },
  { path: '/student/reports', icon: RiFileChartLine, label: 'Reports' },
];

function StudentLayout() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef();

  useEffect(() => {
    const handleClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 mb-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg" style={{ background: 'linear-gradient(135deg,#10b981,#06b6d4)' }}>
          <RiCameraLensFill className="text-white text-lg" />
        </div>
        <div>
          <p className="font-black text-base" style={{ background: 'linear-gradient(135deg,#10b981,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AMS</p>
          <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>Student Portal</p>
        </div>
      </div>

      {/* Student avatar */}
      <div className="mx-4 mb-4 p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#10b981,#06b6d4)' }}>
            <span className="text-white font-bold">{user?.name?.[0] || 'S'}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{user?.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>Roll: {user?.rollNumber || 'N/A'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 overflow-y-auto space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <item.icon size={18} className="flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <button onClick={logout} className="nav-link w-full" style={{ color: '#ef4444' }}>
          <RiLogoutBoxLine size={16} /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <aside className="glass-sidebar hidden lg:flex flex-col flex-shrink-0 overflow-hidden z-30 w-60">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div className="sidebar-overlay lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside className="fixed left-0 top-0 bottom-0 z-50 w-64 glass-sidebar flex flex-col lg:hidden" initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="glass-nav flex items-center justify-between px-4 py-3 z-20 flex-shrink-0">
          <button className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface)', color: 'var(--text-muted)' }} onClick={() => setMobileOpen(true)}>
            <RiMenuUnfoldLine size={18} />
          </button>

          <div className="hidden sm:block">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Student Portal</h2>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {isDark ? <RiSunLine size={16} /> : <RiMoonLine size={16} />}
            </button>

            <div className="relative" ref={userMenuRef}>
              <button className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} onClick={() => setUserMenuOpen(o => !o)}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#10b981,#06b6d4)' }}>
                  <span className="text-white text-xs font-bold">{user?.name?.[0] || 'S'}</span>
                </div>
                <span className="hidden sm:block text-sm font-semibold" style={{ color: 'var(--text)' }}>{user?.name}</span>
                <FiChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-2 w-48 rounded-2xl shadow-xl z-50" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div className="p-2">
                      <button className="nav-link w-full" style={{ color: '#ef4444' }} onClick={logout}><RiLogoutBoxLine size={16} /> Logout</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <motion.div key="student-page" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <RouteContentBoundary><Outlet /></RouteContentBoundary>
          </motion.div>
        </main>
      </div>
    </div>
  );
}

export default StudentLayout;
