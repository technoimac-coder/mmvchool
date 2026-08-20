'use client';

import React from 'react';
import { LeaveRequest, User } from '../types';
import { Printer, X } from 'lucide-react';

interface OfficialLeaveDocumentProps {
  request: LeaveRequest;
  onClose: () => void;
}

export const OfficialLeaveDocument: React.FC<OfficialLeaveDocumentProps> = ({ request, onClose }) => {
  // Convert standard date string YYYY-MM-DD to Thai Date text
  const formatThaiDate = (dateStr: string) => {
    if (!dateStr) return { day: '...', month: '...............', year: '.......' };
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const parts = dateStr.split('-');
    if (parts.length < 3) return { day: '...', month: '...............', year: '.......' };
    const day = parseInt(parts[2], 10).toString();
    const month = months[parseInt(parts[1], 10) - 1] || '...............';
    const year = (parseInt(parts[0], 10) > 2400 ? parseInt(parts[0], 10) : parseInt(parts[0], 10) + 543).toString();
    return { day, month, year };
  };

  const createdDate = formatThaiDate(request.createdAt);
  const startDate = formatThaiDate(request.startDate);
  const endDate = formatThaiDate(request.endDate);

  const isSick = request.leaveType === 'sick';
  const isPersonal = request.leaveType === 'personal';
  const isMaternity = request.leaveType === 'maternity';
  const isOther = request.leaveType === 'other';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Container with print controls */}
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[96vh] flex flex-col">
        {/* Top bar (Hidden on print) */}
        <div className="p-4 bg-slate-800 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-lg">📄</span>
            <span className="font-bold text-sm">ตัวอย่างแบบพิมพ์ใบลาตามระเบียบราชการ (A4)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              พิมพ์เอกสาร (Print / PDF)
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Document Sheet (A4 format) */}
        <div className="p-8 sm:p-12 overflow-y-auto flex-1 bg-white text-black font-serif text-[13px] leading-relaxed select-text print:p-0 print:m-0 print:overflow-visible">
          {/* Header Title */}
          <div className="text-center font-bold text-base tracking-wide mb-6">
            แบบใบลาป่วย ลากิจส่วนตัว ลาคลอดบุตร
          </div>

          {/* Top Right Header Location & Date */}
          <div className="flex justify-end mb-4">
            <div className="w-72 space-y-1">
              <div>
                เขียนที่ <span className="font-sans font-medium border-b border-dotted border-black pb-0.5 px-2">โรงเรียนมกุฎเมืองราชวิทยาลัย</span>
              </div>
              <div>
                วันที่ <span className="font-sans font-medium border-b border-dotted border-black px-2">{createdDate.day}</span>
                เดือน <span className="font-sans font-medium border-b border-dotted border-black px-2">{createdDate.month}</span>
                พ.ศ. <span className="font-sans font-medium border-b border-dotted border-black px-2">{createdDate.year}</span>
              </div>
            </div>
          </div>

          {/* Subject & Recipient */}
          <div className="space-y-1.5 mb-4">
            <div>
              เรื่อง <span className="font-sans font-medium border-b border-dotted border-black pb-0.5 px-2">
                ขอ{isSick ? 'ลาป่วย' : isPersonal ? 'ลากิจส่วนตัว' : isMaternity ? 'ลาคลอดบุตร' : `ลา (${request.otherLeaveDetails || 'อื่นๆ'})`}
              </span>
            </div>
            <div>
              เรียน <span className="font-sans font-medium">ผู้อำนวยการโรงเรียนมกุฎเมืองราชวิทยาลัย</span>
            </div>
          </div>

          {/* Body Statement */}
          <div className="space-y-2 text-justify">
            <div className="indent-12 leading-loose">
              ข้าพเจ้า <span className="font-sans font-bold border-b border-dotted border-black px-2">{request.userName}</span>
              ตำแหน่ง <span className="font-sans font-medium border-b border-dotted border-black px-2">{request.userPosition}</span>
            </div>
            <div>
              สังกัดสำนักงานเขตพื้นที่การศึกษามัธยมศึกษาชลบุรี ระยอง
            </div>

            <div className="space-y-1.5 pl-12 pt-1">
              <div className="flex items-center gap-2">
                <span>({isSick ? ' ✓ ' : '   '})</span>
                <span>ป่วย เนื่องจาก</span>
                <span className="font-sans font-medium border-b border-dotted border-black flex-1 px-2">
                  {isSick ? request.reason : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>({isPersonal ? ' ✓ ' : '   '})</span>
                <span>กิจส่วนตัว เนื่องจาก</span>
                <span className="font-sans font-medium border-b border-dotted border-black flex-1 px-2">
                  {isPersonal ? request.reason : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>({isMaternity ? ' ✓ ' : isOther ? ' ✓ ' : '   '})</span>
                <span>{isMaternity ? 'คลอดบุตร' : isOther ? `อื่นๆ: ${request.otherLeaveDetails || ''} (${request.reason})` : 'คลอดบุตร'}</span>
              </div>
            </div>

            <div className="pt-2 leading-loose">
              ตั้งแต่วันที่ <span className="font-sans font-medium border-b border-dotted border-black px-2">{startDate.day}</span>
              เดือน <span className="font-sans font-medium border-b border-dotted border-black px-2">{startDate.month}</span>
              พ.ศ. <span className="font-sans font-medium border-b border-dotted border-black px-2">{startDate.year}</span>
              ถึงวันที่ <span className="font-sans font-medium border-b border-dotted border-black px-2">{endDate.day}</span>
              เดือน <span className="font-sans font-medium border-b border-dotted border-black px-2">{endDate.month}</span>
              พ.ศ. <span className="font-sans font-medium border-b border-dotted border-black px-2">{endDate.year}</span>
              มีกำหนด <span className="font-sans font-bold border-b border-dotted border-black px-3">{request.totalDays}</span> วัน
            </div>

            <div className="leading-loose">
              ข้าพเจ้าเคยลา ( ) ป่วย ( ) กิจส่วนตัว ( ) คลอดบุตร ครั้งสุดท้ายตั้งแต่วันที่..............เดือน..........................พ.ศ. .......... ถึงวันที่..............เดือน..........................พ.ศ. ..........
            </div>

            <div className="pt-1">
              ในระหว่างการลาจะติดต่อข้าพเจ้าได้ที่ <span className="font-sans font-medium border-b border-dotted border-black px-2">{request.contactPhone || 'เบอร์โทรศัพท์ตามทะเบียนประวัติ'}</span>
            </div>
          </div>

          {/* Signature of Applicant */}
          <div className="flex justify-end mt-4 mb-6">
            <div className="text-center w-72 space-y-1">
              <div>ขอแสดงความนับถือ</div>
              <div className="pt-6 font-sans font-medium">
                ลงชื่อ <span className="border-b border-dotted border-black px-6">{request.userName}</span>
              </div>
              <div className="font-sans text-xs">
                ( <span className="px-2">{request.userName}</span> )
              </div>
            </div>
          </div>

          {/* Lower Grid: Statistics Table & 3-stage Approval Signatures */}
          <div className="grid grid-cols-2 gap-6 pt-2 border-t border-slate-300">
            {/* Left Column: Leave Stats Table & Admin Signature */}
            <div className="space-y-4">
              <table className="w-full border-collapse border border-black text-center text-xs font-sans">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-black p-1 font-semibold">ประเภทการลา</th>
                    <th colSpan={2} className="border border-black p-1 font-semibold">ลามาแล้ว</th>
                    <th colSpan={2} className="border border-black p-1 font-semibold">ลาครั้งนี้</th>
                    <th colSpan={2} className="border border-black p-1 font-semibold">รวมเป็น</th>
                  </tr>
                  <tr className="bg-slate-50 text-[10px]">
                    <th className="border border-black p-0.5"></th>
                    <th className="border border-black p-0.5 font-normal">ครั้ง</th>
                    <th className="border border-black p-0.5 font-normal">วัน</th>
                    <th className="border border-black p-0.5 font-normal">ครั้ง</th>
                    <th className="border border-black p-0.5 font-normal">วัน</th>
                    <th className="border border-black p-0.5 font-normal">ครั้ง</th>
                    <th className="border border-black p-0.5 font-normal">วัน</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-1 text-left font-serif">ป่วย (ทำการ)</td>
                    <td className="border border-black p-1 font-mono">{isSick ? '1' : '0'}</td>
                    <td className="border border-black p-1 font-mono">{isSick ? '2' : '0'}</td>
                    <td className="border border-black p-1 font-mono">{isSick ? '1' : '-'}</td>
                    <td className="border border-black p-1 font-mono">{isSick ? request.totalDays : '-'}</td>
                    <td className="border border-black p-1 font-mono font-bold">{isSick ? request.totalDays + 2 : '0'}</td>
                    <td className="border border-black p-1 font-mono font-bold">{isSick ? request.totalDays + 2 : '0'}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1 text-left font-serif">ลาคลอดบุตร</td>
                    <td className="border border-black p-1 font-mono">-</td>
                    <td className="border border-black p-1 font-mono">-</td>
                    <td className="border border-black p-1 font-mono">{isMaternity ? '1' : '-'}</td>
                    <td className="border border-black p-1 font-mono">{isMaternity ? request.totalDays : '-'}</td>
                    <td className="border border-black p-1 font-mono font-bold">{isMaternity ? request.totalDays : '0'}</td>
                    <td className="border border-black p-1 font-mono font-bold">{isMaternity ? request.totalDays : '0'}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1 text-left font-serif">ลากิจส่วนตัว (ทำการ)</td>
                    <td className="border border-black p-1 font-mono">{isPersonal ? '1' : '0'}</td>
                    <td className="border border-black p-1 font-mono">{isPersonal ? '1' : '0'}</td>
                    <td className="border border-black p-1 font-mono">{isPersonal ? '1' : '-'}</td>
                    <td className="border border-black p-1 font-mono">{isPersonal ? request.totalDays : '-'}</td>
                    <td className="border border-black p-1 font-mono font-bold">{isPersonal ? request.totalDays + 1 : '0'}</td>
                    <td className="border border-black p-1 font-mono font-bold">{isPersonal ? request.totalDays + 1 : '0'}</td>
                  </tr>
                </tbody>
              </table>

              {/* Stage 1 Signature: Admin / Head */}
              <div className="pt-2 text-center text-xs space-y-1 font-sans">
                <div>
                  ลงชื่อ <span className="border-b border-dotted border-black px-4 font-medium">{request.adminReview?.approvedBy || '..........................................................'}</span>
                </div>
                <div>
                  ( <span className="px-2">{request.adminReview?.approvedBy || '..........................................................'}</span> )
                </div>
                <div>
                  ตำแหน่ง <span className="border-b border-dotted border-black px-2">{request.adminReview?.approverRole || 'เจ้าหน้าที่งานสารบรรณบุคคล'}</span>
                </div>
                <div>
                  วันที่ <span className="border-b border-dotted border-black px-2">{request.adminReview?.date ? formatThaiDate(request.adminReview.date).day : '........'}</span>
                  เดือน <span className="border-b border-dotted border-black px-2">{request.adminReview?.date ? formatThaiDate(request.adminReview.date).month : '................'}</span>
                  พ.ศ. <span className="border-b border-dotted border-black px-2">{request.adminReview?.date ? formatThaiDate(request.adminReview.date).year : '........'}</span>
                </div>
              </div>
            </div>

            {/* Right Column: Deputy Director & Director Approval */}
            <div className="space-y-4 font-sans text-xs">
              {/* Stage 2 Signature: Deputy Director */}
              <div className="text-center space-y-1">
                <div>
                  ลงชื่อ <span className="border-b border-dotted border-black px-4 font-medium">{request.deputyApproval?.approvedBy || '..........................................................'}</span>
                </div>
                <div>
                  ( <span className="px-2">{request.deputyApproval?.approvedBy || 'นางสาวสุริยาพร นพกรเศรษฐกุล'}</span> )
                </div>
                <div className="font-serif">รองผู้อำนวยการโรงเรียนมกุฎเมืองราชวิทยาลัย</div>
                <div>
                  วันที่ <span className="border-b border-dotted border-black px-2">{request.deputyApproval?.date ? formatThaiDate(request.deputyApproval.date).day : '........'}</span>
                  เดือน <span className="border-b border-dotted border-black px-2">{request.deputyApproval?.date ? formatThaiDate(request.deputyApproval.date).month : '................'}</span>
                  พ.ศ. <span className="border-b border-dotted border-black px-2">{request.deputyApproval?.date ? formatThaiDate(request.deputyApproval.date).year : '........'}</span>
                </div>
              </div>

              {/* Stage 3 Signature: Director Final Approval */}
              <div className="pt-2 text-center space-y-1">
                <div className="flex items-center justify-center gap-4 mb-1">
                  <span>({request.status === 'approved' ? ' ✓ ' : '   '}) อนุญาต</span>
                  <span>({request.status === 'rejected' ? ' ✓ ' : '   '}) ไม่อนุญาต</span>
                </div>
                {request.directorApproval?.comment && (
                  <div className="text-[11px] text-slate-700 italic pb-1">
                    &quot;{request.directorApproval.comment}&quot;
                  </div>
                )}
                <div>
                  ลงชื่อ <span className="border-b border-dotted border-black px-4 font-medium">{request.directorApproval?.approvedBy || '..........................................................'}</span>
                </div>
                <div>
                  ( <span className="px-2">{request.directorApproval?.approvedBy || 'นางสาวมณฑาทิพย์ เสาวคนธ์'}</span> )
                </div>
                <div className="font-serif">ผู้อำนวยการโรงเรียนมกุฎเมืองราชวิทยาลัย</div>
                <div>
                  วันที่ <span className="border-b border-dotted border-black px-2">{request.directorApproval?.date ? formatThaiDate(request.directorApproval.date).day : '........'}</span>
                  เดือน <span className="border-b border-dotted border-black px-2">{request.directorApproval?.date ? formatThaiDate(request.directorApproval.date).month : '................'}</span>
                  พ.ศ. <span className="border-b border-dotted border-black px-2">{request.directorApproval?.date ? formatThaiDate(request.directorApproval.date).year : '........'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
