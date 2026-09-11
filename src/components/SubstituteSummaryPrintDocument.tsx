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

  const teacherOptions = useMemo(() => Array.from(new Map(
    lessons.map(lesson => [lesson.substituteTeacherId, lesson.substituteTeacherName])
  )).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'th')), [lessons]);
  const [selectedTeacherId, setSelectedTeacherId] = React.useState(teacherOptions[0]?.id ?? '');

  React.useEffect(() => {
    if (teacherOptions.length > 0 && !teacherOptions.some(teacher => teacher.id === selectedTeacherId)) {
      setSelectedTeacherId(teacherOptions[0].id);
    }
  }, [selectedTeacherId, teacherOptions]);

  const reportLessons = useMemo(() => sortedLessons.filter(
    lesson => lesson.substituteTeacherId === selectedTeacherId
  ), [selectedTeacherId, sortedLessons]);
  const selectedTeacherName = teacherOptions.find(teacher => teacher.id === selectedTeacherId)?.name ?? '-';

  const handlePrint = async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    window.print();
  };

  return (
    <div className="substitute-summary-stage fixed inset-0 z-[70] overflow-auto bg-slate-900/70 p-3 backdrop-blur-sm print-shell sm:p-5">
      <style>{`
        @page { size: A4 portrait; margin: 8mm; }
        .substitute-summary-paper { width: 194mm; min-height: 281mm; margin: 0 auto; background: white; box-sizing: border-box; padding: 10mm 10mm; color: #111827; font-family: 'TH SarabunPSK', 'Sarabun', sans-serif; font-size: 13pt; line-height: 1.1; }
        .substitute-summary-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .substitute-summary-table th, .substitute-summary-table td { border: 0.25mm solid #475569; padding: 1.1mm 1mm; vertical-align: middle; white-space: nowrap; }
        .substitute-summary-table th { background: #e2e8f0; font-weight: 700; text-align: center; }
        .substitute-summary-table tbody tr { break-inside: avoid; page-break-inside: avoid; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
          body * { visibility: hidden !important; }
          .substitute-summary-stage, .substitute-summary-stage * { visibility: visible !important; }
          .substitute-summary-stage { position: absolute !important; inset: 0 !important; width: auto !important; height: auto !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; background: white !important; }
          .substitute-summary-paper { width: 194mm !important; min-height: 281mm !important; margin: 0 !important; padding: 6mm 7mm !important; box-shadow: none !important; }
          .no-print { display: none !important; }
          .substitute-summary-table thead { display: table-header-group; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 mx-auto mb-3 flex w-full max-w-[194mm] flex-col gap-2 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-teal-700" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">รายงานสรุปการสอนแทนรายบุคคล</h3>
            <p className="text-[11px] text-slate-500">ภาคเรียนที่ {semester}/{academicYear} · {reportLessons.length} คาบ</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedTeacherId}
            onChange={event => setSelectedTeacherId(event.target.value)}
            disabled={teacherOptions.length === 0}
            aria-label="เลือกครูผู้รับสอนแทน"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 sm:w-56"
          >
            {teacherOptions.length === 0
              ? <option value="">ไม่มีข้อมูลครูผู้รับสอนแทน</option>
              : teacherOptions.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
          </select>
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
          <h1 className="text-[20pt] font-bold">รายงานสรุปการสอนแทนรายบุคคล</h1>
          <p className="text-[15pt] font-bold">โรงเรียนมกุฎเมืองราชวิทยาลัย</p>
          <p className="mt-1 text-[16pt] font-bold">ครูผู้รับสอนแทน: {selectedTeacherName}</p>
          <p>ภาคเรียนที่ {semester} ปีการศึกษา {academicYear} · พิมพ์เมื่อ {new Intl.DateTimeFormat('th-TH', { dateStyle: 'long' }).format(new Date())}</p>
        </header>

        <section className="mb-3 rounded border border-slate-500 bg-slate-50 px-4 py-2 text-center text-[14pt] font-bold">
          สรุปของครูผู้รับสอนแทนรายบุคคล: จำนวน {reportLessons.length} คาบ
        </section>

        <section className="mb-4">
          <h2 className="mb-1 text-[15pt] font-bold">รายละเอียดการรับคาบสอนแทน</h2>
          <table className="substitute-summary-table text-[9.5pt]">
            <colgroup>
              <col style={{ width: '6%' }} /><col style={{ width: '13%' }} /><col style={{ width: '16%' }} />
              <col style={{ width: '23%' }} /><col style={{ width: '21%' }} /><col style={{ width: '9%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
            <thead><tr><th>ที่</th><th>วันที่</th><th>คาบ / เวลา</th><th>ครูเจ้าของคาบ</th><th>วิชา / รหัส</th><th>ห้อง</th><th>สถานะ</th></tr></thead>
            <tbody>
              {reportLessons.length === 0 ? (
                <tr><td colSpan={7} className="py-4 text-center">ไม่มีข้อมูลในภาคเรียนนี้</td></tr>
              ) : reportLessons.map((lesson, index) => (
                <tr key={lesson.id}>
                  <td className="text-center">{index + 1}</td>
                  <td className="text-center">{formatThaiDate(lesson.date)}</td>
                  <td className="text-center">{lesson.period} / {lesson.time}</td>
                  <td>{lesson.originalTeacherName}</td>
                  <td>{lesson.subjectName} ({lesson.subjectCode})</td>
                  <td className="text-center">{lesson.gradeLevel}</td>
                  <td className="text-center">{statusLabel[lesson.stage]}{lesson.stage === 'rejected' && lesson.rejectionReason ? `: ${lesson.rejectionReason}` : ''}</td>
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
