import React from 'react';

const STATUS_CONFIG = {
  present: { label: 'Present', className: 'badge-success' },
  absent: { label: 'Absent', className: 'badge-danger' },
  late: { label: 'Late', className: 'badge-warning' },
  holiday: { label: 'Holiday', className: 'badge-neutral' },
  leave: { label: 'On Leave', className: 'badge-info' },
  excused: { label: 'Excused', className: 'badge-secondary' },
};

function AttendanceStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, className: 'badge-neutral' };
  return <span className={`badge ${cfg.className}`}>{cfg.label}</span>;
}

export default AttendanceStatusBadge;
