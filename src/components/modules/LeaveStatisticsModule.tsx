'use client';

import React, { useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Clock, FileSpreadsheet, FileText, Printer, RotateCcw, Search, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AcademicPeriodFilterBar, useAcademicPeriodRecords } from '../AcademicPeriodFilter';
import { canViewLeaveSummary, getForeignLeaveReviewer } from '../../config/approvalWorkflow';
import { getPersonnelAcademicOrder } from '../../data/academicRankOrder';

type StaffLeaveSummary = {
  userId: string;
  userName: string;
  department: string;
  position: string;
  sourceOrder: number;
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

const getAcademicRankOrder = (position: string) => {
  const value = position.trim();
  if (value.startsWith('ผู้อำนวยการ')) return 0;
  if (value.startsWith('รองผู้อำนวยการ') && value.includes('ชำนาญการพิเศษ')) return 1;
  if (value.startsWith('รองผู้อำนวยการ')) return 2;
  if (value.includes('เชี่ยวชาญ')) return 3;
  if (value.includes('ชำนาญการพิเศษ')) return 4;
  if (value.includes('ชำนาญการ')) return 5;
  if (value === 'ครู') return 6;
  if (value.includes('ครูผู้ช่วย')) return 7;
  if (value.includes('พนักงานราชการ')) return 8;
  if (value.includes('พนักงานวิทยาศาสตร์')) return 9;
  if (value.includes('ครูอัตราจ้าง')) return 10;
  if (value.includes('สนับสนุนการสอน') || value.includes('Admin')) return 11;
  if (value.includes('ลูกจ้างประจำ')) return 12;
  if (value.includes('พนักงานขับรถ')) return 13;
  return 99;
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
  const [reportStatus, setReportStatus] = useState<'approved' | 'pending' | 'rejected' | 'all'>('approved');
  const [personnelType, setPersonnelType] = useState('all');
  const reportStatusLabel = reportStatus === 'approved' ? 'อนุมัติแล้ว' : reportStatus === 'pending' ? 'รอดำเนินการ' : reportStatus === 'rejected' ? 'ไม่อนุมัติ / ส่งกลับ' : 'ทุกสถานะ';
  const personnelTypeLabel = personnelType === 'all' ? 'บุคลากรทุกประเภท' : personnelType === 'ข้าราชการครู' ? 'ครู' : personnelType;

  const printLeaveSummary = async () => {
    try {
      await Promise.all([
        document.fonts.load('400 16pt "TH SarabunPSK"', 'ชื่อ สกุล'),
        document.fonts.load('700 16pt "TH SarabunPSK"', 'ชื่อ สกุล'),
      ]);
      await document.fonts.ready;
    } finally {
      window.print();
    }
  };

  const canViewAllLeaveRecords = canViewLeaveSummary(pipelinesConfig, currentUser);
  const foreignReviewerOnly = currentUser.id === getForeignLeaveReviewer(pipelinesConfig);
  const foreignUserIds = useMemo(() => new Set(users.filter(user => user.personnelType === 'ครูต่างชาติ').map(user => user.id)), [users]);
  const visibleLeaveRequests = useMemo(() => foreignReviewerOnly
    ? periodFilter.records.filter(request => foreignUserIds.has(request.userId))
    : canViewAllLeaveRecords ? periodFilter.records : periodFilter.records.filter(request => request.userId === currentUser.id),
  [foreignReviewerOnly, foreignUserIds, canViewAllLeaveRecords, currentUser.id, periodFilter.records]);

  const hasInvalidDateRange = Boolean(reportStartDate && reportEndDate && reportStartDate > reportEndDate);
  const personnelTypeByUserId = useMemo(() => new Map(users.map(user => [user.id, user.personnelType || 'ไม่ระบุประเภท'])), [users]);
  const reportLeaveRequests = useMemo(() => {
    if (hasInvalidDateRange) return [];
    return visibleLeaveRequests.filter(request =>
      (!reportStartDate || request.endDate >= reportStartDate)
      && (!reportEndDate || request.startDate <= reportEndDate)
      && request.status !== 'cancelled'
      && (reportStatus === 'all' || request.status === reportStatus)
      && (personnelType === 'all' || personnelTypeByUserId.get(request.userId) === personnelType)
    );
  }, [hasInvalidDateRange, personnelType, personnelTypeByUserId, reportEndDate, reportStartDate, reportStatus, visibleLeaveRequests]);

  const leaveStatistics = useMemo(() => {
    const summaries = new Map<string, StaffLeaveSummary>();
    const userOrder = new Map(users.map((user, index) => [user.id, index]));
    const userById = new Map(users.map(user => [user.id, user]));
    const createEmptySummary = (userId: string, userName: string, department: string, position = ''): StaffLeaveSummary => ({
      userId,
      userName,
      department,
      position,
      sourceOrder: userOrder.get(userId) ?? Number.MAX_SAFE_INTEGER,
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
        .filter(user => user.status !== 'inactive'
          && (!foreignReviewerOnly || foreignUserIds.has(user.id))
          && (personnelType === 'all' || user.personnelType === personnelType))
        .forEach(user => summaries.set(user.id, createEmptySummary(user.id, user.name, user.department, user.position)));
    } else {
      summaries.set(currentUser.id, createEmptySummary(currentUser.id, currentUser.name, currentUser.department, currentUser.position));
    }

    reportLeaveRequests.forEach(request => {
      const key = request.userId || request.userName;
      const requestUser = userById.get(request.userId);
      const summary = summaries.get(key) ?? createEmptySummary(request.userId, request.userName, request.department, requestUser?.position || '');
      const days = Number(request.totalDays) || 0;
      summary.requestCount += 1;
      if (request.status === 'pending') summary.pendingCount += 1;
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
      summaries.set(key, summary);
    });

    return Array.from(summaries.values());
  }, [canViewAllLeaveRecords, foreignReviewerOnly, foreignUserIds, currentUser.department, currentUser.id, currentUser.name, personnelType, reportLeaveRequests, users]);

  const filteredStatistics = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('th');
    return leaveStatistics
      .filter(item => !keyword || `${item.userName} ${item.position} ${item.department}`.toLocaleLowerCase('th').includes(keyword))
      .sort((left, right) => (getPersonnelAcademicOrder(left.userName) ?? Number.MAX_SAFE_INTEGER) - (getPersonnelAcademicOrder(right.userName) ?? Number.MAX_SAFE_INTEGER)
        || getAcademicRankOrder(left.position) - getAcademicRankOrder(right.position)
        || left.sourceOrder - right.sourceOrder
        || left.userName.localeCompare(right.userName, 'th'));
  }, [leaveStatistics, search]);

  const reportTotalGroups = useMemo(() => {
    const groups = [
      { label: 'ลากิจ', count: 0, days: 0 },
      { label: 'ลาป่วย', count: 0, days: 0 },
      { label: 'ลาคลอด', count: 0, days: 0 },
      { label: 'ลาอื่น ๆ', count: 0, days: 0 },
      { label: 'รวมทั้งหมด', count: 0, days: 0 },
    ];
    for (const item of filteredStatistics) {
      groups[0].count += item.personalCount;
      groups[0].days += item.personalDays;
      groups[1].count += item.sickCount;
      groups[1].days += item.sickDays;
      groups[2].count += item.maternityCount;
      groups[2].days += item.maternityDays;
      groups[3].count += item.otherCount;
      groups[3].days += item.otherDays;
      groups[4].count += item.approvedCount;
      groups[4].days += item.approvedDays;
    }
    return groups;
  }, [filteredStatistics]);
  const reportTotalValues = reportTotalGroups.flatMap(({ count, days }) => [count, days]);

  const totals = useMemo(() => leaveStatistics.reduce((result, item) => ({
    requestCount: result.requestCount + item.requestCount,
    approvedDays: result.approvedDays + item.approvedDays,
    pendingCount: result.pendingCount + item.pendingCount,
  }), { requestCount: 0, approvedDays: 0, pendingCount: 0 }), [leaveStatistics]);

  const exportLeaveSummaryExcel = async () => {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('สรุปวันลา', { views: [{ state: 'frozen', ySplit: 4 }] });
    const periodLabel = `ภาคเรียนที่ ${periodFilter.semester} ปีการศึกษา ${periodFilter.academicYear}`;
    const dateLabel = reportStartDate || reportEndDate
      ? `${reportStartDate ? formatReportDate(reportStartDate) : 'วันแรก'} ถึง ${reportEndDate ? formatReportDate(reportEndDate) : 'วันสุดท้าย'}`
      : 'ทุกวันในภาคเรียน';
    worksheet.mergeCells('A1:M1');
    worksheet.getCell('A1').value = 'สรุปวันลาบุคลากร โรงเรียนมกุฎเมืองราชวิทยาลัย';
    worksheet.mergeCells('A2:M2');
    worksheet.getCell('A2').value = `${periodLabel} · ${dateLabel}`;
    worksheet.mergeCells('A3:M3');
    worksheet.getCell('A3').value = `ประเภทบุคลากร: ${personnelTypeLabel} · สถานะ: ${reportStatusLabel}`;
    ['A1', 'A2', 'A3'].forEach(address => {
      worksheet.getCell(address).alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getCell(address).font = { name: 'TH Sarabun New', size: address === 'A1' ? 18 : 16, bold: true };
    });
    worksheet.columns = [
      { key: 'index', width: 7 }, { key: 'name', width: 30 }, { key: 'position', width: 26 },
      { key: 'personalCount', width: 11 }, { key: 'personalDays', width: 11 },
      { key: 'sickCount', width: 11 }, { key: 'sickDays', width: 11 },
      { key: 'maternityCount', width: 11 }, { key: 'maternityDays', width: 11 },
      { key: 'otherCount', width: 11 }, { key: 'otherDays', width: 11 },
      { key: 'totalCount', width: 12 }, { key: 'totalDays', width: 12 },
    ];
    const header = worksheet.addRow(['ที่', 'ชื่อ - สกุล', 'ตำแหน่ง / วิทยฐานะ', 'ลากิจ (ครั้ง)', 'ลากิจ (วัน)', 'ลาป่วย (ครั้ง)', 'ลาป่วย (วัน)', 'ลาคลอด (ครั้ง)', 'ลาคลอด (วัน)', 'ลาอื่น ๆ (ครั้ง)', 'ลาอื่น ๆ (วัน)', 'รวม (ครั้ง)', 'รวม (วัน)']);
    header.eachCell(cell => {
      cell.font = { name: 'TH Sarabun New', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });
    filteredStatistics.forEach((item, index) => worksheet.addRow([
      index + 1, item.userName, item.position || '-', item.personalCount, item.personalDays, item.sickCount, item.sickDays,
      item.maternityCount, item.maternityDays, item.otherCount, item.otherDays, item.approvedCount, item.approvedDays,
    ]));
    const totalRow = worksheet.addRow(['รวม', '', '', ...reportTotalValues]);
    worksheet.mergeCells(totalRow.number, 1, totalRow.number, 3);
    totalRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    });
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 3) return;
      row.eachCell(cell => {
        cell.font = { ...cell.font, name: 'TH Sarabun New', size: 16 };
        cell.alignment = { ...cell.alignment, vertical: 'middle', wrapText: true };
        cell.border = { top: { style: 'thin', color: { argb: 'FFD1D5DB' } }, left: { style: 'thin', color: { argb: 'FFD1D5DB' } }, bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } }, right: { style: 'thin', color: { argb: 'FFD1D5DB' } } };
      });
    });
    const bytes = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `สรุปวันลา-${personnelTypeLabel}-${reportStatusLabel}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

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
              {' · '}สถานะ: {reportStatusLabel} · ประเภทบุคลากร: {personnelTypeLabel}
            </p>
          </div>
          <div className="leave-statistics-actions mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
            <div className="rounded-2xl border border-emerald-100 bg-white/80 p-3 shadow-xs">
              <div className="mb-2 text-xs font-bold text-emerald-900">เลือกช่วงวันที่รายงาน</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className="text-xs font-semibold text-slate-600">
                ตั้งแต่วันที่
                <input type="date" value={reportStartDate} onChange={event => setReportStartDate(event.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm outline-hidden transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                ถึงวันที่
                <input type="date" value={reportEndDate} onChange={event => setReportEndDate(event.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm outline-hidden transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                สถานะใบลา
                <select value={reportStatus} onChange={event => setReportStatus(event.target.value as typeof reportStatus)} className="mt-1 block min-h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm outline-hidden transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
                  <option value="approved">อนุมัติแล้ว</option>
                  <option value="pending">รอดำเนินการ</option>
                  <option value="rejected">ไม่อนุมัติ / ส่งกลับ</option>
                  <option value="all">ทุกสถานะ</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                ประเภทบุคลากร
                <select value={personnelType} onChange={event => setPersonnelType(event.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm outline-hidden transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
                  <option value="all">ทุกประเภท</option>
                  <option value="ข้าราชการครู">ครู</option>
                  <option value="พนักงานราชการ">พนักงานราชการ</option>
                  <option value="พนักงานวิทยาศาสตร์">พนักงานวิทยาศาสตร์</option>
                  <option value="ครูอัตราจ้าง">ครูอัตราจ้าง</option>
                  <option value="ครูต่างชาติ">ครูต่างชาติ</option>
                  <option value="เจ้าหน้าที่สนับสนุนการสอน">เจ้าหน้าที่สนับสนุนการสอน</option>
                  <option value="ลูกจ้างประจำ">ลูกจ้างประจำ</option>
                  <option value="พนักงานขับรถยนต์">พนักงานขับรถยนต์</option>
                  <option value="ไม่ระบุประเภท">ไม่ระบุประเภท</option>
                </select>
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
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(reportStartDate || reportEndDate || reportStatus !== 'approved' || personnelType !== 'all') ? (
                <button type="button" onClick={() => { setReportStartDate(''); setReportEndDate(''); setReportStatus('approved'); setPersonnelType('all'); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                  <RotateCcw className="h-4 w-4" /> ล้างตัวกรอง
                </button>
              ) : <div className="hidden sm:block" />}
              <button type="button" onClick={printLeaveSummary} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100">
                <Printer className="h-4 w-4" /> พิมพ์สรุปการลา
              </button>
              <button type="button" onClick={exportLeaveSummaryExcel} disabled={hasInvalidDateRange || filteredStatistics.length === 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
                <FileSpreadsheet className="h-4 w-4" /> ส่งออก Excel
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
            { label: reportStatusLabel, value: totals.approvedDays, suffix: 'วัน', tone: 'bg-emerald-50 text-emerald-800', icon: <CheckCircle2 className="h-4 w-4" /> },
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
              <div className="text-[11px] text-slate-500">{item.position || '-'}</div>
              <div className="text-[10px] text-slate-400">{item.department || '-'}</div>
              <div className="leave-statistics-type-grid mt-2 grid grid-cols-4 gap-1 text-center text-[9px] sm:mt-3 sm:gap-2 sm:text-xs">
                <div className="min-w-0 rounded-lg bg-slate-50 px-1 py-1.5 sm:rounded-xl sm:p-2"><span className="block truncate text-slate-400">ลากิจ</span><div className="mt-1 font-bold leading-tight"><span className="block">{item.personalCount} ครั้ง</span><span className="block">{item.personalDays} วัน</span></div></div>
                <div className="min-w-0 rounded-lg bg-amber-50 px-1 py-1.5 sm:rounded-xl sm:p-2"><span className="block truncate text-amber-700">ลาป่วย</span><div className="mt-1 font-bold leading-tight"><span className="block">{item.sickCount} ครั้ง</span><span className="block">{item.sickDays} วัน</span></div></div>
                <div className="min-w-0 rounded-lg bg-slate-50 px-1 py-1.5 sm:rounded-xl sm:p-2"><span className="block truncate text-slate-400">ลาคลอด</span><div className="mt-1 font-bold leading-tight"><span className="block">{item.maternityCount} ครั้ง</span><span className="block">{item.maternityDays} วัน</span></div></div>
                <div className="min-w-0 rounded-lg bg-amber-50 px-1 py-1.5 sm:rounded-xl sm:p-2"><span className="block truncate text-amber-700">ลาอื่น ๆ</span><div className="mt-1 font-bold leading-tight"><span className="block">{item.otherCount} ครั้ง</span><span className="block">{item.otherDays} วัน</span></div></div>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-[11px] text-slate-600 sm:mt-3 sm:gap-x-4 sm:pt-3 sm:text-xs">
                <span>รวมสถานะที่เลือก <strong className="text-emerald-700">{item.approvedCount} ครั้ง / {item.approvedDays} วัน</strong></span>
                <span>ทั้งหมด <strong>{item.requestCount} รายการ</strong></span>
                <span>รอดำเนินการ <strong className="text-amber-700">{item.pendingCount}</strong></span>
              </div>
            </article>
          ))}
          {filteredStatistics.length > 0 && (
            <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
              <h3 className="mb-2 font-bold text-emerald-900">รวมตามตัวกรอง</h3>
              <dl className="space-y-1">
                {reportTotalGroups.map(({ label, count, days }) => (
                  <div key={label} className="flex justify-between gap-2">
                    <dt>{label}</dt><dd className="font-semibold">{count} ครั้ง / {days} วัน</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>

        <div className="leave-statistics-table hidden overflow-x-auto border-t border-slate-100 md:block">
          <table className="w-full min-w-[900px] border-collapse text-left text-xs text-slate-700">
            <caption className="leave-statistics-print-caption">สรุปการลา · {personnelTypeLabel} · สถานะ {reportStatusLabel} · ภาคเรียนที่ {periodFilter.semester} ปีการศึกษา {periodFilter.academicYear}</caption>
            <colgroup>
              <col className="leave-statistics-index-column" />
              <col className="leave-statistics-name-column" />
              {Array.from({ length: 10 }, (_, index) => <col key={index} className="leave-statistics-number-column" />)}
            </colgroup>
            <thead className="bg-slate-50 font-semibold text-slate-800">
              <tr>
                <th rowSpan={2} className="w-12 border border-slate-300 px-2 py-3 text-center">ที่</th>
                <th rowSpan={2} className="min-w-[230px] border border-slate-300 px-4 py-3 text-center">ชื่อ - สกุล</th>
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
                  <td className="border border-slate-300 px-4 py-3"><div className="font-bold text-slate-800">{item.userName}</div><div className="text-[11px] text-slate-500">{item.position || '-'}</div><div className="leave-statistics-department text-[10px] text-slate-400">{item.department || '-'}</div></td>
                  <td className="border border-slate-300 px-2 py-3 text-center">{item.personalCount}</td><td className="border border-slate-300 px-2 py-3 text-center">{item.personalDays}</td>
                  <td className="border border-amber-200 bg-amber-50/60 px-2 py-3 text-center">{item.sickCount}</td><td className="border border-amber-200 bg-amber-50/60 px-2 py-3 text-center">{item.sickDays}</td>
                  <td className="border border-slate-300 px-2 py-3 text-center">{item.maternityCount}</td><td className="border border-slate-300 px-2 py-3 text-center">{item.maternityDays}</td>
                  <td className="border border-amber-200 bg-amber-50/60 px-2 py-3 text-center">{item.otherCount}</td><td className="border border-amber-200 bg-amber-50/60 px-2 py-3 text-center">{item.otherDays}</td>
                  <td className="border border-sky-200 bg-sky-50/70 px-2 py-3 text-center font-bold">{item.approvedCount}</td><td className="border border-sky-200 bg-sky-50/70 px-2 py-3 text-center font-black text-emerald-700">{item.approvedDays}</td>
                </tr>
              ))}
            </tbody>
            {filteredStatistics.length > 0 && (
              <tfoot className="bg-emerald-50 font-bold text-emerald-900">
                <tr>
                  <th scope="row" colSpan={2} className="border border-emerald-200 px-4 py-3 text-center">รวม</th>
                  {reportTotalValues.map((value, index) => (
                    <td key={index} className="border border-emerald-200 px-2 py-3 text-center">{value}</td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400">ข้อมูลอัปเดตจากรายการใบลาในระบบตามปีการศึกษาและภาคเรียนที่เลือก</div>
      </section>

      <style>{`
      @media (max-width: 767px) {
        #leave-statistics-report .leave-statistics-summary-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
        #leave-statistics-report .leave-statistics-type-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        }
        #leave-statistics-report .leave-statistics-summary-card {
          min-height: 88px;
        }
      }
      .leave-statistics-print-caption { display: none; }
      @media print {
        @page { size: A4 portrait; margin: 5mm; }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
        }
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
        #leave-statistics-report .leave-statistics-print-caption {
          display: table-caption !important;
          visibility: visible !important;
          padding: 0 0 3mm;
          color: #111;
          font-family: 'TH SarabunPSK', 'Sarabun', sans-serif;
          font-size: 16pt;
          font-weight: 700;
          text-align: center;
        }
        #leave-statistics-report .leave-statistics-table table {
          width: 100% !important;
          min-width: 0 !important;
          table-layout: fixed !important;
          font-family: 'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif !important;
          font-size: 16pt !important;
          line-height: 1 !important;
          color: #000 !important;
          background: #fff !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        #leave-statistics-report .leave-statistics-index-column { width: 8mm !important; }
        #leave-statistics-report .leave-statistics-name-column { width: 82mm !important; }
        #leave-statistics-report .leave-statistics-number-column { width: 11mm !important; }
        #leave-statistics-report .leave-statistics-table thead {
          display: table-header-group !important;
        }
        #leave-statistics-report .leave-statistics-table tbody {
          display: table-row-group !important;
        }
        #leave-statistics-report .leave-statistics-table tfoot {
          display: table-row-group !important;
        }
        #leave-statistics-report .leave-statistics-table tr {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
        #leave-statistics-report .leave-statistics-department {
          display: none !important;
        }
        #leave-statistics-report .leave-statistics-table th:nth-child(2),
        #leave-statistics-report .leave-statistics-table td:nth-child(2) {
          white-space: nowrap !important;
          overflow-wrap: normal !important;
        }
        #leave-statistics-report .leave-statistics-table th,
        #leave-statistics-report .leave-statistics-table td {
          padding: 2px 1px !important;
          color: #000 !important;
          overflow-wrap: anywhere;
        }
        #leave-statistics-report .leave-statistics-table th *,
        #leave-statistics-report .leave-statistics-table td * {
          font-family: 'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif !important;
          color: #000 !important;
          -webkit-text-fill-color: #000 !important;
        }
      }`}</style>
    </div>
  );
};
