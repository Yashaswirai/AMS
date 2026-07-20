import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { FiRefreshCw, FiPlay, FiSquare, FiUsers, FiClock, FiShield } from 'react-icons/fi';
import { io } from 'socket.io-client';
import api from '../../services/api.js';
import toast from 'react-hot-toast';

function QRAttendance() {
  const [subjectsList, setSubjectsList] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [period, setPeriod] = useState('1');
  const [isActive, setIsActive] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [timeLeft, setTimeLeft] = useState(15);
  const [scannedStudents, setScannedStudents] = useState([]);

  useEffect(() => {
    api.get('/subjects').then(res => {
      const raw = res.data?.data || res.data?.subjects || res.data || [];
      setSubjectsList(raw);
      if (raw.length > 0 && !subjectId) {
        setSubjectId(raw[0]._id || raw[0].id || raw[0].code);
      }
    }).catch(() => {});
  }, []);

  // Real-time socket listener for student check-ins
  useEffect(() => {
    let socket;
    if (isActive) {
      try {
        const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '/';
        socket = io(socketUrl, { withCredentials: true });
        
        socket.on('attendanceMarked', (data) => {
          if (data && (data.method === 'qr' || data.studentId)) {
            setScannedStudents(prev => {
              const exists = prev.some(s => (data.studentId && s.studentId === data.studentId) || (data.rollNumber && s.rollNumber === data.rollNumber));
              if (exists) return prev;
              
              toast.success(`Check-in: ${data.name || data.rollNumber}`);
              return [{
                studentId: data.studentId,
                name: data.name || `Student ${data.rollNumber}`,
                rollNumber: data.rollNumber || 'N/A',
                time: data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }, ...prev];
            });
          }
        });
      } catch (err) {
        console.warn('Socket connection error:', err);
      }
    }
    return () => {
      if (socket) socket.disconnect();
    };
  }, [isActive]);

  // Generate authentic backend rotation token
  const generateToken = async (subId = subjectId, periodVal = period) => {
    if (!subId) return;
    try {
      const res = await api.post('/attendance/qr-session', {
        subjectId: subId,
        period: periodVal,
        expirySeconds: 20
      });
      const data = res.data?.data || res.data;
      const payloadStr = data.qrPayload || JSON.stringify({
        sessionId: data.sessionId,
        subjectId: data.subjectId,
        period: data.period,
        expiresAt: data.expiresAt
      });

      setQrToken(payloadStr);
      setSessionId(data.sessionId);
      setTimeLeft(15);
    } catch (err) {
      console.error('Failed to generate backend QR session:', err);
      toast.error(err.response?.data?.message || 'Error generating QR session token');
    }
  };

  // Rotation timer - requests live new token from backend
  useEffect(() => {
    let timer;
    if (isActive) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            generateToken();
            return 15;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isActive, subjectId, period]);

  const handleStart = async () => {
    if (!subjectId) {
      toast.error('Select a subject to open class session');
      return;
    }
    setScannedStudents([]);
    setIsActive(true);
    await generateToken(subjectId, period);
    toast.success('Secure Rotating QR Check-In Live');
  };

  const handleStop = () => {
    setIsActive(false);
    setQrToken('');
    setSessionId('');
    toast.success('QR Code Check-in session closed.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[var(--text)]">QR-Code Attendance Check-In</h1>
        <p className="text-sm text-[var(--text-muted)]">Display dynamic encrypted QR Codes for self student check-ins</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings panel */}
        <div className="lg:col-span-1 glass-card rounded-3xl p-6 h-fit space-y-4">
          <h3 className="font-bold text-[var(--text)] border-b border-[var(--border)] pb-3">QR Configurations</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[var(--text-subtle)]">Course Subject</label>
              <select
                className="input-field"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                disabled={isActive}
              >
                <option value="">Select Class...</option>
                {subjectsList.map(s => (
                  <option key={s._id || s.id || s.code} value={s._id || s.id || s.code}>
                    {s.code ? `${s.code} - ${s.name}` : s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[var(--text-subtle)]">Lecture Period</label>
              <select
                className="input-field"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                disabled={isActive}
              >
                <option value="1">Period 1 (09:00 - 10:00)</option>
                <option value="2">Period 2 (10:00 - 11:00)</option>
                <option value="3">Period 3 (11:00 - 12:00)</option>
                <option value="4">Period 4 (14:00 - 15:00)</option>
              </select>
            </div>

            <div className="pt-2">
              {!isActive ? (
                <button className="btn-primary w-full py-2.5 flex items-center justify-center gap-2" onClick={handleStart}>
                  <FiPlay /> Start QR Check-in
                </button>
              ) : (
                <button className="btn-danger w-full py-2.5 flex items-center justify-center gap-2" onClick={handleStop}>
                  <FiSquare /> Terminate QR Session
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Display screen */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {isActive && qrToken ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card rounded-3xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden"
            >
              {/* Dynamic Security Indicator */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5 text-xs text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 font-bold">
                <FiShield /> Dynamic Anti-Cheat
              </div>

              {/* QR Container */}
              <div className="qr-container bg-white p-4 sm:p-6 rounded-2xl shadow-xl flex items-center justify-center mt-6 w-full max-w-[280px]">
                <QRCodeSVG value={qrToken} size={220} level="H" includeMargin={true} className="w-full h-auto max-w-[240px]" />
              </div>

              {/* Rotating Indicator */}
              <div className="mt-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin flex items-center justify-center text-xs font-black text-indigo-400">
                  {timeLeft}
                </div>
                <p className="text-sm font-semibold text-[var(--text-muted)] text-left leading-tight">
                  QR code rotates in <strong className="text-[var(--text)]">{timeLeft} seconds</strong><br />
                  <span className="text-xs text-[var(--text-subtle)] font-medium">Rotation prevents screenshot sharing coordinates.</span>
                </p>
              </div>

              {/* Scanned students list */}
              <div className="w-full mt-8 border-t border-[var(--border)] pt-6 text-left">
                <h4 className="font-bold text-sm text-[var(--text)] mb-3 flex items-center gap-2">
                  <FiUsers className="text-emerald-400" /> Recent Scans ({scannedStudents.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {scannedStudents.map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] flex justify-between items-center"
                    >
                      <div>
                        <p className="text-xs font-bold text-[var(--text)]">{s.name}</p>
                        <p className="text-[10px] text-[var(--text-subtle)] font-bold">{s.rollNumber}</p>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-semibold">{s.time}</span>
                    </motion.div>
                  ))}
                  {scannedStudents.length === 0 && (
                    <p className="text-xs text-[var(--text-subtle)] col-span-2">Waiting for student scans. Advise class to open the student mobile check-in portal...</p>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="glass-card rounded-3xl p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px]">
              <FiRefreshCw className="text-5xl text-[var(--text-subtle)] mb-3 animate-spin-slow" />
              <h3 className="font-bold text-lg text-[var(--text)]">Check-In Display Board</h3>
              <p className="text-sm text-[var(--text-muted)] mt-1 max-w-sm">Select a course in the left settings panel and launch check-in session to display the encrypted live-rotating QR code.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QRAttendance;
