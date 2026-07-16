import React, { useRef, useCallback, useState } from 'react';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCamera, FiRefreshCw, FiCheck } from 'react-icons/fi';
import { RiCameraLensFill } from 'react-icons/ri';

const videoConstraints = {
  width: 640,
  height: 480,
  facingMode: 'user',
};

function FaceCapture({ onCapture, onError, maxPhotos = 10 }) {
  const webcamRef = useRef(null);
  const [captured, setCaptured] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      const newCaptures = [...captured, imageSrc];
      setCaptured(newCaptures);
      if (newCaptures.length >= maxPhotos) {
        onCapture?.(newCaptures);
      }
    }
  }, [captured, maxPhotos, onCapture]);

  const startAutoCapture = useCallback(async () => {
    setIsCapturing(true);
    setCaptured([]);
    const photos = [];

    for (let i = 0; i < maxPhotos; i++) {
      // Countdown 3-2-1 for first photo, then 2s intervals
      const delay = i === 0 ? 3 : 2;
      for (let c = delay; c > 0; c--) {
        setCountdown(c);
        await new Promise(r => setTimeout(r, 1000));
      }
      setCountdown(null);
      const imageSrc = webcamRef.current?.getScreenshot();
      if (imageSrc) {
        photos.push(imageSrc);
        setCaptured([...photos]);
      }
    }

    setIsCapturing(false);
    onCapture?.(photos);
  }, [maxPhotos, onCapture]);

  const reset = () => {
    setCaptured([]);
    setIsCapturing(false);
    setCountdown(null);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Camera view */}
      <div className="relative rounded-2xl overflow-hidden" style={{ width: 400, height: 300 }}>
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          onUserMedia={() => setCameraReady(true)}
          onUserMediaError={onError}
          className="w-full h-full object-cover"
          mirrored
        />

        {/* Corner brackets */}
        <div className="absolute inset-4 pointer-events-none">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-indigo-400 rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-indigo-400 rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-indigo-400 rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-indigo-400 rounded-br-lg" />
          {/* Scan line */}
          {isCapturing && <div className="scan-line" />}
        </div>

        {/* Countdown overlay */}
        <AnimatePresence>
          {countdown && (
            <motion.div
              key={countdown}
              className="absolute inset-0 flex items-center justify-center"
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
          <div className="absolute bottom-3 left-3 right-3">
            <div className="rounded-full overflow-hidden h-1.5" style={{ background: 'rgba(255,255,255,0.3)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: '#6366f1' }}
                animate={{ width: `${(captured.length / maxPhotos) * 100}%` }}
              />
            </div>
            <p className="text-white text-xs text-center mt-1 font-semibold">
              {captured.length}/{maxPhotos} photos captured
            </p>
          </div>
        )}

        {/* Camera not ready */}
        {!cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--surface)' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <RiCameraLensFill className="text-indigo-400 text-4xl" />
            </motion.div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {captured.length === 0 && !isCapturing ? (
          <button className="btn-primary" onClick={startAutoCapture} disabled={!cameraReady}>
            <FiCamera /> Start Face Capture ({maxPhotos} photos)
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
