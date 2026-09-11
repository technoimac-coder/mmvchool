'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { useApp } from '../context/AppContext';

type PeriodRecord = { academicYear?: string; semester?: string };

export function useAcademicPeriodRecords<T extends PeriodRecord>(records: T[]) {
  const { academicPeriod } = useApp();
  const [academicYear, setAcademicYear] = useState(academicPeriod.academicYear);
  const [semester, setSemester] = useState<'1' | '2'>(academicPeriod.semester);

  useEffect(() => {
    setAcademicYear(academicPeriod.academicYear);
    setSemester(academicPeriod.semester);
  }, [academicPeriod.academicYear, academicPeriod.semester]);

  const years = useMemo(() => Array.from(new Set([
    academicPeriod.academicYear,
    ...records.map(record => record.academicYear).filter((year): year is string => Boolean(year)),
  ])).sort((a, b) => Number(b) - Number(a)), [academicPeriod.academicYear, records]);

  const filteredRecords = useMemo(() => records.filter(record =>
    (!record.academicYear || record.academicYear === academicYear) &&
    (!record.semester || record.semester === semester)
  ), [academicYear, records, semester]);

  return { records: filteredRecords, years, academicYear, semester, setAcademicYear, setSemester };
}

type AcademicPeriodFilterBarProps = ReturnType<typeof useAcademicPeriodRecords<PeriodRecord>>;

export const AcademicPeriodFilterBar: React.FC<AcademicPeriodFilterBarProps> = ({
  years, academicYear, semester, setAcademicYear, setSemester,
}) => (
  <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-xs">
    <div className="mr-1 flex items-center gap-2 font-bold text-indigo-900">
      <CalendarDays className="h-4 w-4" /> ข้อมูลภาคเรียน
    </div>
    <select value={semester} onChange={event => setSemester(event.target.value as '1' | '2')} className="rounded-xl border border-indigo-200 bg-white px-3 py-2 font-bold text-slate-700">
      <option value="1">ภาคเรียนที่ 1</option>
      <option value="2">ภาคเรียนที่ 2</option>
    </select>
    <select value={academicYear} onChange={event => setAcademicYear(event.target.value)} className="rounded-xl border border-indigo-200 bg-white px-3 py-2 font-bold text-slate-700">
      {years.map(year => <option key={year} value={year}>ปีการศึกษา {year}</option>)}
    </select>
    <span className="text-indigo-700">เปลี่ยนตัวเลือกเพื่อดูข้อมูลย้อนหลัง โดยข้อมูลเดิมไม่ถูกลบ</span>
  </div>
);
