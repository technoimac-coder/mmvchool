'use client';

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

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
  const [expandedDateKey, setExpandedDateKey] = useState<string | null>(null);
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
  const expandedEntries = expandedDateKey ? entries.filter(entry => entry.startDate <= expandedDateKey && entry.endDate >= expandedDateKey) : [];

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
                {dayEntries.length > 3 && <button type="button" onClick={() => setExpandedDateKey(dateKey)} className="block min-h-5 w-full rounded px-1 text-left text-[8px] font-bold text-blue-300 hover:bg-white/10 sm:text-[10px]">ดูเพิ่มเติม +{dayEntries.length - 3}</button>}
              </div>
            </div>
          );
        })}
      </div>
      {expandedDateKey && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/75 p-3" role="dialog" aria-modal="true" aria-label={`รายการทั้งหมดวันที่ ${expandedDateKey}`}>
        <div className="max-h-[88dvh] w-full max-w-lg overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b p-4"><div><h3 className="font-extrabold">รายการทั้งหมด {expandedEntries.length} คน</h3><p className="text-xs text-slate-500">วันที่ {new Date(`${expandedDateKey}T00:00:00`).toLocaleDateString('th-TH', { dateStyle: 'long' })}</p></div><button type="button" onClick={() => setExpandedDateKey(null)} aria-label="ปิดรายการทั้งหมด" className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border"><X className="h-5 w-5" /></button></div>
          <div className="max-h-[calc(88dvh-5rem)] space-y-2 overflow-y-auto p-4">
            {expandedEntries.map((entry, index) => <button type="button" key={`${entry.id}-${index}`} onClick={() => { setExpandedDateKey(null); entry.onClick?.(); }} className="block w-full rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50"><span className={`mr-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-bold text-white ${entry.colorClass || accentClass}`}>{index + 1}</span><span className="font-bold">{entry.label}</span>{entry.subtitle && <span className="mt-1 block pl-8 text-xs text-slate-500">{entry.subtitle}</span>}</button>)}
          </div>
        </div>
      </div>}
    </div>
  );
};
