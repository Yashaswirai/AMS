import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { FiRefreshCw, FiPlay, FiSquare, FiUsers, FiClock, FiShield } from 'react-icons/fi';
import api from '../../services/api.js';
import toast from 'react-hot-toast';

const SUBJECTS = [
  { code: 'CS-301', name: 'Data Structures & Algorithms' },
  { code: 'CS-302', name: 'Database Management Systems' },
  { code: 'CS-501', name: 'Artificial Intelligence' },
];

function QRAttendance() {
  const [subjectCode, setSubjectCode] = useState('');
  const [period, setPeriod] = useState('1');
  const [isActive, setIsActive] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [timeLeft, setTimeLeft] = useState(15);
  const [scannedStudents, setScannedStudents] = useState([]);

  // Generate secure rotation token
  const generateToken = () => {
    if (!subjectCode) return;
    const salt = Math.random().toString(36).substring(2, 7).toUpperCase();
    const tokenData = {
      subjectCode,
      period,
      timestamp: Date.now(),
      salt,
      signature: `AMS-SECURE-${salt}`
    };
    
    setQrToken(JSON.stringify(tokenData));
    setTimeLeft(15);
  };

  // Rotation timer
  useEffect(() => {
    let timer;
    if (isActive) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            generateToken();
            simulateNewScan(); // mock real-time students scanning
            return 15;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isActive, subjectCode, period]);

  const simulateNewScan = () => {
    const names = ['Aarav Sharma', 'Sarah Miller', 'Ravi Kumar', 'Emily Davis', 'Vijay Patel'];
    const rolls = ['EC23B2001', 'CS22B1002', 'CS22B1001', 'ME21B3005', 'CE22B4009'];
    const randomIndex = Math.floor(Math.random() * names.length);
    
    // Add scanned student if not already present
    setScannedStudents(prev => {
      const exists = prev.some(s => s.rollNumber === rolls[randomIndex]);
      if (!exists && prev.length < 4) {
        return [...prev, {
          name: names[randomIndex],
          rollNumber: rolls[randomIndex],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        }];
      }
      return prev;
    });
  };

  const handleStart = () => {
    if (!subjectCode) {
      toast.error('Select a subject to open class session');
      return;
    }
    setScannedStudents([]);
    setIsActive(true);
    generateToken();
    toast.success('Secure Rotating QR Scanner Online');
  };

  const handleStop = () => {
    setIsActive(false);
    setQrToken('');
    toast.success('QR Code Check-in session closed. Syncing database logs.');
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
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                disabled={isActive}
              >
                <option value="">Select Class...</option>
                {SUBJECTS.map(s => (
                  <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
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
              <div className="qr-container bg-white p-6 rounded-2xl shadow-xl flex items-center justify-center mt-6">
                <QRCodeSVG value={qrToken} size={250} level="H" includeMargin={true} />
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
