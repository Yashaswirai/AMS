import React from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import useDebounce from '../../hooks/useDebounce.js';
import { useEffect, useState } from 'react';

function SearchInput({ value, onChange, placeholder = 'Search...', className = '' }) {
  const [local, setLocal] = useState(value || '');
  const debounced = useDebounce(local, 350);

  useEffect(() => { onChange(debounced); }, [debounced]);
  useEffect(() => { setLocal(value || ''); }, [value]);

  return (
    <div className={`relative ${className}`}>
      <FiSearch
        className="absolute left-3 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--text-subtle)', fontSize: '1rem' }}
      />
      <input
        type="text"
        className="input-field pl-10 pr-10"
        placeholder={placeholder}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
      />
      {local && (
        <button
          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center hover:bg-opacity-80 transition-colors"
          style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
          onClick={() => { setLocal(''); onChange(''); }}
        >
          <FiX size={10} />
        </button>
      )}
    </div>
  );
}

export default SearchInput;
