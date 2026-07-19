import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCamera, FiCheckCircle, FiInfo, FiTrash2 } from 'react-icons/fi';
import FaceCapture from '../../components/face/FaceCapture.jsx';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';

function FaceProfile() {
  const [registered, setRegistered] = useState(false);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get('/face/dataset/me');
      setRegistered(Boolean(res.data?.data?.registered));
      setImages(res.data?.data?.images || []);
    } catch (err) {
      console.warn('API face-profile error:', err);
      setRegistered(false);
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleCaptureComplete = async (capturedImages) => {
    setCapturing(true);
    const toastId = toast.loading('Uploading face print matrix to AI database...');
    
    try {
      await api.post('/face/register', { images: capturedImages });
      toast.success('Biometric facial dataset updated successfully!', { id: toastId });
      await fetchProfile();
    } catch (err) {
      console.error('API face registration error:', err);
      toast.error(err.response?.data?.message || 'Face registration failed. Please ensure clear lighting and try again.', { id: toastId });
    } finally {
      setCapturing(false);
    }
  };

  const handleReset = async () => {
    const toastId = toast.loading('Purging facial dataset...');
    try {
      await api.delete('/face/dataset/me');
      setRegistered(false);
      setImages([]);
      toast.success('Face profile purged. You may now capture a new dataset.', { id: toastId });
    } catch (err) {
      console.error('API reset error:', err);
      toast.error('Failed to purge face dataset', { id: toastId });
    }
  };

  if (loading) {
    return <div className="flex justify-center py-24"><LoadingSpinner /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[var(--text)]">Face Biometrics Profile</h1>
        <p className="text-sm text-[var(--text-muted)]">Maintain and update your automated AI attendance facial signature</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Right Info Box */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-card rounded-3xl p-6 space-y-4">
            <h3 className="font-bold text-[var(--text)] border-b border-[var(--border)] pb-3 flex items-center gap-2">
              <FiInfo className="text-indigo-400" /> Biometric Policy
            </h3>
            <div className="text-xs text-[var(--text-muted)] leading-relaxed space-y-3">
              <p>To enable automated attendance tracking, the classroom system requires 10 distinct facial coordinate maps. Images are processed locally into mathematical vectors and encrypted.</p>
              <p className="font-bold text-indigo-400">Capture Guidelines:</p>
              <ul className="list-disc pl-4 space-y-1.5 font-medium">
                <li>Ensure bright ambient room lighting</li>
                <li>Avoid wearing hats, large glasses, or mask filters</li>
                <li>Slowly rotate your head slightly from side-to-side during capture</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Left capture pane */}
        <div className="lg:col-span-2">
          {registered ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card rounded-3xl p-6 space-y-6"
            >
              <div className="flex justify-between items-center border-b border-[var(--border)] pb-4">
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="text-emerald-400 text-xl" />
                  <div>
                    <h3 className="font-bold text-[var(--text)]">Biometrics Registered</h3>
                    <p className="text-xs text-emerald-400 font-semibold">Ready for classroom face recognition scan check-ins</p>
                  </div>
                </div>
                <button className="btn-ghost text-red-400 hover:text-red-500 hover:bg-red-50" onClick={handleReset}>
                  <FiTrash2 /> Reset Biometrics
                </button>
              </div>

              {/* Dataset Preview */}
              <div>
                <p className="text-xs font-semibold text-[var(--text-subtle)] uppercase tracking-wider mb-3">Registered Face Signatures</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {images.map((img, idx) => (
                    <div key={idx} className="rounded-xl overflow-hidden aspect-square border border-[var(--border)] bg-[var(--surface-elevated)]">
                      <img src={img} alt={`Signature ${idx}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="glass-card rounded-3xl p-6 space-y-4">
              <h3 className="font-bold text-[var(--text)] mb-2 flex items-center gap-2">
                <FiCamera className="text-indigo-400 animate-pulse" /> Register Facial Dataset
              </h3>
              <FaceCapture onCaptureComplete={handleCaptureComplete} maxCaptures={10} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FaceProfile;
