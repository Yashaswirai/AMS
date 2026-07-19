import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiVideoOff, FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';
import { RiCameraLensFill } from 'react-icons/ri';

function FaceRecognitionStream({ onRecognize, isActive = false, recognizedFaces = [] }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [frameCount, setFrameCount] = useState(0);

  // Stop camera stream & release hardware
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try { track.stop(); } catch (e) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  // Native getUserMedia starter
  const startCameraStream = useCallback(async () => {
    stopCameraStream();
    setCameraError(null);

    if (typeof window !== 'undefined' && (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)) {
      setCameraError('Camera access requires a Secure Context (HTTPS or http://localhost).');
      return;
    }

    try {
      let stream;
      try {
        // Try ideal resolution constraints
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
        });
      } catch (err1) {
        console.warn('Ideal constraints failed, attempting basic video stream:', err1);
        // Fallback to unconstrained video
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraReady(true);
    } catch (err) {
      console.error('Camera stream error:', err);
      let msg = 'Could not access camera device.';
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        msg = 'Camera permission denied. Please allow camera access in your browser address bar.';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        msg = 'No camera device found on this system.';
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        msg = 'Camera is currently locked by another application (Zoom, Teams, etc).';
      } else if (err?.message) {
        msg = err.message;
      }
      setCameraError(msg);
      setCameraReady(false);
    }
  }, [stopCameraStream]);

  // Capture frame from native video element
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !cameraReady || videoRef.current.readyState < 2) return null;
    try {
      const canvas = document.createElement('canvas');
      const w = videoRef.current.videoWidth || 640;
      const h = videoRef.current.videoHeight || 480;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      
      // Mirror image
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, 0, 0, w, h);
      
      return canvas.toDataURL('image/jpeg', 0.85);
    } catch (err) {
      console.warn('Frame capture error:', err);
      return null;
    }
  }, [cameraReady]);

  // Main recognition loop
  const processRecognitionLoop = useCallback(async () => {
    if (!isActive || !cameraReady) return;
    const imageSrc = captureFrame();
    if (imageSrc) {
      setFrameCount((c) => c + 1);
      onRecognize?.(imageSrc);
    }
  }, [isActive, cameraReady, captureFrame, onRecognize]);

  useEffect(() => {
    if (isActive) {
      startCameraStream();
    } else {
      clearInterval(intervalRef.current);
      stopCameraStream();
      setFrameCount(0);
      setCameraError(null);
    }

    return () => {
      clearInterval(intervalRef.current);
      stopCameraStream();
    };
  }, [isActive, startCameraStream, stopCameraStream]);

  useEffect(() => {
    if (isActive && cameraReady) {
      intervalRef.current = setInterval(processRecognitionLoop, 2000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isActive, cameraReady, processRecognitionLoop]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden aspect-[4/3] bg-slate-900">
      {isActive ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
            style={{ display: cameraReady && !cameraError ? 'block' : 'none' }}
          />

          {/* Scan overlay when active */}
          {cameraReady && !cameraError && (
            <>
              <div className="scan-line absolute left-0 right-0" style={{ height: '2px' }} />
              <div className="absolute top-4 left-4 w-10 h-10 border-t-2 border-l-2 border-indigo-400 rounded-tl-lg" />
              <div className="absolute top-4 right-4 w-10 h-10 border-t-2 border-r-2 border-indigo-400 rounded-tr-lg" />
              <div className="absolute bottom-4 left-4 w-10 h-10 border-b-2 border-l-2 border-indigo-400 rounded-bl-lg" />
              <div className="absolute bottom-4 right-4 w-10 h-10 border-b-2 border-r-2 border-indigo-400 rounded-br-lg" />

              {/* Recognized face overlays */}
              <AnimatePresence>
                {recognizedFaces.map((face, i) => (
                  <motion.div
                    key={face.studentId || i}
                    className="absolute"
                    style={{
                      left: `${face.bbox?.x || 20 + i * 15}%`,
                      top: `${face.bbox?.y || 20}%`,
                      width: `${face.bbox?.w || 20}%`,
                      height: `${face.bbox?.h || 30}%`,
                    }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="face-box w-full h-full">
                      <div className="face-box-label">
                        {face.name} ({Math.round((face.confidence || 0.95) * 100)}%)
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </>
          )}

          {/* Camera Error overlay */}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-900 text-center text-white z-20">
              <FiAlertTriangle className="text-4xl text-amber-400 mb-3 animate-pulse" />
              <h4 className="font-bold text-lg mb-1">Camera Access Issue</h4>
              <p className="text-xs text-slate-300 max-w-sm mb-4 leading-relaxed">{cameraError}</p>
              <button
                className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                onClick={startCameraStream}
              >
                <FiRefreshCw /> Retry Camera Connection
              </button>
            </div>
          )}

          {/* Camera initializing overlay */}
          {!cameraReady && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
              <div className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  className="inline-block text-indigo-400 text-4xl mb-2"
                >
                  <RiCameraLensFill />
                </motion.div>
                <p className="text-sm font-semibold text-white">Opening Camera Hardware…</p>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Camera Off Standby state */
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-900/90 text-slate-300">
          <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-3">
            <FiVideoOff className="text-2xl text-slate-400" />
          </div>
          <h4 className="text-base font-bold text-white mb-1">Camera Stream Standby</h4>
          <p className="text-xs text-slate-400 max-w-xs">
            Camera hardware access is released. Select a course and click <span className="text-indigo-400 font-semibold">"Launch Scanner"</span> to start.
          </p>
        </div>
      )}

      {/* Status bar */}
      <div
        className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between pointer-events-none z-30"
        style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.85))' }}
      >
        <div className="flex items-center gap-2">
          <div className={`status-dot ${isActive && cameraReady ? 'online' : 'offline'}`} />
          <span className="text-white text-xs font-semibold">
            {isActive && cameraReady ? `Live Recognition • Frame ${frameCount}` : 'Camera Offline'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <FiUser size={12} className={isActive && cameraReady ? 'text-emerald-400' : 'text-slate-400'} />
          <span className={`${isActive && cameraReady ? 'text-emerald-400' : 'text-slate-400'} text-xs font-semibold`}>
            {isActive && cameraReady ? `${recognizedFaces.length} detected` : 'Session Idle'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default FaceRecognitionStream;
