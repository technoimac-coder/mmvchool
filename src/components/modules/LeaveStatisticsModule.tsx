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
  approvedDays: number;
  pendingCount: number;
  sickDays: number;
  personalDays: number;
  maternityDays: number;
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
  const { currentUser, leaveRequests: allLeaveRequests, pipelinesConfig } = useApp();
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
    reportLeaveRequests.forEach(request => {
      const key = request.userId || request.userName;
      const summary = summaries.get(key) ?? {
        userId: request.userId,
        userName: request.userName,
        department: request.department,
        requestCount: 0,
        approvedDays: 0,
        pendingCount: 0,
        sickDays: 0,
        personalDays: 0,
        maternityDays: 0,
        otherDays: 0,
      };
      summary.requestCount += 1;
      if (request.status === 'pending') summary.pendingCount += 1;
      if (request.status === 'approved') {
        const days = Number(request.totalDays) || 0;
        summary.approvedDays += days;
        if (request.leaveType === 'sick') summary.sickDays += days;
        else if (request.leaveType === 'personal') summary.personalDays += days;
        else if (request.leaveType === 'maternity') summary.maternityDays += days;
        else summary.otherDays += days;
      }
      summaries.set(key, summary);
    });

    if (!canViewAllLeaveRecords && !summaries.has(currentUser.id)) {
      summaries.set(currentUser.id, {
        userId: currentUser.id,
        userName: currentUser.name,
        department: currentUser.department,
        requestCount: 0,
        approvedDays: 0,
        pendingCount: 0,
        sickDays: 0,
        personalDays: 0,
        maternityDays: 0,
        otherDays: 0,
      });
    }

    return Array.from(summaries.values()).sort((a, b) =>
      b.approvedDays - a.approvedDays || a.userName.localeCompare(b.userName, 'th')
    );
  }, [canViewAllLeaveRecords, currentUser.department, currentUser.id, currentUser.name, reportLeaveRequests]);

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

        <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">
          {[
            { label: 'บุคลากรที่มีรายการ', value: leaveStatistics.length, suffix: 'คน', tone: 'bg-sky-50 text-sky-800', icon: <Users className="h-4 w-4" /> },
            { label: 'คำขอทั้งหมด', value: totals.requestCount, suffix: 'รายการ', tone: 'bg-indigo-50 text-indigo-800', icon: <FileText className="h-4 w-4" /> },
            { label: 'อนุมัติแล้ว', value: totals.approvedDays, suffix: 'วัน', tone: 'bg-emerald-50 text-emerald-800', icon: <CheckCircle2 className="h-4 w-4" /> },
            { label: 'รอดำเนินการ', value: totals.pendingCount, suffix: 'รายการ', tone: 'bg-amber-50 text-amber-800', icon: <Clock className="h-4 w-4" /> },
          ].map(card => (
            <div key={card.label} className={`rounded-2xl p-4 ${card.tone}`}>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold">{card.icon}{card.label}</div>
              <div className="text-2xl font-black">{card.value.toLocaleString('th-TH')} <span className="text-xs font-semibold">{card.suffix}</span></div>
            </div>
          ))}
        </div>

        <div className="space-y-3 border-t border-slate-100 p-4 md:hidden">
          {filteredStatistics.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-xs text-slate-400">ไม่พบข้อมูลสถิติในรอบที่เลือก</div>
          ) : filteredStatistics.map(item => (
            <article key={item.userId} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
              <div className="font-bold text-slate-800">{item.userName}</div>
              <div className="text-[11px] text-slate-400">{item.department || '-'}</div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-slate-50 p-2"><span className="text-slate-400">ลาป่วย</span><div className="mt-1 font-bold">{item.sickDays} วัน</div></div>
                <div className="rounded-xl bg-slate-50 p-2"><span className="text-slate-400">ลากิจ</span><div className="mt-1 font-bold">{item.personalDays} วัน</div></div>
                <div className="rounded-xl bg-slate-50 p-2"><span className="text-slate-400">ลาคลอด</span><div className="mt-1 font-bold">{item.maternityDays} วัน</div></div>
                <div className="rounded-xl bg-slate-50 p-2"><span className="text-slate-400">ลาอื่น ๆ</span><div className="mt-1 font-bold">{item.otherDays} วัน</div></div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
                <span>รวมอนุมัติ <strong className="text-emerald-700">{item.approvedDays} วัน</strong></span>
                <span>ทั้งหมด <strong>{item.requestCount} รายการ</strong></span>
                <span>รอดำเนินการ <strong className="text-amber-700">{item.pendingCount}</strong></span>
              </div>
            </article>
          ))}
        </div>

        <div className="hidden overflow-x-auto border-t border-slate-100 md:block">
          <table className="w-full min-w-[820px] text-left text-xs text-slate-600">
            <thead className="bg-slate-50 font-semibold text-slate-700"><tr>
              <th className="px-4 py-3">บุคลากร / กลุ่มงาน</th><th className="px-3 py-3 text-center">ลาป่วย</th><th className="px-3 py-3 text-center">ลากิจ</th><th className="px-3 py-3 text-center">ลาคลอด</th><th className="px-3 py-3 text-center">ลาอื่น ๆ</th><th className="px-3 py-3 text-center">รวมวันอนุมัติ</th><th className="px-3 py-3 text-center">คำขอทั้งหมด</th><th className="px-3 py-3 text-center">รอดำเนินการ</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStatistics.length === 0 ? <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">ไม่พบข้อมูลสถิติในรอบที่เลือก</td></tr> : filteredStatistics.map(item => (
                <tr key={item.userId} className="hover:bg-emerald-50/40">
                  <td className="px-4 py-3"><div className="font-bold text-slate-800">{item.userName}</div><div className="text-[11px] text-slate-400">{item.department || '-'}</div></td>
                  <td className="px-3 py-3 text-center">{item.sickDays}</td><td className="px-3 py-3 text-center">{item.personalDays}</td><td className="px-3 py-3 text-center">{item.maternityDays}</td><td className="px-3 py-3 text-center">{item.otherDays}</td><td className="px-3 py-3 text-center font-black text-emerald-700">{item.approvedDays}</td><td className="px-3 py-3 text-center">{item.requestCount}</td><td className="px-3 py-3 text-center"><span className={item.pendingCount > 0 ? 'rounded-full bg-amber-100 px-2 py-1 font-bold text-amber-800' : 'text-slate-400'}>{item.pendingCount}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400">ข้อมูลอัปเดตจากรายการใบลาในระบบตามปีการศึกษาและภาคเรียนที่เลือก</div>
      </section>

      <style>{`@media print {
        body * { visibility: hidden !important; }
        #leave-statistics-report, #leave-statistics-report * { visibility: visible !important; }
        #leave-statistics-report { position: absolute; inset: 0; width: 100%; border: 0; box-shadow: none; }
        #leave-statistics-report .leave-statistics-actions { display: none !important; }
      }`}</style>
    </div>
  );
};
