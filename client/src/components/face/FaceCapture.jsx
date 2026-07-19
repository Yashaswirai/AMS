import React, { useRef, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCamera, FiRefreshCw, FiCheck, FiAlertTriangle } from 'react-icons/fi';
import { RiCameraLensFill } from 'react-icons/ri';

function FaceCapture({ onCapture, onCaptureComplete, onError, maxPhotos, maxCaptures }) {
  const limit = maxPhotos || maxCaptures || 10;
  const handleComplete = onCapture || onCaptureComplete;

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  
  const [captured, setCaptured] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const stopCamera = useCallback(() => {
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

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    if (typeof window !== 'undefined' && (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)) {
      setCameraError('Camera access requires a Secure Context (HTTPS or http://localhost).');
      return;
    }

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
        });
      } catch (err1) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraReady(true);
    } catch (err) {
      console.error('FaceCapture camera error:', err);
      let msg = 'Could not access camera.';
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        msg = 'Camera permission denied. Please allow camera access in browser.';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        msg = 'No camera device detected.';
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        msg = 'Camera is in use by another application.';
      } else if (err?.message) {
        msg = err.message;
      }
      setCameraError(msg);
      onError?.(err);
    }
  }, [stopCamera, onError]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

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

      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, 0, 0, w, h);
      return canvas.toDataURL('image/jpeg', 0.85);
    } catch (e) {
      return null;
    }
  }, [cameraReady]);

  const startAutoCapture = useCallback(async () => {
    setIsCapturing(true);
    setCaptured([]);
    const photos = [];

    for (let i = 0; i < limit; i++) {
      if (i === 0) {
        for (let c = 3; c > 0; c--) {
          setCountdown(c);
          await new Promise(r => setTimeout(r, 800));
        }
      } else {
        await new Promise(r => setTimeout(r, 1000));
      }
      setCountdown(null);
      const imageSrc = captureFrame();
      if (imageSrc) {
        photos.push(imageSrc);
        setCaptured([...photos]);
      }
    }

    setIsCapturing(false);
    handleComplete?.(photos);
  }, [limit, handleComplete, captureFrame]);

  const reset = () => {
    setCaptured([]);
    setIsCapturing(false);
    setCountdown(null);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Camera view */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-900" style={{ width: 400, height: 300 }}>
        {!cameraError && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
            style={{ display: cameraReady ? 'block' : 'none' }}
          />
        )}

        {/* Corner brackets */}
        {cameraReady && !cameraError && (
          <div className="absolute inset-4 pointer-events-none">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-indigo-400 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-indigo-400 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-indigo-400 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-indigo-400 rounded-br-lg" />
            {isCapturing && <div className="scan-line" />}
          </div>
        )}

        {/* Countdown overlay */}
        <AnimatePresence>
          {countdown && (
            <motion.div
              key={countdown}
              className="absolute inset-0 flex items-center justify-center z-10"
              style={{ background: 'rgba(0,0,0,0.5)' }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              transition={{ duration: 0.3 }}
            >
              <span className="text-7xl font-black text-white">{countdown}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress overlay */}
        {isCapturing && !countdown && (
          <div className="absolute bottom-3 left-3 right-3 z-10">
            <div className="rounded-full overflow-hidden h-1.5" style={{ background: 'rgba(255,255,255,0.3)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: '#6366f1' }}
                animate={{ width: `${(captured.length / limit) * 100}%` }}
              />
            </div>
            <p className="text-white text-xs text-center mt-1 font-semibold">
              {captured.length}/{limit} photos captured
            </p>
          </div>
        )}

        {/* Camera Error overlay */}
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-white bg-slate-900 z-20">
            <FiAlertTriangle className="text-3xl text-amber-400 mb-2" />
            <p className="text-xs text-slate-300 max-w-xs mb-3 leading-relaxed">{cameraError}</p>
            <button
              className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
              onClick={startCamera}
            >
              <FiRefreshCw /> Retry Camera
            </button>
          </div>
        )}

        {/* Camera initializing overlay */}
        {!cameraReady && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
            <div className="text-center">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <RiCameraLensFill className="text-indigo-400 text-4xl mb-2" />
              </motion.div>
              <p className="text-xs text-slate-400 font-semibold">Initializing Camera…</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {captured.length === 0 && !isCapturing ? (
          <button className="btn-primary" onClick={startAutoCapture} disabled={!cameraReady || Boolean(cameraError)}>
            <FiCamera /> Start Face Capture ({limit} photos)
          </button>
        ) : isCapturing ? (
          <button className="btn-danger" onClick={() => setIsCapturing(false)}>
            Stop Capture
          </button>
        ) : (
          <>
            <button className="btn-secondary" onClick={reset}>
              <FiRefreshCw /> Retake
            </button>
            <span className="badge badge-success">
              <FiCheck /> {captured.length} photos ready
            </span>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {captured.length > 0 && (
        <div className="flex gap-2 flex-wrap justify-center max-w-sm">
          {captured.map((img, i) => (
            <motion.img
              key={i}
              src={img}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="w-12 h-12 rounded-lg object-cover border-2"
              style={{ borderColor: 'rgba(99,102,241,0.5)' }}
              alt={`Capture ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default FaceCapture;
