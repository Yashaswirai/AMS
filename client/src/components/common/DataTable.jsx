import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronUp, FiChevronDown, FiSearch } from 'react-icons/fi';

function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No data found',
  actions,
  searchable = false,
  onSearch,
  searchPlaceholder = 'Search...',
  rowKey = 'id',
}) {
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [localSearch, setLocalSearch] = useState('');

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  let displayData = [...data];
  if (sortField) {
    displayData.sort((a, b) => {
      const av = a[sortField], bv = b[sortField];
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const skeletonRows = Array(5).fill(null);

  return (
    <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      {searchable && (
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="relative max-w-xs">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-subtle)' }} />
            <input
              type="text"
              className="input-field pl-9 text-sm"
              placeholder={searchPlaceholder}
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                onSearch?.(e.target.value);
              }}
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  style={{ cursor: col.sortable ? 'pointer' : 'default' }}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <span className="flex flex-col" style={{ color: 'var(--text-subtle)' }}>
                        <FiChevronUp size={10} style={{ opacity: sortField === col.key && sortDir === 'asc' ? 1 : 0.3 }} />
                        <FiChevronDown size={10} style={{ opacity: sortField === col.key && sortDir === 'desc' ? 1 : 0.3 }} />
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {actions && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {loading ? skeletonRows.map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key}><div className="skeleton h-4 rounded" style={{ width: `${Math.random() * 40 + 60}%` }} /></td>
                  ))}
                  {actions && <td><div className="skeleton h-4 w-16 rounded" /></td>}
                </tr>
              )) : displayData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-12">
                    <p style={{ color: 'var(--text-muted)' }}>{emptyMessage}</p>
                  </td>
                </tr>
              ) : displayData.map((row, i) => (
                <motion.tr
                  key={row[rowKey] || i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                    </td>
                  ))}
                  {actions && <td>{actions(row)}</td>}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
