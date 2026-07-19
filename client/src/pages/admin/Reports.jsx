import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiDownload, FiFilter, FiFileText, FiCalendar, FiBookOpen } from 'react-icons/fi';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import DataTable from '../../components/common/DataTable.jsx';

function Reports() {
  const [coursesList, setCoursesList] = useState([]);
  const [reportType, setReportType] = useState('summary');
  const [course, setCourse] = useState('');
  const [semester, setSemester] = useState('');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [format, setFormat] = useState('pdf');
  const [previewData, setPreviewData] = useState([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    api.get('/courses').then(res => {
      const raw = res.data?.data || res.data?.courses || res.data || [];
      setCoursesList(raw);
    }).catch(() => {});
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    const toastId = toast.loading('Querying attendance records...');
    
    try {
      const res = await api.get(`/reports/generate?type=${reportType}&course=${course}&startDate=${startDate}&endDate=${endDate}`);
      const data = res.data?.data || res.data?.records || res.data || [];
      setPreviewData(Array.isArray(data) ? data : []);
      toast.success('Report data compiled!', { id: toastId });
    } catch (err) {
      console.warn('API report generation failed:', err);
      setPreviewData([]);
      toast.error('No matching records found in database', { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    const toastId = toast.loading(`Compiling export for ${format.toUpperCase()} format…`);
    try {
      const res = await api.get(`/reports/download?format=${format}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `AMS_Report_${reportType}_${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      toast.success('Downloaded report successfully!', { id: toastId });
    } catch (err) {
      console.warn('API download fail, simulating file download locally:', err);
      await new Promise(r => setTimeout(r, 1500));
      
      // local mock download trigger
      const mockContent = JSON.stringify(previewData, null, 2);
      const blob = new Blob([mockContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AMS_Report_${reportType}_${startDate}_to_${endDate}.${format}`;
      a.click();
      toast.success(`Mock ${format.toUpperCase()} export downloaded!`, { id: toastId });
    }
  };

  const columns = [
    { header: 'Student Roll No.', accessor: 'rollNumber', render: (val) => <span className="font-bold text-[var(--text)]">{val}</span> },
    { header: 'Student Name', accessor: 'name' },
    { header: 'Course Enrolled', accessor: 'course' },
    { header: 'Classes Attended', accessor: 'presentDays', render: (val, row) => `${val}/${row.totalDays}` },
    {
      header: 'Attendance %',
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
        <h1 className="text-2xl font-black text-[var(--text)]">Academic Report Portal</h1>
        <p className="text-sm text-[var(--text-muted)]">Generate compliance sheets, export rosters, and track low attendance trends</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Card */}
        <div className="lg:col-span-1 glass-card rounded-3xl p-6 h-fit space-y-4">
          <h3 className="font-bold flex items-center gap-2 border-b border-[var(--border)] pb-3 text-[var(--text)]">
            <FiFilter className="text-indigo-400" /> Filter Criteria
          </h3>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[var(--text-subtle)]">Report Type</label>
              <select className="input-field" value={reportType} onChange={(e) => setReportType(e.target.value)}>
                <option value="summary">Overall Term Summary</option>
                <option value="atrisk">Low Attendance (&lt;75%) Alert</option>
                <option value="subject">Subject Specific Roster</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[var(--text-subtle)]">Filter Course</label>
              <select className="input-field" value={course} onChange={(e) => setCourse(e.target.value)}>
                <option value="">All Courses</option>
                {coursesList.map(c => (
                  <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[var(--text-subtle)]">Academic Semester</label>
              <select className="input-field" value={semester} onChange={(e) => setSemester(e.target.value)}>
                <option value="">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
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

            <button type="submit" className="btn-primary w-full py-2.5 mt-2" disabled={generating}>
              {generating ? 'Processing records…' : 'Compile Report Preview'}
            </button>
          </form>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-3 space-y-4">
          {previewData.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-3xl p-6 space-y-4"
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-[var(--border)] pb-4">
                <div>
                  <h3 className="font-black text-lg text-[var(--text)]">Compiled Query Preview</h3>
                  <p className="text-xs text-[var(--text-muted)]">Includes database matched records for dates: {startDate} to {endDate}</p>
                </div>
                
                {/* Download Selector */}
                <div className="flex items-center gap-2">
                  <select className="input-field text-xs py-1.5 h-auto w-24" value={format} onChange={(e) => setFormat(e.target.value)}>
                    <option value="pdf">PDF File</option>
                    <option value="xlsx">Excel Sheet</option>
                    <option value="csv">CSV Sheet</option>
                  </select>
                  <button className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5" onClick={handleDownload}>
                    <FiDownload /> Export
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto rounded-xl">
                <DataTable columns={columns} data={previewData} />
              </div>
            </motion.div>
          ) : (
            <div className="glass-card rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
              <FiFileText className="text-5xl text-[var(--text-subtle)] mb-3 animate-pulse" />
              <h3 className="font-bold text-lg text-[var(--text)]">Data Compilation Grid</h3>
              <p className="text-sm text-[var(--text-muted)] mt-1 max-w-sm">Configure report parameters in the left panel and click "Compile Report" to fetch corresponding student roster sheets.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Reports;
