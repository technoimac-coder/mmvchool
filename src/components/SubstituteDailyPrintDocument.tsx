'use client';

import React, { useMemo } from 'react';
import { CalendarDays, Printer, X } from 'lucide-react';
import { SubstituteTeaching } from '../types';

type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'semester';

interface SubstituteDailyPrintDocumentProps {
  lessons: SubstituteTeaching[];
  academicYear: string;
  semester: '1' | '2';
  reporterName: string;
  reviewerName: string;
  onClose: () => void;
}

const todayValue = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const toDateValue = (value: Date) => {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
};

const parseDate = (value: string) => new Date(`${value}T00:00:00`);

const formatThaiDate = (date: string, dateStyle: 'long' | 'medium' = 'long') => {
  if (!date) return '-';
  const value = new Date(`${date}T00:00:00`);
  if (Number.isNaN(value.getTime())) return date;
  return new Intl.DateTimeFormat('th-TH', { dateStyle }).format(value);
};

export const SubstituteDailyPrintDocument: React.FC<SubstituteDailyPrintDocumentProps> = ({
  lessons,
  academicYear,
  semester,
  reporterName,
  reviewerName,
  onClose,
}) => {
  const availableDates = useMemo(() => Array.from(new Set(lessons.map(lesson => lesson.date))).sort().reverse(), [lessons]);
  const [selectedDate, setSelectedDate] = React.useState(() => {
    const today = todayValue();
    return lessons.some(lesson => lesson.date === today) ? today : (availableDates[0] ?? today);
  });
  const [reportPeriod, setReportPeriod] = React.useState<ReportPeriod>('daily');

  const selectedRange = useMemo(() => {
    const selected = parseDate(selectedDate);
    if (reportPeriod === 'semester') return null;
    if (reportPeriod === 'daily') return { start: selectedDate, end: selectedDate };

    if (reportPeriod === 'weekly') {
      const start = new Date(selected);
      const day = start.getDay();
      start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start: toDateValue(start), end: toDateValue(end) };
    }

    const start = new Date(selected.getFullYear(), selected.getMonth(), 1);
    const end = new Date(selected.getFullYear(), selected.getMonth() + 1, 0);
    return { start: toDateValue(start), end: toDateValue(end) };
  }, [reportPeriod, selectedDate]);

  const reportLessons = useMemo(() => lessons
    .filter(lesson => !selectedRange || (lesson.date >= selectedRange.start && lesson.date <= selectedRange.end))
    .sort((a, b) => a.date.localeCompare(b.date) || a.period - b.period || a.gradeLevel.localeCompare(b.gradeLevel, 'th')),
  [lessons, selectedRange]);

  const reportPeriodLabel = useMemo(() => {
    if (reportPeriod === 'daily') return `ประจำวันที่ ${formatThaiDate(selectedDate)}`;
    if (reportPeriod === 'weekly' && selectedRange) {
      return `ประจำสัปดาห์ วันที่ ${formatThaiDate(selectedRange.start, 'medium')} – ${formatThaiDate(selectedRange.end, 'medium')}`;
    }
    if (reportPeriod === 'monthly') {
      return `ประจำเดือน${new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(parseDate(selectedDate))}`;
    }
    return `ประจำภาคเรียนที่ ${semester} ปีการศึกษา ${academicYear}`;
  }, [academicYear, reportPeriod, selectedDate, selectedRange, semester]);

  const handlePrint = async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    window.print();
  };

  return (
    <div className="substitute-daily-stage fixed inset-0 z-[70] overflow-auto bg-slate-900/70 p-3 backdrop-blur-sm sm:p-5">
      <style>{`
        @page { size: A4 portrait; margin: 8mm; }
        .substitute-daily-paper { width: 194mm; min-height: 281mm; margin: 0 auto; background: white; box-sizing: border-box; padding: 9mm 9mm; color: #111827; font-family: 'TH SarabunPSK', 'Sarabun', sans-serif; font-size: 13pt; line-height: 1.15; }
        .substitute-daily-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .substitute-daily-table th, .substitute-daily-table td { border: 0.25mm solid #475569; padding: 1.2mm 1mm; vertical-align: middle; }
        .substitute-daily-table th { background: #e2e8f0; font-weight: 700; text-align: center; }
        .substitute-daily-table tbody tr { break-inside: avoid; page-break-inside: avoid; }
        .substitute-note-line { height: 7mm; border-bottom: 0.25mm dotted #334155; }
        .substitute-signature-grid { width: 79mm; margin: 0 auto; display: grid; grid-template-columns: 11mm 38mm 30mm; align-items: end; }
        .substitute-signature-line { height: 5mm; border-bottom: 0.25mm dotted #334155; }
        .substitute-signature-under { grid-column: 2; text-align: center; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
          body * { visibility: hidden !important; }
          .substitute-daily-stage, .substitute-daily-stage * { visibility: visible !important; }
          .substitute-daily-stage { position: absolute !important; inset: 0 !important; width: auto !important; height: auto !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; background: white !important; }
          .substitute-daily-paper { width: 194mm !important; min-height: 281mm !important; margin: 0 !important; padding: 6mm 7mm !important; box-shadow: none !important; }
          .no-print { display: none !important; }
          .substitute-daily-table thead { display: table-header-group; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 mx-auto mb-3 flex w-full max-w-[194mm] flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <CalendarDays className="h-5 w-5 text-teal-700" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">รายงานการจัดครูสอนแทน</h3>
            <p className="text-[11px] text-slate-500">เลือกรูปแบบและช่วงเวลาก่อนพิมพ์หรือบันทึกเป็น PDF</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
            {([['daily', 'รายวัน'], ['weekly', 'สัปดาห์'], ['monthly', 'เดือน'], ['semester', 'ภาคเรียน']] as const).map(([value, label]) => (
              <button key={value} onClick={() => setReportPeriod(value)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${reportPeriod === value ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {reportPeriod !== 'semester' && (
              <input
                type={reportPeriod === 'monthly' ? 'month' : 'date'}
                value={reportPeriod === 'monthly' ? selectedDate.slice(0, 7) : selectedDate}
                onChange={event => setSelectedDate(reportPeriod === 'monthly' ? `${event.target.value}-01` : event.target.value)}
                aria-label={reportPeriod === 'monthly' ? 'เดือนที่รายงานสอนแทน' : 'วันที่อ้างอิงรายงานสอนแทน'}
                className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 sm:w-40"
              />
            )}
            <button onClick={handlePrint} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-teal-700 sm:flex-none">
              <Printer className="h-4 w-4" /> พิมพ์ / บันทึก PDF
            </button>
            <button onClick={onClose} className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200" title="ปิดหน้าต่าง">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <article className="substitute-daily-paper relative shadow-2xl">
        <img
          src="/school-logo.png"
          alt="ตราโรงเรียนมกุฎเมืองราชวิทยาลัย"
          className="absolute left-[9mm] top-[8mm] h-[22mm] w-[22mm] object-contain"
        />
        <header className="mb-5 min-h-[25mm] px-[25mm] text-center">
          <h1 className="text-[20pt] font-bold">รายงานการจัดครูสอนแทน</h1>
          <p className="text-[16pt] font-bold">โรงเรียนมกุฎเมืองราชวิทยาลัย</p>
          <p className="mt-1 text-[15pt] font-bold">{reportPeriodLabel}</p>
          {reportPeriod !== 'semester' && <p>ภาคเรียนที่ {semester} ปีการศึกษา {academicYear}</p>}
        </header>

        <section className="mb-4">
          <table className="substitute-daily-table text-[9.5pt]">
            <colgroup>
              <col style={{ width: '6%' }} /><col style={{ width: '15%' }} /><col style={{ width: '20%' }} />
              <col style={{ width: '21%' }} /><col style={{ width: '25%' }} /><col style={{ width: '13%' }} />
            </colgroup>
            <thead><tr><th>ที่</th><th>วันที่ / คาบ / เวลา</th><th>ครูประจำวิชา</th><th>ครูผู้สอนแทน</th><th>วิชา / รหัสวิชา</th><th>ชั้น / ห้อง</th></tr></thead>
            <tbody>
              {reportLessons.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center">ไม่พบรายการจัดครูสอนแทนในช่วงเวลาที่เลือก</td></tr>
              ) : reportLessons.map((lesson, index) => (
                <tr key={lesson.id}>
                  <td className="text-center">{index + 1}</td>
                  <td className="text-center">{formatThaiDate(lesson.date, 'medium')}<br />คาบ {lesson.period} / {lesson.time}</td>
                  <td>{lesson.originalTeacherName}</td>
                  <td>{lesson.substituteTeacherName}</td>
                  <td>{lesson.subjectName}<br />({lesson.subjectCode})</td>
                  <td className="text-center">{lesson.gradeLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-5 text-[12pt]">
          <div className="flex items-end gap-1"><strong className="shrink-0">หมายเหตุ:</strong><span className="substitute-note-line flex-1" /></div>
          <div className="substitute-note-line w-full" />
        </section>

        <footer className="mt-10 grid grid-cols-2 gap-8 text-center">
          <div className="substitute-signature-grid">
            <span>ลงชื่อ</span><span className="substitute-signature-line" /><span>ผู้จัดตารางสอนแทน</span>
            <span className="substitute-signature-under">({reporterName})</span>
            <span className="substitute-signature-under">ผู้รายงาน</span>
            <span className="substitute-signature-under">วันที่ ........../........../..........</span>
          </div>
          <div className="substitute-signature-grid">
            <span>ลงชื่อ</span><span className="substitute-signature-line" /><span>ผู้ตรวจสอบ</span>
            <span className="substitute-signature-under">({reviewerName})</span>
            <span className="substitute-signature-under">รองผู้อำนวยการฝ่ายวิชาการ</span>
            <span className="substitute-signature-under">วันที่ ........../........../..........</span>
          </div>
        </footer>
      </article>
    </div>
  );
};
