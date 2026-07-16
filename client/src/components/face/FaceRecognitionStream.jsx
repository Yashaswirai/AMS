import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiCheckCircle } from 'react-icons/fi';

const videoConstraints = { width: 640, height: 480, facingMode: 'user' };

function FaceRecognitionStream({ onRecognize, isActive = false, recognizedFaces = [] }) {
  const webcamRef = useRef(null);
  const intervalRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [frameCount, setFrameCount] = useState(0);

  const captureAndRecognize = useCallback(async () => {
    if (!webcamRef.current || !isActive) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      setFrameCount(c => c + 1);
      onRecognize?.(imageSrc);
    }
  }, [isActive, onRecognize]);

  useEffect(() => {
    if (isActive && cameraReady) {
      intervalRef.current = setInterval(captureAndRecognize, 2000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isActive, cameraReady, captureAndRecognize]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden" style={{ background: '#000' }}>
      <Webcam
        ref={webcamRef}
        audio={false}
        screenshotFormat="image/jpeg"
        videoConstraints={videoConstraints}
        onUserMedia={() => setCameraReady(true)}
        className="w-full"
        style={{ display: 'block' }}
        mirrored
      />

      {/* Scan overlay when active */}
      {isActive && (
        <>
          <div className="scan-line absolute left-0 right-0" style={{ height: '2px' }} />
          {/* Corner brackets */}
          <div className="absolute top-4 left-4 w-10 h-10 border-t-2 border-l-2 border-indigo-400 rounded-tl-lg" />
          <div className="absolute top-4 right-4 w-10 h-10 border-t-2 border-r-2 border-indigo-400 rounded-tr-lg" />
          <div className="absolute bottom-4 left-4 w-10 h-10 border-b-2 border-l-2 border-indigo-400 rounded-bl-lg" />
          <div className="absolute bottom-4 right-4 w-10 h-10 border-b-2 border-r-2 border-indigo-400 rounded-br-lg" />
        </>
      )}

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

      {/* Status bar */}
      <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between"
        style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
        <div className="flex items-center gap-2">
          <div className={`status-dot ${isActive ? 'online' : 'offline'}`} />
          <span className="text-white text-xs font-semibold">
            {isActive ? `Live Recognition • Frame ${frameCount}` : 'Paused'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <FiUser size={12} className="text-emerald-400" />
          <span className="text-emerald-400 text-xs font-semibold">{recognizedFaces.length} detected</span>
        </div>
      </div>

      {/* Camera not ready */}
      {!cameraReady && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--surface)' }}>
          <div className="text-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-4xl mb-2"
            >📷</motion.div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Initializing camera…</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default FaceRecognitionStream;
