import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCpu, FiTrash2, FiSearch, FiRefreshCw, FiCheckCircle, FiInfo } from 'react-icons/fi';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';

function FaceDatasets() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const fetchDatasets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/face/datasets');
      const list = res.data?.data?.datasets || res.data?.datasets || [];
      setDatasets(list);
    } catch (err) {
      console.warn('API error fetching datasets:', err);
      setDatasets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleRetrain = async () => {
    setTraining(true);
    const toastId = toast.loading('Initiating AI Model Training...');
    try {
      const res = await api.post('/face/train');
      const msg = res.data?.message || 'AI Model trained and deployed successfully!';
      toast.success(msg, { id: toastId });
    } catch (err) {
      console.warn('API error during retrain:', err);
      toast.error('Model retraining failed or CV API offline', { id: toastId });
    } finally {
      setTraining(false);
    }
  };

  const handleDeleteImage = async (studentId, imageIndex) => {
    try {
      await api.delete(`/face/dataset/${studentId}/image/${imageIndex}`);
      toast.success('Image deleted from biometric database');
      setDatasets(prev =>
        prev.map(d =>
          d.studentId === studentId
            ? { ...d, imagesCount: Math.max(0, d.imagesCount - 1), images: d.images.filter((_, idx) => idx !== imageIndex) }
            : d
        )
      );
      if (selectedStudent?.studentId === studentId) {
        setSelectedStudent(prev => prev ? { ...prev, imagesCount: Math.max(0, prev.imagesCount - 1), images: prev.images.filter((_, idx) => idx !== imageIndex) } : null);
      }
    } catch (err) {
      console.warn('API error deleting image:', err);
      toast.error('Failed to delete image');
    }
  };

  const handleClearDataset = async (studentId) => {
    try {
      await api.delete(`/face/dataset/${studentId}`);
      toast.success('Student face print database cleared');
      setDatasets(prev => prev.filter(d => d.studentId !== studentId));
      if (selectedStudent?.studentId === studentId) setSelectedStudent(null);
    } catch (err) {
      console.warn('API error clearing dataset:', err);
      toast.error('Failed to clear student dataset');
    }
  };

  const filteredDatasets = datasets.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.rollNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text)]">Face Biometrics Dataset</h1>
          <p className="text-sm text-[var(--text-muted)]">Audit facial capture logs and retrain recognition models</p>
        </div>
        <button
          className="btn-primary"
          onClick={handleRetrain}
          disabled={training}
        >
          <FiCpu className={training ? 'animate-spin' : ''} />
          {training ? 'Model Training...' : 'Retrain AI Classifier'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Student List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
            <input
              type="text"
              className="input-field pl-10"
              placeholder="Search by student name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-6"><LoadingSpinner /></div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {filteredDatasets.map(item => (
                <div
                  key={item.studentId}
                  onClick={() => setSelectedStudent(item)}
                  className={`p-4 rounded-2xl cursor-pointer border transition-all ${
                    selectedStudent?.studentId === item.studentId
                      ? 'border-indigo-400 bg-[rgba(99,102,241,0.08)]'
                      : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-[var(--text)]">{item.name}</h4>
                      <p className="text-xs text-[var(--text-subtle)] font-bold">{item.rollNumber}</p>
                    </div>
                    <span className="badge badge-success">
                      {item.imagesCount} images
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-3 text-xs text-[var(--text-muted)]">
                    <FiCheckCircle className="text-emerald-400" />
                    <span>Active classification profile</span>
                  </div>
                </div>
              ))}
              {filteredDatasets.length === 0 && (
                <p className="text-sm text-center text-[var(--text-muted)] py-6">No face datasets found.</p>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Face print gallery */}
        <div className="lg:col-span-2">
          {selectedStudent ? (
            <div className="glass-card rounded-3xl p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-[var(--border)] pb-4">
                <div>
                  <h3 className="text-lg font-black text-[var(--text)]">
                    {selectedStudent.name}'s Facial Dataset
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Last retrained / registered: <strong className="text-[var(--text)]">{selectedStudent.lastUpdated}</strong>
                  </p>
                </div>
                <button
                  className="btn-ghost text-red-400 hover:text-red-500 hover:bg-red-50"
                  onClick={() => handleClearDataset(selectedStudent.studentId)}
                >
                  <FiTrash2 /> Purge Biometrics
                </button>
              </div>

              {/* Gallery grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {selectedStudent.images.map((img, idx) => (
                  <div key={idx} className="relative rounded-xl overflow-hidden aspect-square border border-[var(--border)] group">
                    <img src={img} alt={`face-${idx}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDeleteImage(selectedStudent.studentId, idx)}
                        className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                        title="Delete image reference"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl flex gap-3" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                <FiInfo className="text-indigo-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-[var(--text-muted)] leading-relaxed">
                  <p className="font-semibold text-indigo-400">Deep Neural Network Classification</p>
                  <p className="mt-0.5">We store 10 high-resolution crops captured from multiple camera angles. If facial recognition performance drops for this student, we recommend purging biometrics and initiating a fresh capture sequence.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-3xl p-12 text-center h-full flex flex-col items-center justify-center">
              <FiCpu className="text-5xl text-[var(--text-subtle)] mb-3 animate-pulse" />
              <h3 className="font-bold text-lg text-[var(--text)]">Biometric Inspector</h3>
              <p className="text-sm text-[var(--text-muted)] mt-1 max-w-sm">Select a student from the sidebar directory to view, delete, or inspect their raw facial dataset nodes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FaceDatasets;
