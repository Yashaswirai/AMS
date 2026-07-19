import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiDownload, FiSearch, FiCalendar, FiBookOpen } from 'react-icons/fi';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import DataTable from '../../components/common/DataTable.jsx';

function Reports() {
  const [subjectsList, setSubjectsList] = useState([]);
  const [subject, setSubject] = useState('');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/subjects').then(res => {
      const raw = res.data?.data || res.data?.subjects || res.data || [];
      setSubjectsList(raw);
      if (raw.length > 0) setSubject(raw[0].code || raw[0]._id);
    }).catch(() => {});
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading('Calculating student attendance logs...');
    
    try {
      const res = await api.get(`/reports/generate?type=teacher&subject=${subject}&startDate=${startDate}&endDate=${endDate}`);
      const raw = res.data?.data || res.data?.records || res.data || [];
      setReportData(Array.isArray(raw) ? raw : []);
      toast.success('Roster compiled successfully', { id: toastId });
    } catch (err) {
      console.warn('API teacher report failed:', err);
      setReportData([]);
      toast.error('No matching records found in database', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    toast.success('Downloading CSV spreadsheet of class attendance...');
    // Create text stream and download
    const headers = 'Roll Number,Name,Present Lectures,Total Lectures,Attendance %\n';
    const rows = reportData.map(r => `${r.rollNumber},${r.name},${r.present},${r.total},${r.percentage}%`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AMS_Report_${subject}_${startDate}_to_${endDate}.csv`;
    a.click();
  };

  const columns = [
    { header: 'Roll Number', accessor: 'rollNumber', render: (val) => <span className="font-bold text-[var(--text)]">{val}</span> },
    { header: 'Student Name', accessor: 'name' },
    { header: 'Attended Lectures', accessor: 'present', render: (val, row) => `${val}/${row.total} classes` },
    {
      header: 'Term Percentage',
      accessor: 'percentage',
      render: (val) => (
        <span className={`font-semibold ${val < 75 ? 'text-red-500' : val < 85 ? 'text-amber-500' : 'text-emerald-500'}`}>
          {val}%
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[var(--text)]">Class Reports</h1>
        <p className="text-sm text-[var(--text-muted)]">Generate and download academic compliance logs for your assigned subjects</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Card */}
        <div className="lg:col-span-1 glass-card rounded-3xl p-6 h-fit space-y-4">
          <h3 className="font-bold text-[var(--text)] border-b border-[var(--border)] pb-3">Report Scope</h3>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[var(--text-subtle)]">Select Subject</label>
              <select className="input-field" value={subject} onChange={(e) => setSubject(e.target.value)}>
                {subjectsList.map(s => <option key={s._id || s.code} value={s.code || s._id}>{s.code ? `${s.code} - ${s.name}` : s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[var(--text-subtle)]">Start Date</label>
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
                <input type="date" className="input-field pl-10" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[var(--text-subtle)]">End Date</label>
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
                <input type="date" className="input-field pl-10" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full py-2.5 mt-2" disabled={loading}>
              Calculate Reports
            </button>
          </form>
        </div>

        {/* Preview grid */}
        <div className="lg:col-span-3">
          {reportData.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-3xl p-6 space-y-4"
            >
              <div className="flex justify-between items-center border-b border-[var(--border)] pb-4">
                <div>
                  <h3 className="font-bold text-[var(--text)]">Class Sheet Preview ({subject})</h3>
                  <p className="text-xs text-[var(--text-muted)]">Calculated from logs between {startDate} and {endDate}</p>
                </div>
                <button className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5" onClick={handleDownload}>
                  <FiDownload /> Download CSV
                </button>
              </div>

              <DataTable columns={columns} data={reportData} />
            </motion.div>
          ) : (
            <div className="glass-card rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[350px]">
              <FiBookOpen className="text-5xl text-[var(--text-subtle)] mb-3" />
              <h3 className="font-bold text-lg text-[var(--text)]">Report Generation Board</h3>
              <p className="text-sm text-[var(--text-muted)] mt-1 max-w-sm">Click "Calculate Reports" on the left dashboard configurations to aggregate classroom check-in statistics.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Reports;
