'use client';

import React, { useMemo, useState } from 'react';
import { Search, Check } from 'lucide-react';
import { User } from '../types';

interface SearchableTeacherSelectProps {
  users: User[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  excludeId?: string;
  required?: boolean;
}

export const SearchableTeacherSelect: React.FC<SearchableTeacherSelectProps> = ({
  users, value, onChange, placeholder = 'พิมพ์ชื่อครูเพื่อค้นหา...', excludeId, required
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const selected = users.find(user => user.id === value);
  const candidates = useMemo(() => users.filter(user =>
    user.id !== excludeId && ['teacher', 'head', 'academic_affairs'].includes(user.role)
  ), [users, excludeId]);
  const filtered = candidates.filter(user => {
    const text = `${user.name} ${user.position} ${user.department} ${user.id}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  }).slice(0, 8);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          required={required && !value}
          value={open ? query : (selected?.name || query)}
          onFocus={() => { setOpen(true); setQuery(''); }}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (value) onChange(''); }}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white outline-hidden font-medium"
        />
      </div>
      {open && (
        <>
          <button type="button" aria-label="ปิดรายการค้นหาครู" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-sm text-slate-500">ไม่พบรายชื่อที่ตรงกัน</div>
            ) : filtered.map(user => (
              <button type="button" key={user.id} onClick={() => { onChange(user.id); setQuery(''); setOpen(false); }} className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-blue-50">
                <span><span className="block font-bold text-slate-800">{user.name}</span><span className="block text-xs text-slate-500">{user.position} · {user.department}</span></span>
                {value === user.id && <Check className="w-4 h-4 text-blue-600" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
