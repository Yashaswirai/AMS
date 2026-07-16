import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiDownload, FiFileText } from 'react-icons/fi';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import DataTable from '../../components/common/DataTable.jsx';

const MOCK_STUDENT_REPORT = [
  { subjectCode: 'CS-301', subjectName: 'Data Structures & Algorithms', present: 12, total: 13, percentage: 92.3 },
  { subjectCode: 'CS-302', subjectName: 'Database Management Systems', present: 11, total: 13, percentage: 84.6 },
  { subjectCode: 'CS-303', subjectName: 'Computer Networks', present: 10, total: 14, percentage: 71.4 },
  { subjectCode: 'CS-304', subjectName: 'Discrete Mathematics', present: 8, total: 9, percentage: 88.9 },
];

function StudentReports() {
  const [reportType, setReportType] = useState('summary');
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    const toastId = toast.loading('Compiling attendance file report...');
    try {
      await api.get(`/student/report/download?type=${reportType}`);
      toast.success('Report downloaded successfully!', { id: toastId });
    } catch (err) {
      console.warn('API error exporting student report, downloading local mock text file:', err);
      // Simulate file download
      await new Promise(r => setTimeout(r, 1200));
      
      const fileData = `AMS Attendance Report\n===================\nReport Type: ${reportType.toUpperCase()}\nGenerated On: ${new Date().toLocaleDateString()}\n\n` +
        MOCK_STUDENT_REPORT.map(r => `${r.subjectCode} - ${r.subjectName}: ${r.present}/${r.total} (${r.percentage}%)`).join('\n');
      
      const blob = new Blob([fileData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AMS_Student_Report_${reportType}.txt`;
      a.click();
      toast.success('Report downloaded successfully (local)!', { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  const columns = [
    { header: 'Subject Code', accessor: 'subjectCode', render: (val) => <span className="font-bold text-[var(--text)]">{val}</span> },
    { header: 'Subject Name', accessor: 'subjectName' },
    { header: 'Lectures Attended', accessor: 'present', render: (val, row) => `${val}/${row.total} classes` },
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
        <h1 className="text-2xl font-black text-[var(--text)]">Download Reports</h1>
        <p className="text-sm text-[var(--text-muted)]">Download custom attendance logs and summaries for your academic files</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Download Card */}
        <div className="lg:col-span-1 glass-card rounded-3xl p-6 h-fit space-y-4">
          <h3 className="font-bold text-[var(--text)] border-b border-[var(--border)] pb-3 flex items-center gap-2">
            <FiFileText className="text-indigo-400" /> Export Roster
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[var(--text-subtle)]">Report Format</label>
              <select className="input-field" value={reportType} onChange={(e) => setReportType(e.target.value)}>
                <option value="summary">Full Term Summary</option>
                <option value="critical">At-Risk Classes Only</option>
              </select>
            </div>

            <button
              onClick={handleDownload}
              className="btn-primary w-full py-2.5 flex justify-center items-center gap-2"
              disabled={downloading}
            >
              <FiDownload /> {downloading ? 'Downloading...' : 'Download Report'}
            </button>
          </div>
        </div>

        {/* Preview Card */}
        <div className="lg:col-span-2 glass-card rounded-3xl p-6 space-y-4">
          <h3 className="font-bold text-[var(--text)] border-b border-[var(--border)] pb-3">Term Roster Summary</h3>
          <DataTable columns={columns} data={MOCK_STUDENT_REPORT} />
        </div>
      </div>
    </div>
  );
}

export default StudentReports;
