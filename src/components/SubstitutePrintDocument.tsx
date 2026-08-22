'use client';

import React from 'react';
import { SubstituteTeaching } from '../types';
import { Printer, X } from 'lucide-react';

interface SubstitutePrintDocumentProps {
  request: SubstituteTeaching;
  onClose: () => void;
}

export const SubstitutePrintDocument: React.FC<SubstitutePrintDocumentProps> = ({ request, onClose }) => {
  const parseThaiDate = (dateStr?: string) => {
    if (!dateStr) return { day: '', month: '', year: '' };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { day: '', month: '', year: '' };
      const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
      ];
      return {
        day: String(d.getDate()),
        month: thaiMonths[d.getMonth()],
        year: String(d.getFullYear() + 543)
      };
    } catch {
      return { day: '', month: '', year: '' };
    }
  };

  const teachingDate = parseThaiDate(request.date);
  const createdDate = parseThaiDate(request.createdAt || new Date().toISOString().split('T')[0]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-slate-900/70 backdrop-blur-xs flex flex-col items-start sm:items-center p-3 sm:p-5 print:p-0 print:bg-white print-shell">
      {/* Top Floating Bar (Hidden on print) */}
      <div className="w-full min-w-0 max-w-[210mm] mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/95 backdrop-blur-md px-3 sm:px-5 py-2.5 rounded-2xl shadow-xl border border-slate-200 no-print shrink-0 sticky top-0">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">📄</span>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">ใบอนุมัติจัดครูสอนแทน (บันทึกข้อความราชการ)</h3>
            <p className="text-[11px] text-slate-500">รหัสรายงาน: {request.id} | รองรับการพิมพ์หรือบันทึกเป็น PDF ขนาด A4 100%</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-200 active:scale-95 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            พิมพ์เอกสาร / บันทึกเป็น PDF
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 active:scale-95 transition-all cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* A4 Printable Sheet Container */}
      <div className="w-full max-w-[210mm] min-h-[297mm] bg-white p-[20mm] sm:p-[25mm] shadow-2xl border border-slate-300/60 print:shadow-none print:border-none print:p-0 flex flex-col justify-between text-slate-900 font-serif leading-relaxed text-[11pt] tracking-normal">
        <div>
          {/* Memorandum Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-6">
            <div className="flex items-center gap-4">
              <img src="/school-logo.png" alt="ตราโรงเรียน" className="w-16 h-16 object-contain" />
              <div>
                <h1 className="text-[15pt] font-black text-slate-900 tracking-tight leading-tight">บันทึกข้อความ</h1>
                <p className="text-[10pt] font-bold text-slate-600">โรงเรียนมกุฎเมืองราชวิทยาลัย</p>
              </div>
            </div>
            <div className="text-right text-[9pt] text-slate-500 font-mono">
              <div>เลขที่ระบบ: {request.id}</div>
              <div>วันที่ออกเอกสาร: {createdDate.day} {createdDate.month} {createdDate.year}</div>
            </div>
          </div>

          {/* Doc Metadata */}
          <div className="space-y-2 mb-6 text-[11pt]">
            <div>
              <span className="font-bold">ส่วนราชการ:</span> กลุ่มบริหารวิชาการ โรงเรียนมกุฎเมืองราชวิทยาลัย
            </div>
            <div className="flex justify-between">
              <div>
                <span className="font-bold">ที่:</span> ศธ ๐๔๓๒๘ / ....................
              </div>
              <div className="w-[50%]">
                <span className="font-bold">วันที่:</span> {createdDate.day} {createdDate.month} {createdDate.year}
              </div>
            </div>
            <div>
              <span className="font-bold">เรื่อง:</span> ขออนุมัติจัดข้าราชการครูและบุคลากรปฏิบัติการสอนแทน
            </div>
            <div>
              <span className="font-bold">เรียน:</span> ผู้อำนวยการโรงเรียนมกุฎเมืองราชวิทยาลัย
            </div>
          </div>

          {/* Doc Content */}
          <div className="space-y-4 text-justify text-[11pt]">
            <p className="indent-12">
              ด้วย ข้าพเจ้า <span className="font-bold">{request.originalTeacherName}</span> ตำแหน่ง ข้าราชการครู / บุคลากรทางการศึกษา มีความจำเป็นต้องลาราชการ / ปฏิบัติหน้าที่ภารกิจภายนอกสถานศึกษา เนื่องด้วย <span className="font-bold underline decoration-dotted underline-offset-4">{request.leaveReason}</span> ในวันที่ <span className="font-bold">{teachingDate.day} {teachingDate.month} {teachingDate.year}</span> ส่งผลให้ไม่สามารถทำการจัดกิจกรรมเรียนรู้ตามตารางปกติได้
            </p>
            <p className="indent-12">
              ในการนี้ เพื่อประโยชน์ในการพัฒนาการเรียนการสอนของนักเรียนอย่างต่อเนื่อง และป้องกันความเสียหายที่อาจเกิดขึ้นแก่หลักสูตรการศึกษา ข้าพเจ้าได้ประสานงานมอบหมายจัดสรรข้าราชการครูเข้าสอนแทนในชั่วโมงเรียนเรียนดังกล่าวเรียบร้อยแล้ว โดยมีรายละเอียดการจัดคาบสอนแทนดังต่อไปนี้:
            </p>

            {/* Substitution Table */}
            <table className="w-full border-collapse border border-slate-400 my-4 text-[10pt]">
              <thead>
                <tr className="bg-slate-100/80 text-center font-bold">
                  <th className="border border-slate-400 p-2 w-[12%]">คาบเรียน</th>
                  <th className="border border-slate-400 p-2 w-[18%]">เวลา</th>
                  <th className="border border-slate-400 p-2 w-[15%]">ระดับชั้น</th>
                  <th className="border border-slate-400 p-2 w-[25%]">วิชา (รหัส/ชื่อ)</th>
                  <th className="border border-slate-400 p-2 w-[30%]">ครูผู้สอนแทน (ลายมือชื่อ/สถานะ)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-400 p-2.5 text-center font-bold">{request.period}</td>
                  <td className="border border-slate-400 p-2.5 text-center font-mono">{request.time}</td>
                  <td className="border border-slate-400 p-2.5 text-center font-bold">{request.gradeLevel}</td>
                  <td className="border border-slate-400 p-2.5">
                    <div className="font-bold">{request.subjectCode}</div>
                    <div className="text-slate-700 text-[9.5pt]">{request.subjectName}</div>
                  </td>
                  <td className="border border-slate-400 p-2.5">
                    <div className="font-bold text-teal-950">{request.substituteTeacherName}</div>
                    <div className="text-[8.5pt] mt-1 text-slate-500 flex items-center gap-1 font-mono">
                      <span>สถานะในระบบ:</span>
                      <span className="font-bold underline decoration-solid text-teal-800">
                        {request.stage === 'acknowledged' ? '✓ ยืนยันรับสอนแทนแล้ว' : '⌛ รอการยืนยัน'}
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <p className="indent-12">
              จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติให้ดำเนินการจัดกิจกรรมการเรียนรู้แทนตามรายละเอียดข้างต้น
            </p>
          </div>
        </div>

        {/* Footers / Signatures Workflow Blocks */}
        <div className="space-y-8 mt-12 text-[10pt]">
          {/* First Row: Teacher & Scheduler */}
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center space-y-6">
              <div className="space-y-1">
                <div>ลงชื่อ ............................................................ ผู้ขอจัดแทน</div>
                <div className="font-bold">({request.originalTeacherName})</div>
                <div className="text-slate-500 text-[9pt]">ครูประจำวิชาผู้ลา / ไปราชการ</div>
              </div>
            </div>
            <div className="text-center space-y-6">
              <div className="space-y-1">
                <div>ลงชื่อ ............................................................ ผู้จัดตาราง</div>
                <div className="font-bold">(............................................................)</div>
                <div className="text-slate-500 text-[9pt]">เจ้าหน้าที่กลุ่มงานบริหารงานวิชาการ (ผู้จัดสอนแทน)</div>
              </div>
            </div>
          </div>

          {/* Second Row: Deputy Director & Director */}
          <div className="grid grid-cols-2 gap-8 border-t border-slate-200 pt-6">
            <div className="space-y-4">
              <div className="font-bold text-slate-800">ความเห็นของรองผู้อำนวยการกลุ่มบริหารวิชาการ</div>
              <div className="space-y-1.5 text-slate-700">
                <div>[  ] ทราบ และเห็นควรเสนออนุมัติ</div>
                <div>[  ] อื่นๆ .....................................................................</div>
                <div className="pt-6">ลงชื่อ ............................................................................</div>
                <div className="pl-6 text-[9.5pt] font-bold text-slate-800">(นางสาวอรชุมา วงศ์ช่าง)</div>
                <div className="pl-6 text-slate-500 text-[8.5pt]">รองผู้อำนวยการกลุ่มบริหารวิชาการ</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="font-bold text-slate-800">คำสั่งการ / ผู้อำนวยการโรงเรียน</div>
              <div className="space-y-1.5 text-slate-700">
                <div>[  ] อนุมัติตามเสนอ</div>
                <div>[  ] ไม่อนุมัติ เนื่องจาก ......................................................</div>
                <div className="pt-6">ลงชื่อ ............................................................................</div>
                <div className="pl-6 text-[9.5pt] font-bold text-slate-800">(นายไชยวิทย์ นพเศรษฐ)</div>
                <div className="pl-6 text-slate-500 text-[8.5pt]">ผู้อำนวยการโรงเรียนมกุฎเมืองราชวิทยาลัย</div>
              </div>
            </div>
          </div>

          {/* Legal Note Footer */}
          <div className="text-center text-slate-400 text-[8.5pt] border-t border-slate-100 pt-2 no-print font-mono">
            เอกสารฉบับนี้เป็นผลลัพธ์การจัดทำและยืนยันผ่านระบบสำนักงานอิเล็กทรอนิกส์ (e-Service) โรงเรียนมกุฎเมืองราชวิทยาลัย
          </div>
        </div>
      </div>
    </div>
  );
};
