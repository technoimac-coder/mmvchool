'use client';

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface MonthlyCalendarEntry {
  id: string;
  startDate: string;
  endDate: string;
  label: string;
  subtitle?: string;
  colorClass?: string;
  onClick?: () => void;
}

interface MonthlyRequestCalendarProps {
  entries: MonthlyCalendarEntry[];
  accentClass?: string;
}

const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const weekDays = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const toDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const MonthlyRequestCalendar: React.FC<MonthlyRequestCalendarProps> = ({ entries, accentClass = 'bg-blue-600' }) => {
  const [monthDate, setMonthDate] = useState(() => new Date());
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const gridStart = new Date(year, month, 1 - firstOfMonth.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });
  }, [year, month]);
  const todayKey = toDateKey(new Date());

  return (
    <div className="space-y-3 bg-slate-950 p-2.5 text-white sm:rounded-2xl sm:p-4">
      <div className="flex items-center justify-between gap-2 px-1">
        <button type="button" onClick={() => setMonthDate(new Date(year, month - 1, 1))} className="rounded-xl bg-white/10 p-2 hover:bg-white/20" aria-label="เดือนก่อนหน้า"><ChevronLeft className="h-4 w-4" /></button>
        <button type="button" onClick={() => setMonthDate(new Date())} className="min-w-0 text-center">
          <span className="block text-base font-extrabold sm:text-lg">{thaiMonths[month]} {year + 543}</span>
          <span className="text-[10px] text-slate-400">แตะเพื่อกลับเดือนปัจจุบัน</span>
        </button>
        <button type="button" onClick={() => setMonthDate(new Date(year, month + 1, 1))} className="rounded-xl bg-white/10 p-2 hover:bg-white/20" aria-label="เดือนถัดไป"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 sm:text-xs">
        {weekDays.map(day => <div key={day} className="py-1">{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map(date => {
          const dateKey = toDateKey(date);
          const isCurrentMonth = date.getMonth() === month;
          const isToday = dateKey === todayKey;
          const dayEntries = entries.filter(entry => entry.startDate <= dateKey && entry.endDate >= dateKey);
          return (
            <div key={dateKey} className={`min-h-[5.5rem] min-w-0 rounded-lg border p-1 sm:min-h-28 sm:p-1.5 ${isCurrentMonth ? 'border-slate-800 bg-slate-900' : 'border-slate-900 bg-slate-950 text-slate-600'}`}>
              <div className={`mb-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold sm:text-xs ${isToday ? 'bg-blue-200 text-blue-950' : ''}`}>{date.getDate()}</div>
              <div className="space-y-0.5">
                {dayEntries.slice(0, 3).map(entry => (
                  <button type="button" key={entry.id} onClick={entry.onClick} title={`${entry.label}${entry.subtitle ? ` · ${entry.subtitle}` : ''}`} className={`block w-full min-w-0 truncate rounded px-1 py-0.5 text-left text-[8px] font-bold leading-3 text-white sm:text-[10px] ${entry.colorClass || accentClass}`}>{entry.label}</button>
                ))}
                {dayEntries.length > 3 && <div className="px-1 text-[8px] font-bold text-slate-400">+{dayEntries.length - 3}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
