'use client';

import React, { useMemo } from 'react';
import { CalendarDays, Printer, X } from 'lucide-react';
import { SubstituteTeaching } from '../types';

interface SubstituteDailyPrintDocumentProps {
  lessons: SubstituteTeaching[];
  academicYear: string;
  semester: '1' | '2';
  onClose: () => void;
}

const statusLabel: Record<SubstituteTeaching['stage'], string> = {
  pending_ack: 'รอรับทราบ',
  acknowledged: 'รับทราบแล้ว',
  rejected: 'ปฏิเสธ',
};

const todayValue = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

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
  onClose,
}) => {
  const availableDates = useMemo(() => Array.from(new Set(lessons.map(lesson => lesson.date))).sort().reverse(), [lessons]);
  const [selectedDate, setSelectedDate] = React.useState(() => {
    const today = todayValue();
    return lessons.some(lesson => lesson.date === today) ? today : (availableDates[0] ?? today);
  });

  const reportLessons = useMemo(() => lessons
    .filter(lesson => lesson.date === selectedDate)
    .sort((a, b) => a.period - b.period || a.gradeLevel.localeCompare(b.gradeLevel, 'th')),
  [lessons, selectedDate]);

  const acknowledgedCount = reportLessons.filter(lesson => lesson.stage === 'acknowledged').length;
  const pendingCount = reportLessons.filter(lesson => lesson.stage === 'pending_ack').length;
  const rejectedCount = reportLessons.filter(lesson => lesson.stage === 'rejected').length;
  const substituteTeacherCount = new Set(reportLessons.map(lesson => lesson.substituteTeacherId)).size;

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

      <div className="no-print sticky top-0 z-10 mx-auto mb-3 flex w-full max-w-[194mm] flex-col gap-2 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <CalendarDays className="h-5 w-5 text-teal-700" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">รายงานการสอนแทนประจำวัน</h3>
            <p className="text-[11px] text-slate-500">เลือกวันที่ก่อนพิมพ์หรือบันทึกเป็น PDF</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={event => setSelectedDate(event.target.value)}
            aria-label="วันที่รายงานสอนแทน"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 sm:w-40"
          />
          <button onClick={handlePrint} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-teal-700 sm:flex-none">
            <Printer className="h-4 w-4" /> พิมพ์ / บันทึก PDF
          </button>
          <button onClick={onClose} className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200" title="ปิดหน้าต่าง">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <article className="substitute-daily-paper shadow-2xl">
        <header className="mb-3 text-center">
          <h1 className="text-[20pt] font-bold">รายงานการจัดครูสอนแทนประจำวัน</h1>
          <p className="text-[16pt] font-bold">โรงเรียนมกุฎเมืองราชวิทยาลัย</p>
          <p className="mt-1 text-[15pt] font-bold">ประจำวันที่ {formatThaiDate(selectedDate)}</p>
          <p>ภาคเรียนที่ {semester} ปีการศึกษา {academicYear}</p>
        </header>

        <section className="mb-3 grid grid-cols-5 border border-slate-500 bg-slate-50 text-center">
          <div className="border-r border-slate-400 px-1 py-2"><strong>{reportLessons.length}</strong><br />คาบทั้งหมด</div>
          <div className="border-r border-slate-400 px-1 py-2"><strong>{substituteTeacherCount}</strong><br />ครูผู้สอนแทน</div>
          <div className="border-r border-slate-400 px-1 py-2"><strong>{acknowledgedCount}</strong><br />รับทราบแล้ว</div>
          <div className="border-r border-slate-400 px-1 py-2"><strong>{pendingCount}</strong><br />รอรับทราบ</div>
          <div className="px-1 py-2"><strong>{rejectedCount}</strong><br />ปฏิเสธ</div>
        </section>

        <section className="mb-4">
          <table className="substitute-daily-table text-[9.5pt]">
            <colgroup>
              <col style={{ width: '5%' }} /><col style={{ width: '11%' }} /><col style={{ width: '17%' }} />
              <col style={{ width: '18%' }} /><col style={{ width: '19%' }} /><col style={{ width: '10%' }} />
              <col style={{ width: '11%' }} /><col style={{ width: '9%' }} />
            </colgroup>
            <thead><tr><th>ที่</th><th>คาบ / เวลา</th><th>ครูประจำวิชา</th><th>ครูผู้สอนแทน</th><th>วิชา / รหัสวิชา</th><th>ชั้น / ห้อง</th><th>เหตุผล</th><th>สถานะ</th></tr></thead>
            <tbody>
              {reportLessons.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center">ไม่พบรายการจัดครูสอนแทนในวันที่เลือก</td></tr>
              ) : reportLessons.map((lesson, index) => (
                <tr key={lesson.id}>
                  <td className="text-center">{index + 1}</td>
                  <td className="text-center">{lesson.period}<br />{lesson.time}</td>
                  <td>{lesson.originalTeacherName}</td>
                  <td>{lesson.substituteTeacherName}</td>
                  <td>{lesson.subjectName}<br />({lesson.subjectCode})</td>
                  <td className="text-center">{lesson.gradeLevel}</td>
                  <td>{lesson.leaveReason}</td>
                  <td className="text-center">{statusLabel[lesson.stage]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-5 text-[12pt]">
          <p><strong>หมายเหตุ:</strong> ...............................................................................................................................................................</p>
          <p className="mt-2">................................................................................................................................................................................</p>
        </section>

        <footer className="mt-10 grid grid-cols-2 gap-16 text-center">
          <div>ลงชื่อ ........................................................ ผู้จัดตารางสอนแทน<br />(........................................................)<br />วันที่ ........../........../..........</div>
          <div>ลงชื่อ ........................................................ ผู้ตรวจสอบ<br />(........................................................)<br />รองผู้อำนวยการฝ่ายวิชาการ<br />วันที่ ........../........../..........</div>
        </footer>
      </article>
    </div>
  );
};
