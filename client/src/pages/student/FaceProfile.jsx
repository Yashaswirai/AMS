import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCamera, FiUploadCloud, FiCheckCircle, FiInfo, FiTrash2, FiX, FiLayers, FiAlertCircle } from 'react-icons/fi';
import FaceCapture from '../../components/face/FaceCapture.jsx';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';

function FaceProfile() {
  const [registered, setRegistered] = useState(false);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'upload'
  
  // File Upload State
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const fileInputRef = useRef(null);

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
    if (!capturedImages || capturedImages.length === 0) return;
    setCapturing(true);
    const toastId = toast.loading('Uploading facial dataset matrix to AI database...');
    
    try {
      await api.post('/face/register', { images: capturedImages });
      toast.success('Biometric facial dataset trained successfully!', { id: toastId });
      await fetchProfile();
    } catch (err) {
      console.error('API face registration error:', err);
      toast.error(err.response?.data?.message || 'Face registration failed. Please ensure clear lighting and try again.', { id: toastId });
    } finally {
      setCapturing(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (files.length + uploadedFiles.length > 10) {
      toast.error('You can select up to 10 photos total across different angles');
    }

    const newFiles = files.slice(0, 10 - uploadedFiles.length);
    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Create base64 preview representations
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreviews(prev => [...prev, { name: file.name, src: reader.result }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadSubmit = async () => {
    if (filePreviews.length === 0) {
      toast.error('Please select at least one photo of your face');
      return;
    }

    setCapturing(true);
    const toastId = toast.loading(`Uploading & compiling ${filePreviews.length} multi-angle photo(s)...`);

    try {
      const base64Images = filePreviews.map(f => f.src);
      await api.post('/face/register', { images: base64Images });
      toast.success('Multi-angle facial dataset uploaded & trained successfully!', { id: toastId });
      setUploadedFiles([]);
      setFilePreviews([]);
      await fetchProfile();
    } catch (err) {
      console.error('API multi-angle upload error:', err);
      toast.error(err.response?.data?.message || 'Upload failed. Ensure clear face photos and try again.', { id: toastId });
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
      toast.success('Face profile purged. You may now capture or upload a new dataset.', { id: toastId });
    } catch (err) {
      console.error('API reset error:', err);
      toast.error('Failed to purge face dataset', { id: toastId });
    }
  };

  if (loading) {
    return <div className="flex justify-center py-24"><LoadingSpinner /></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[var(--text)]">Face Biometrics Profile</h1>
        <p className="text-sm text-[var(--text-muted)]">Maintain and update your automated AI attendance facial signature</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Right Policy Info Box */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-card rounded-3xl p-6 space-y-4">
            <h3 className="font-bold text-[var(--text)] border-b border-[var(--border)] pb-3 flex items-center gap-2">
              <FiInfo className="text-indigo-400" /> Biometric Training Policy
            </h3>
            <div className="text-xs text-[var(--text-muted)] leading-relaxed space-y-3">
              <p>To enable reliable automated attendance recognition, the AI engine requires multi-angle facial coordinate maps (10 images recommended).</p>
              <p className="font-bold text-indigo-400">Angle Recommendations:</p>
              <ul className="list-disc pl-4 space-y-1.5 font-medium">
                <li><strong>Frontal Face</strong> (Straight Ahead)</li>
                <li><strong>Left Profile</strong> (30° Angle)</li>
                <li><strong>Right Profile</strong> (30° Angle)</li>
                <li><strong>Tilt Upward</strong> & <strong>Downward</strong></li>
                <li>Glasses/No-Glasses variations</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Left main pane */}
        <div className="lg:col-span-2">
          {registered ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card rounded-3xl p-6 space-y-6"
            >
              <div className="flex justify-between items-center border-b border-[var(--border)] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <FiCheckCircle size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-[var(--text)]">Biometrics Active</h3>
                    <p className="text-xs text-emerald-400 font-semibold">Ready for classroom live face recognition check-ins</p>
                  </div>
                </div>
                <button className="btn-ghost text-red-400 hover:text-red-500 hover:bg-red-50 py-2 px-4 rounded-xl" onClick={handleReset}>
                  <FiTrash2 /> Purge Biometrics
                </button>
              </div>

              {/* Dataset Preview */}
              <div>
                <p className="text-xs font-semibold text-[var(--text-subtle)] uppercase tracking-wider mb-3">Trained Facial Signatures ({images.length})</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {images.map((img, idx) => (
                    <div key={idx} className="rounded-xl overflow-hidden aspect-square border border-[var(--border)] bg-[var(--surface-elevated)] relative group">
                      <img src={img} alt={`Signature ${idx}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="glass-card rounded-3xl p-6 space-y-6">
              {/* Registration Mode Tabs */}
              <div className="flex flex-col sm:flex-row gap-1 bg-[var(--surface-elevated)] p-1 rounded-2xl border border-[var(--border)]">
                <button
                  onClick={() => setActiveTab('camera')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    activeTab === 'camera'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <FiCamera /> 1. Live Camera Capture (Auto 10 Photos)
                </button>
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    activeTab === 'upload'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <FiUploadCloud /> 2. Upload Multi-Angle Photos
                </button>
              </div>

              {/* Tab 1: Camera Capture */}
              {activeTab === 'camera' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="text-xs text-[var(--text-muted)] bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl flex items-center gap-2">
                    <FiInfo className="text-indigo-400 flex-shrink-0 text-base" />
                    <span>The live webcam scanner will capture 10 photos automatically with countdown intervals. Slowly tilt your head side-to-side.</span>
                  </div>
                  <FaceCapture onCaptureComplete={handleCaptureComplete} maxCaptures={10} />
                </motion.div>
              )}

              {/* Tab 2: Multi-Angle Upload */}
              {activeTab === 'upload' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    accept="image/*"
                    className="hidden"
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-indigo-500/30 hover:border-indigo-500 rounded-3xl p-8 text-center cursor-pointer bg-indigo-500/5 hover:bg-indigo-500/10 transition-all space-y-3"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-2xl mx-auto">
                      <FiUploadCloud />
                    </div>
                    <div>
                      <h4 className="font-bold text-[var(--text)] text-sm">Click to Select Multi-Angle Face Photos</h4>
                      <p className="text-xs text-[var(--text-muted)] mt-1">Upload 1 to 10 photos of your face taken from different angles & lighting</p>
                    </div>
                    <span className="btn-secondary text-xs px-4 py-2 inline-flex items-center gap-1.5">
                      Select Image Files...
                    </span>
                  </div>

                  {/* Upload Previews Grid */}
                  {filePreviews.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-[var(--border)] pb-2">
                        <span className="text-xs font-bold text-[var(--text)]">Selected Photos ({filePreviews.length}/10)</span>
                        <button className="text-xs text-red-400 font-semibold" onClick={() => { setUploadedFiles([]); setFilePreviews([]); }}>Clear All</button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {filePreviews.map((file, idx) => (
                          <div key={idx} className="relative rounded-2xl overflow-hidden aspect-square border border-[var(--border)] bg-[var(--surface-elevated)] group">
                            <img src={file.src} alt={file.name} className="w-full h-full object-cover" />
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemoveFile(idx); }}
                              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <FiX size={12} />
                            </button>
                            <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded">
                              Photo #{idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={handleUploadSubmit}
                        disabled={capturing}
                        className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2 rounded-2xl shadow-lg"
                      >
                        <FiCheckCircle size={18} /> Submit & Train Model with Selected Photos ({filePreviews.length})
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FaceProfile;
