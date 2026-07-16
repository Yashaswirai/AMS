import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

function Pagination({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) {
  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (totalPages <= 1) return null;

  const from = (currentPage - 1) * itemsPerPage + 1;
  const to = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Showing <span className="font-semibold">{from}</span>–<span className="font-semibold">{to}</span> of{' '}
        <span className="font-semibold">{totalItems}</span> results
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors hover:bg-indigo-500 hover:text-white"
          style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          <FiChevronLeft size={14} />
        </button>

        {start > 1 && (
          <>
            <button onClick={() => onPageChange(1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-colors hover:bg-indigo-500 hover:text-white" style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>1</button>
            {start > 2 && <span className="w-8 h-8 flex items-center justify-center text-xs" style={{ color: 'var(--text-subtle)' }}>…</span>}
          </>
        )}

        {pages.map(p => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all"
            style={p === currentPage
              ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }
              : { background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
            }
          >
            {p}
          </button>
        ))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="w-8 h-8 flex items-center justify-center text-xs" style={{ color: 'var(--text-subtle)' }}>…</span>}
            <button onClick={() => onPageChange(totalPages)} className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-colors hover:bg-indigo-500 hover:text-white" style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{totalPages}</button>
          </>
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors hover:bg-indigo-500 hover:text-white"
          style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          <FiChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

export default Pagination;
