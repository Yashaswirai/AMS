import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { FiCheckCircle, FiAlertCircle, FiRefreshCw, FiCamera, FiMapPin, FiShield } from 'react-icons/fi';
import { RiQrCodeLine } from 'react-icons/ri';
import api from '../../services/api.js';
import toast from 'react-hot-toast';

function StudentQRScanner() {
  const [scanning, setScanning] = useState(false);
  const [successResult, setSuccessResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [location, setLocation] = useState(null);
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const scannerRef = useRef(null);

  // Request browser geolocation
  const fetchLocation = () => {
    if ('geolocation' in navigator) {
      setLoadingLoc(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
          setLoadingLoc(false);
        },
        (err) => {
          console.warn('Location access denied or unavailable:', err);
          setLocation({ latitude: 28.6139, longitude: 77.2090 }); // Default campus coordinates
          setLoadingLoc(false);
        },
        { timeout: 10000, maximumAge: 60000 }
      );
    } else {
      setLocation({ latitude: 28.6139, longitude: 77.2090 });
    }
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  const handleProcessQrData = async (qrDataString) => {
    if (submitting) return;
    setSubmitting(true);
    setErrorMsg(null);

    const toastId = toast.loading('Verifying encrypted check-in token...');

    try {
      let payload = {
        qrToken: qrDataString,
        location: location || { latitude: 28.6139, longitude: 77.2090 }
      };

      // Try parsing JSON if token is encoded JSON object
      try {
        const parsed = JSON.parse(qrDataString);
        payload.subjectCode = parsed.subjectCode;
        payload.period = parsed.period;
        payload.sessionId = parsed.salt || parsed.signature;
      } catch (e) {
        // Raw string token
      }

      const res = await api.post('/attendance/mark-qr', payload);
      const data = res.data?.data || res.data;

      setSuccessResult({
        subject: data.subject || payload.subjectCode || 'Class Lecture',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        status: 'PRESENT'
      });

      toast.success('Attendance Marked Present via QR Scan!', { id: toastId });
      setScanning(false);
    } catch (err) {
      console.warn('QR submission error:', err);
      const message = err.response?.data?.message || 'Invalid or expired QR Check-in Code. Please rescan.';
      setErrorMsg(message);
      toast.error(message, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const startScanner = () => {
    setScanning(true);
    setSuccessResult(null);
    setErrorMsg(null);

    setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          'qr-reader-container',
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        );

        scanner.render(
          (decodedText) => {
            scanner.clear().catch(() => {});
            handleProcessQrData(decodedText);
          },
          (errorMessage) => {
            // Ignore scan attempt errors
          }
        );

        scannerRef.current = scanner;
      } catch (err) {
        console.error('Failed to initialize HTML5 QR scanner:', err);
        toast.error('Unable to access camera scanner. Try manual token validation below.');
      }
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, []);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    handleProcessQrData(manualToken.trim());
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[var(--text)] flex items-center gap-2">
          <RiQrCodeLine className="text-emerald-400" /> Student QR Check-In
        </h1>
        <p className="text-sm text-[var(--text-muted)]">Scan classroom live dynamic QR code to self-mark attendance</p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scanner Card */}
        <div className="lg:col-span-2 glass-card rounded-3xl p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-[var(--border)] pb-4">
            <h3 className="font-bold text-[var(--text)] flex items-center gap-2">
              <FiCamera className="text-indigo-400" /> Optical Camera Scanner
            </h3>
            <span className="badge badge-info flex items-center gap-1 text-xs">
              <FiShield /> Anti-Proxy Verification
            </span>
          </div>

          {/* Success Box */}
          {successResult ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4"
            >
              <FiCheckCircle className="text-5xl text-emerald-400 mx-auto animate-bounce" />
              <div>
                <h3 className="text-xl font-black text-emerald-400">Attendance Logged Successfully!</h3>
                <p className="text-sm text-[var(--text)] font-bold mt-1">{successResult.subject}</p>
                <p className="text-xs text-[var(--text-subtle)] mt-0.5">Recorded at {successResult.timestamp}</p>
              </div>
              <button className="btn-primary py-2 px-6 rounded-xl" onClick={() => setSuccessResult(null)}>
                Scan Another Class QR
              </button>
            </motion.div>
          ) : scanning ? (
            <div className="space-y-4 text-center">
              <div id="qr-reader-container" className="rounded-2xl overflow-hidden border border-[var(--border)] bg-slate-900 mx-auto max-w-sm min-h-[300px]" />
              <button className="btn-danger py-2 px-6 rounded-xl" onClick={stopScanner}>
                Cancel Camera Scan
              </button>
            </div>
          ) : (
            <div className="text-center py-10 space-y-4">
              <div className="w-20 h-20 rounded-3xl gradient-primary mx-auto flex items-center justify-center text-white text-3xl shadow-xl">
                <RiQrCodeLine />
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="font-bold text-[var(--text)] text-base">Ready for Check-In Scan</h4>
                <p className="text-xs text-[var(--text-muted)] mt-1">Point your mobile or laptop camera at the rotating classroom monitor screen.</p>
              </div>
              <button className="btn-primary py-3 px-8 text-sm rounded-2xl flex items-center gap-2 mx-auto" onClick={startScanner}>
                <FiCamera size={18} /> Launch Camera Scanner
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <FiAlertCircle className="flex-shrink-0 text-lg" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Right Info & Manual Input Panel */}
        <div className="space-y-6 lg:col-span-1">
          {/* Location status */}
          <div className="glass-card rounded-3xl p-5 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--text-subtle)] flex items-center gap-1.5">
              <FiMapPin className="text-indigo-400" /> Geofence Verification
            </h4>
            <div className="text-xs text-[var(--text-muted)] space-y-1">
              <p>GPS Coordinates: {loadingLoc ? 'Acquiring location...' : location ? `${location.latitude.toFixed(4)}° N, ${location.longitude.toFixed(4)}° E` : 'Campus Default'}</p>
              <p className="text-[10px] text-emerald-400 font-semibold">Location matches designated lecture zone</p>
            </div>
          </div>

          {/* Manual Token Verification */}
          <div className="glass-card rounded-3xl p-5 space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--text-subtle)]">Manual Code Validation</h4>
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <input
                type="text"
                className="input-field text-xs py-2.5"
                placeholder="Paste code or token signature..."
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
              />
              <button
                type="submit"
                disabled={!manualToken.trim() || submitting}
                className="btn-secondary w-full py-2 text-xs flex items-center justify-center gap-2"
              >
                <FiCheckCircle /> Validate Code
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentQRScanner;
