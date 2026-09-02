'use client';

import React, { useMemo } from 'react';
import { BarChart3, Printer, X } from 'lucide-react';
import { SubstituteTeaching } from '../types';

interface SubstituteSummaryPrintDocumentProps {
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

const formatThaiDate = (date: string) => {
  if (!date) return '-';
  const value = new Date(`${date}T00:00:00`);
  if (Number.isNaN(value.getTime())) return date;
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(value);
};

export const SubstituteSummaryPrintDocument: React.FC<SubstituteSummaryPrintDocumentProps> = ({
  lessons,
  academicYear,
  semester,
  onClose,
}) => {
  const sortedLessons = useMemo(() => [...lessons].sort((a, b) =>
    a.date.localeCompare(b.date) || a.period - b.period || a.substituteTeacherName.localeCompare(b.substituteTeacherName, 'th')
  ), [lessons]);

  const teacherSummary = useMemo(() => {
    const grouped = new Map<string, {
      teacherName: string;
      count: number;
      originalTeachers: Set<string>;
      dates: Set<string>;
    }>();

    sortedLessons.forEach(lesson => {
      const summary = grouped.get(lesson.substituteTeacherId) ?? {
        teacherName: lesson.substituteTeacherName,
        count: 0,
        originalTeachers: new Set<string>(),
        dates: new Set<string>(),
      };
      summary.count += 1;
      summary.originalTeachers.add(lesson.originalTeacherName);
      summary.dates.add(lesson.date);
      grouped.set(lesson.substituteTeacherId, summary);
    });

    return Array.from(grouped.values()).sort((a, b) =>
      b.count - a.count || a.teacherName.localeCompare(b.teacherName, 'th')
    );
  }, [sortedLessons]);

  const acknowledgedCount = lessons.filter(lesson => lesson.stage === 'acknowledged').length;
  const pendingCount = lessons.filter(lesson => lesson.stage === 'pending_ack').length;
  const rejectedCount = lessons.filter(lesson => lesson.stage === 'rejected').length;

  const handlePrint = async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    window.print();
  };

  return (
    <div className="substitute-summary-stage fixed inset-0 z-[70] overflow-auto bg-slate-900/70 p-3 backdrop-blur-sm print-shell sm:p-5">
      <style>{`
        @page { size: A4 landscape; margin: 8mm; }
        .substitute-summary-paper { width: 281mm; min-height: 194mm; margin: 0 auto; background: white; box-sizing: border-box; padding: 10mm 12mm; color: #111827; font-family: 'TH SarabunPSK', 'Sarabun', sans-serif; font-size: 13pt; line-height: 1.1; }
        .substitute-summary-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .substitute-summary-table th, .substitute-summary-table td { border: 0.25mm solid #475569; padding: 1.2mm 1.5mm; vertical-align: top; overflow-wrap: anywhere; }
        .substitute-summary-table th { background: #e2e8f0; font-weight: 700; text-align: center; }
        .substitute-summary-table tbody tr { break-inside: avoid; page-break-inside: avoid; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
          body * { visibility: hidden !important; }
          .substitute-summary-stage, .substitute-summary-stage * { visibility: visible !important; }
          .substitute-summary-stage { position: absolute !important; inset: 0 !important; width: auto !important; height: auto !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; background: white !important; }
          .substitute-summary-paper { width: 281mm !important; min-height: 194mm !important; margin: 0 !important; padding: 6mm 8mm !important; box-shadow: none !important; }
          .no-print { display: none !important; }
          .substitute-summary-table thead { display: table-header-group; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 mx-auto mb-3 flex w-full max-w-[281mm] flex-col gap-2 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-teal-700" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">รายงานสรุปการจัดครูสอนแทน</h3>
            <p className="text-[11px] text-slate-500">ภาคเรียนที่ {semester}/{academicYear} · {lessons.length} คาบ</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-teal-700 sm:flex-none">
            <Printer className="h-4 w-4" /> พิมพ์ / บันทึกเป็น PDF
          </button>
          <button onClick={onClose} className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200" title="ปิดหน้าต่าง">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <article className="substitute-summary-paper shadow-2xl">
        <header className="mb-3 text-center">
          <h1 className="text-[20pt] font-bold">รายงานสรุปการจัดครูสอนแทน</h1>
          <p className="text-[15pt] font-bold">โรงเรียนมกุฎเมืองราชวิทยาลัย</p>
          <p>ภาคเรียนที่ {semester} ปีการศึกษา {academicYear} · พิมพ์เมื่อ {new Intl.DateTimeFormat('th-TH', { dateStyle: 'long' }).format(new Date())}</p>
        </header>

        <section className="mb-3 grid grid-cols-5 gap-2 text-center">
          {[
            ['คาบสอนแทนทั้งหมด', lessons.length],
            ['ครูผู้รับสอนแทน', teacherSummary.length],
            ['รับทราบแล้ว', acknowledgedCount],
            ['รอรับทราบ', pendingCount],
            ['ปฏิเสธ', rejectedCount],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded border border-slate-400 px-2 py-1">
              <div className="font-bold">{label}</div>
              <div className="text-[18pt] font-bold">{value}</div>
            </div>
          ))}
        </section>

        <section className="mb-4">
          <h2 className="mb-1 text-[15pt] font-bold">รายละเอียดการรับคาบสอนแทน</h2>
          <table className="substitute-summary-table text-[11pt]">
            <colgroup>
              <col style={{ width: '5%' }} /><col style={{ width: '11%' }} /><col style={{ width: '9%' }} />
              <col style={{ width: '17%' }} /><col style={{ width: '17%' }} /><col style={{ width: '17%' }} />
              <col style={{ width: '10%' }} /><col style={{ width: '8%' }} /><col style={{ width: '6%' }} />
            </colgroup>
            <thead><tr><th>ลำดับ</th><th>วันที่</th><th>คาบ / เวลา</th><th>ครูผู้รับสอนแทน</th><th>ครูเจ้าของคาบ</th><th>วิชา</th><th>ชั้น/ห้อง</th><th>สถานะ</th><th>หมายเหตุ</th></tr></thead>
            <tbody>
              {sortedLessons.length === 0 ? (
                <tr><td colSpan={9} className="py-4 text-center">ไม่มีข้อมูลในภาคเรียนนี้</td></tr>
              ) : sortedLessons.map((lesson, index) => (
                <tr key={lesson.id}>
                  <td className="text-center">{index + 1}</td>
                  <td>{formatThaiDate(lesson.date)}</td>
                  <td className="text-center">{lesson.period}<br /><span className="text-[9pt]">{lesson.time}</span></td>
                  <td className="font-bold">{lesson.substituteTeacherName}</td>
                  <td>{lesson.originalTeacherName}</td>
                  <td>{lesson.subjectName}<br /><span className="text-[9pt]">{lesson.subjectCode}</span></td>
                  <td className="text-center">{lesson.gradeLevel}</td>
                  <td className="text-center">{statusLabel[lesson.stage]}</td>
                  <td>{lesson.stage === 'rejected' ? lesson.rejectionReason || '-' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="mb-1 text-[15pt] font-bold">สรุปแยกตามครูผู้รับสอนแทน</h2>
          <table className="substitute-summary-table text-[11pt]">
            <thead><tr><th className="w-[7%]">ลำดับ</th><th className="w-[25%]">ครูผู้รับสอนแทน</th><th className="w-[12%]">จำนวนคาบ</th><th className="w-[28%]">รับสอนแทนครู</th><th className="w-[28%]">วันที่รับสอนแทน</th></tr></thead>
            <tbody>
              {teacherSummary.length === 0 ? (
                <tr><td colSpan={5} className="py-4 text-center">ไม่มีข้อมูลในภาคเรียนนี้</td></tr>
              ) : teacherSummary.map((summary, index) => (
                <tr key={`${summary.teacherName}-${index}`}>
                  <td className="text-center">{index + 1}</td>
                  <td className="font-bold">{summary.teacherName}</td>
                  <td className="text-center font-bold">{summary.count}</td>
                  <td>{Array.from(summary.originalTeachers).join(', ')}</td>
                  <td>{Array.from(summary.dates).sort().map(formatThaiDate).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="mt-8 grid grid-cols-2 gap-20 text-center">
          <div>ลงชื่อ ........................................................ ผู้จัดทำ<br />(........................................................)<br />วันที่ ........../........../..........</div>
          <div>ลงชื่อ ........................................................ ผู้รับรอง<br />(........................................................)<br />วันที่ ........../........../..........</div>
        </footer>
      </article>
    </div>
  );
};
