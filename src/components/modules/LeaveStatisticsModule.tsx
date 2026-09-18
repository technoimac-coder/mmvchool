'use client';

import React, { useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Clock, FileText, Printer, RotateCcw, Search, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AcademicPeriodFilterBar, useAcademicPeriodRecords } from '../AcademicPeriodFilter';
import { canViewLeaveSummary } from '../../config/approvalWorkflow';

type StaffLeaveSummary = {
  userId: string;
  userName: string;
  department: string;
  requestCount: number;
  approvedCount: number;
  approvedDays: number;
  pendingCount: number;
  sickCount: number;
  sickDays: number;
  personalCount: number;
  personalDays: number;
  maternityCount: number;
  maternityDays: number;
  otherCount: number;
  otherDays: number;
};

const formatReportDate = (value: string) => {
  if (!value) return '-';
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(year, month - 1, day));
};

export const LeaveStatisticsModule: React.FC = () => {
  const { currentUser, users, leaveRequests: allLeaveRequests, pipelinesConfig } = useApp();
  const periodFilter = useAcademicPeriodRecords(allLeaveRequests);
  const [search, setSearch] = useState('');
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');

  const canViewAllLeaveRecords = canViewLeaveSummary(pipelinesConfig, currentUser);
  const visibleLeaveRequests = useMemo(() => canViewAllLeaveRecords
    ? periodFilter.records
    : periodFilter.records.filter(request => request.userId === currentUser.id),
  [canViewAllLeaveRecords, currentUser.id, periodFilter.records]);

  const hasInvalidDateRange = Boolean(reportStartDate && reportEndDate && reportStartDate > reportEndDate);
  const reportLeaveRequests = useMemo(() => {
    if (hasInvalidDateRange) return [];
    return visibleLeaveRequests.filter(request =>
      (!reportStartDate || request.endDate >= reportStartDate)
      && (!reportEndDate || request.startDate <= reportEndDate)
    );
  }, [hasInvalidDateRange, reportEndDate, reportStartDate, visibleLeaveRequests]);

  const leaveStatistics = useMemo(() => {
    const summaries = new Map<string, StaffLeaveSummary>();
    const createEmptySummary = (userId: string, userName: string, department: string): StaffLeaveSummary => ({
      userId,
      userName,
      department,
      requestCount: 0,
      approvedCount: 0,
      approvedDays: 0,
      pendingCount: 0,
      sickCount: 0,
      sickDays: 0,
      personalCount: 0,
      personalDays: 0,
      maternityCount: 0,
      maternityDays: 0,
      otherCount: 0,
      otherDays: 0,
    });

    if (canViewAllLeaveRecords) {
      users
        .filter(user => user.status !== 'inactive')
        .forEach(user => summaries.set(user.id, createEmptySummary(user.id, user.name, user.department)));
    } else {
      summaries.set(currentUser.id, createEmptySummary(currentUser.id, currentUser.name, currentUser.department));
    }

    reportLeaveRequests.forEach(request => {
      const key = request.userId || request.userName;
      const summary = summaries.get(key) ?? createEmptySummary(request.userId, request.userName, request.department);
      summary.requestCount += 1;
      if (request.status === 'pending') summary.pendingCount += 1;
      if (request.status === 'approved') {
        const days = Number(request.totalDays) || 0;
        summary.approvedCount += 1;
        summary.approvedDays += days;
        if (request.leaveType === 'sick') {
          summary.sickCount += 1;
          summary.sickDays += days;
        } else if (request.leaveType === 'personal') {
          summary.personalCount += 1;
          summary.personalDays += days;
        } else if (request.leaveType === 'maternity') {
          summary.maternityCount += 1;
          summary.maternityDays += days;
        } else {
          summary.otherCount += 1;
          summary.otherDays += days;
        }
      }
      summaries.set(key, summary);
    });

    return Array.from(summaries.values());
  }, [canViewAllLeaveRecords, currentUser.department, currentUser.id, currentUser.name, reportLeaveRequests, users]);

  const filteredStatistics = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('th');
    if (!keyword) return leaveStatistics;
    return leaveStatistics.filter(item =>
      `${item.userName} ${item.department}`.toLocaleLowerCase('th').includes(keyword)
    );
  }, [leaveStatistics, search]);

  const totals = useMemo(() => leaveStatistics.reduce((result, item) => ({
    requestCount: result.requestCount + item.requestCount,
    approvedDays: result.approvedDays + item.approvedDays,
    pendingCount: result.pendingCount + item.pendingCount,
  }), { requestCount: 0, approvedDays: 0, pendingCount: 0 }), [leaveStatistics]);

  return (
    <div className="space-y-6">
      <AcademicPeriodFilterBar {...periodFilter} />
      <div className="flex flex-col justify-between gap-4 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white shadow-xl md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15"><BarChart3 className="h-6 w-6" /></div>
          <div>
            <h2 className="text-xl font-bold">สรุปการลา</h2>
            <p className="mt-1 text-xs text-emerald-100 sm:text-sm">รายงานสถิติการลาของบุคลากร แยกตามประเภทและช่วงเวลาที่เลือก</p>
          </div>
        </div>
      </div>

      <section id="leave-statistics-report" className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-xs">
        <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 sm:p-5">
          <div className="max-w-2xl">
            <h3 className="font-bold text-slate-900">สรุปสถิติการลาของบุคลากร</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              ภาคเรียนที่ {periodFilter.semester} ปีการศึกษา {periodFilter.academicYear}
              {reportStartDate || reportEndDate ? ` · ช่วง ${reportStartDate ? formatReportDate(reportStartDate) : 'วันแรก'} ถึง ${reportEndDate ? formatReportDate(reportEndDate) : 'วันสุดท้าย'}` : ''}
              {' · '}จำนวนวันคิดจากรายการที่อนุมัติแล้ว
            </p>
          </div>
          <div className="leave-statistics-actions mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
            <div className="rounded-2xl border border-emerald-100 bg-white/80 p-3 shadow-xs">
              <div className="mb-2 text-xs font-bold text-emerald-900">เลือกช่วงวันที่รายงาน</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600">
                ตั้งแต่วันที่
                <input type="date" value={reportStartDate} onChange={event => setReportStartDate(event.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm outline-hidden transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                ถึงวันที่
                <input type="date" value={reportEndDate} onChange={event => setReportEndDate(event.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm outline-hidden transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              </label>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-white/80 p-3 shadow-xs">
              <label className="block text-xs font-semibold text-slate-600">
                ค้นหาบุคลากร
                <span className="relative mt-1 block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={event => setSearch(event.target.value)} placeholder="ค้นหาชื่อหรือกลุ่มงาน" className="min-h-11 w-full rounded-xl border border-emerald-200 bg-white py-2 pl-9 pr-3 text-sm outline-hidden transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                </span>
              </label>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(reportStartDate || reportEndDate) ? (
                <button type="button" onClick={() => { setReportStartDate(''); setReportEndDate(''); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                  <RotateCcw className="h-4 w-4" /> ล้างช่วงเวลา
                </button>
              ) : <div className="hidden sm:block" />}
              <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100">
                <Printer className="h-4 w-4" /> พิมพ์สรุปการลา
              </button>
              </div>
            </div>
          </div>
        </div>

        {hasInvalidDateRange && (
          <div className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-xs font-semibold text-rose-700">
            วันที่เริ่มต้นต้องไม่อยู่หลังวันที่สิ้นสุด กรุณาเลือกช่วงเวลาใหม่
          </div>
        )}

        <div className="leave-statistics-summary-grid grid grid-cols-2 gap-2 p-3 sm:gap-3 sm:p-4 lg:grid-cols-4">
          {[
            { label: 'บุคลากรที่มีรายการ', value: leaveStatistics.length, suffix: 'คน', tone: 'bg-sky-50 text-sky-800', icon: <Users className="h-4 w-4" /> },
            { label: 'คำขอทั้งหมด', value: totals.requestCount, suffix: 'รายการ', tone: 'bg-indigo-50 text-indigo-800', icon: <FileText className="h-4 w-4" /> },
            { label: 'อนุมัติแล้ว', value: totals.approvedDays, suffix: 'วัน', tone: 'bg-emerald-50 text-emerald-800', icon: <CheckCircle2 className="h-4 w-4" /> },
            { label: 'รอดำเนินการ', value: totals.pendingCount, suffix: 'รายการ', tone: 'bg-amber-50 text-amber-800', icon: <Clock className="h-4 w-4" /> },
          ].map(card => (
            <div key={card.label} className={`leave-statistics-summary-card min-w-0 rounded-xl p-3 sm:rounded-2xl sm:p-4 ${card.tone}`}>
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold leading-4 sm:mb-2 sm:gap-2 sm:text-xs">{card.icon}<span className="min-w-0">{card.label}</span></div>
              <div className="text-xl font-black sm:text-2xl">{card.value.toLocaleString('th-TH')} <span className="text-[11px] font-semibold sm:text-xs">{card.suffix}</span></div>
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t border-slate-100 p-3 sm:space-y-3 sm:p-4 md:hidden">
          {filteredStatistics.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-xs text-slate-400">ไม่พบข้อมูลสถิติในรอบที่เลือก</div>
          ) : filteredStatistics.map(item => (
            <article key={item.userId} className="rounded-xl border border-slate-100 bg-white p-3 shadow-xs sm:rounded-2xl sm:p-4">
              <div className="text-sm font-bold text-slate-800 sm:text-base">{item.userName}</div>
              <div className="text-[11px] text-slate-400">{item.department || '-'}</div>
              <div className="leave-statistics-type-grid mt-2 grid grid-cols-2 gap-1.5 text-[11px] sm:mt-3 sm:gap-2 sm:text-xs">
                <div className="rounded-xl bg-slate-50 p-2"><span className="text-slate-400">ลากิจ</span><div className="mt-1 font-bold">{item.personalCount} ครั้ง / {item.personalDays} วัน</div></div>
                <div className="rounded-xl bg-amber-50 p-2"><span className="text-amber-700">ลาป่วย</span><div className="mt-1 font-bold">{item.sickCount} ครั้ง / {item.sickDays} วัน</div></div>
                <div className="rounded-xl bg-slate-50 p-2"><span className="text-slate-400">ลาคลอด</span><div className="mt-1 font-bold">{item.maternityCount} ครั้ง / {item.maternityDays} วัน</div></div>
                <div className="rounded-xl bg-amber-50 p-2"><span className="text-amber-700">ลาอื่น ๆ</span><div className="mt-1 font-bold">{item.otherCount} ครั้ง / {item.otherDays} วัน</div></div>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-[11px] text-slate-600 sm:mt-3 sm:gap-x-4 sm:pt-3 sm:text-xs">
                <span>รวมอนุมัติ <strong className="text-emerald-700">{item.approvedCount} ครั้ง / {item.approvedDays} วัน</strong></span>
                <span>ทั้งหมด <strong>{item.requestCount} รายการ</strong></span>
                <span>รอดำเนินการ <strong className="text-amber-700">{item.pendingCount}</strong></span>
              </div>
            </article>
          ))}
        </div>

        <div className="leave-statistics-table hidden overflow-x-auto border-t border-slate-100 md:block">
          <table className="w-full min-w-[900px] border-collapse text-left text-xs text-slate-700">
            <thead className="bg-slate-50 font-semibold text-slate-800">
              <tr>
                <th rowSpan={2} className="w-12 border border-slate-300 px-2 py-3 text-center">ที่</th>
                <th rowSpan={2} className="min-w-[230px] border border-slate-300 px-4 py-3 text-center">ชื่อ - สกุล / กลุ่มงาน</th>
                <th colSpan={2} className="border border-slate-300 px-2 py-2 text-center">ลากิจ</th>
                <th colSpan={2} className="border border-amber-200 bg-amber-50 px-2 py-2 text-center">ลาป่วย</th>
                <th colSpan={2} className="border border-slate-300 px-2 py-2 text-center">ลาคลอด</th>
                <th colSpan={2} className="border border-amber-200 bg-amber-50 px-2 py-2 text-center">ลาอื่น ๆ</th>
                <th colSpan={2} className="border border-sky-200 bg-sky-50 px-2 py-2 text-center">รวมทั้งหมด</th>
              </tr>
              <tr>
                {['ครั้ง', 'วัน', 'ครั้ง', 'วัน', 'ครั้ง', 'วัน', 'ครั้ง', 'วัน', 'ครั้ง', 'วัน'].map((label, index) => (
                  <th key={`${label}-${index}`} className={`w-14 border px-2 py-2 text-center ${index === 2 || index === 3 || index === 6 || index === 7 ? 'border-amber-200 bg-amber-50' : index >= 8 ? 'border-sky-200 bg-sky-50' : 'border-slate-300'}`}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStatistics.length === 0 ? <tr><td colSpan={12} className="border border-slate-300 px-4 py-8 text-center text-slate-400">ไม่พบข้อมูลสถิติในรอบที่เลือก</td></tr> : filteredStatistics.map((item, index) => (
                <tr key={item.userId} className="hover:bg-emerald-50/40">
                  <td className="border border-slate-300 px-2 py-3 text-center">{index + 1}</td>
                  <td className="border border-slate-300 px-4 py-3"><div className="font-bold text-slate-800">{item.userName}</div><div className="text-[11px] text-slate-400">{item.department || '-'}</div></td>
                  <td className="border border-slate-300 px-2 py-3 text-center">{item.personalCount}</td><td className="border border-slate-300 px-2 py-3 text-center">{item.personalDays}</td>
                  <td className="border border-amber-200 bg-amber-50/60 px-2 py-3 text-center">{item.sickCount}</td><td className="border border-amber-200 bg-amber-50/60 px-2 py-3 text-center">{item.sickDays}</td>
                  <td className="border border-slate-300 px-2 py-3 text-center">{item.maternityCount}</td><td className="border border-slate-300 px-2 py-3 text-center">{item.maternityDays}</td>
                  <td className="border border-amber-200 bg-amber-50/60 px-2 py-3 text-center">{item.otherCount}</td><td className="border border-amber-200 bg-amber-50/60 px-2 py-3 text-center">{item.otherDays}</td>
                  <td className="border border-sky-200 bg-sky-50/70 px-2 py-3 text-center font-bold">{item.approvedCount}</td><td className="border border-sky-200 bg-sky-50/70 px-2 py-3 text-center font-black text-emerald-700">{item.approvedDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400">ข้อมูลอัปเดตจากรายการใบลาในระบบตามปีการศึกษาและภาคเรียนที่เลือก</div>
      </section>

      <style>{`
      @media (max-width: 767px) {
        #leave-statistics-report .leave-statistics-summary-grid,
        #leave-statistics-report .leave-statistics-type-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
        #leave-statistics-report .leave-statistics-summary-card {
          min-height: 88px;
        }
      }
      @media print {
        @page { size: A4 landscape; margin: 10mm; }
        body * { visibility: hidden !important; }
        #leave-statistics-report .leave-statistics-table,
        #leave-statistics-report .leave-statistics-table * { visibility: visible !important; }
        #leave-statistics-report .leave-statistics-table {
          display: block !important;
          position: absolute;
          inset: 0;
          width: 100%;
          overflow: visible !important;
          border: 0;
        }
        #leave-statistics-report .leave-statistics-table table {
          width: 100% !important;
          min-width: 0 !important;
          font-size: 9px !important;
        }
        #leave-statistics-report .leave-statistics-table th,
        #leave-statistics-report .leave-statistics-table td { padding: 8px 6px !important; }
      }`}</style>
    </div>
  );
};
