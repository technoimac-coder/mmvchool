'use client';

import React from 'react';
import { LeaveRequest } from '../types';
import { Printer, X } from 'lucide-react';

interface LeavePrintDocumentProps {
  request: LeaveRequest;
  onClose: () => void;
}

export const LeavePrintDocument: React.FC<LeavePrintDocumentProps> = ({ request, onClose }) => {
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

  const createdDate = parseThaiDate(request.createdAt);
  const startDate = parseThaiDate(request.startDate);
  const endDate = parseThaiDate(request.endDate);
  const lastStartDate = parseThaiDate(request.lastLeave?.startDate);
  const lastEndDate = parseThaiDate(request.lastLeave?.endDate);

  const adminDate = parseThaiDate(request.adminReview?.date);
  const deputyDate = parseThaiDate(request.deputyApproval?.date);
  const directorDate = parseThaiDate(request.directorApproval?.date);

  const isSick = request.leaveType === 'sick';
  const isPersonal = request.leaveType === 'personal';
  const isMaternity = request.leaveType === 'maternity';

  // Statistics calculation
  const sickPastCount = isSick ? (request.leaveStats?.pastCount ?? 0) : 0;
  const sickPastDays = isSick ? (request.leaveStats?.pastDays ?? 0) : 0;
  const sickCurrentCount = isSick ? 1 : 0;
  const sickCurrentDays = isSick ? request.totalDays : 0;
  const sickTotalCount = sickPastCount + sickCurrentCount;
  const sickTotalDays = sickPastDays + sickCurrentDays;

  const personalPastCount = isPersonal ? (request.leaveStats?.pastCount ?? 0) : 0;
  const personalPastDays = isPersonal ? (request.leaveStats?.pastDays ?? 0) : 0;
  const personalCurrentCount = isPersonal ? 1 : 0;
  const personalCurrentDays = isPersonal ? request.totalDays : 0;
  const personalTotalCount = personalPastCount + personalCurrentCount;
  const personalTotalDays = personalPastDays + personalCurrentDays;

  const maternityPastCount = isMaternity ? (request.leaveStats?.pastCount ?? 0) : 0;
  const maternityPastDays = isMaternity ? (request.leaveStats?.pastDays ?? 0) : 0;
  const maternityCurrentCount = isMaternity ? 1 : 0;
  const maternityCurrentDays = isMaternity ? request.totalDays : 0;
  const maternityTotalCount = maternityPastCount + maternityCurrentCount;
  const maternityTotalDays = maternityPastDays + maternityCurrentDays;

  const handlePrint = () => {
    window.print();
  };

  const renderCheck = (checked: boolean) => (
    <span className="font-bold text-[13pt] inline-block w-[18px] text-center">
      {checked ? '✓' : ' '}
    </span>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-slate-900/70 backdrop-blur-xs flex flex-col items-start sm:items-center p-3 sm:p-5 print:p-0 print:bg-white print-shell">
      {/* Top Floating Bar (Hidden on print) */}
      <div className="w-full min-w-0 max-w-[210mm] mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/95 backdrop-blur-md px-3 sm:px-5 py-2.5 rounded-2xl shadow-xl border border-slate-200 no-print shrink-0 sticky left-0">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">📄</span>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">แบบใบลาป่วย ลากิจส่วนตัว ลาคลอดบุตร (เส้นประเดี่ยวเรียบร้อย)</h3>
            <p className="text-[11px] text-slate-500">เลขที่คำขอ: {request.id} | แก้ไขเส้นประซ้อน ให้เป็นเส้นเดี่ยวมาตรฐาน 100%</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200 active:scale-95 transition-all"
          >
            <Printer className="w-4 h-4" />
            พิมพ์เอกสาร / บันทึกเป็น PDF
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* A4 Paper Container */}
      <div className="print-paper w-[210mm] min-h-[297mm] bg-white shadow-2xl p-[10mm_18mm_8mm_18mm] text-[#000] font-['TH_Sarabun_New','Sarabun',sans-serif] text-[14pt] leading-[1.28] box-border relative print:shadow-none print:m-0 print:w-[210mm] print:p-[8mm_16mm_6mm_16mm]">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            html, body {
              width: 210mm !important;
              height: 297mm !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
            }
            .no-print { display: none !important; }
            .print-shell { padding: 0 !important; background: #fff !important; }
            .print-paper {
              width: 210mm !important;
              min-height: 297mm !important;
              margin: 0 !important;
              padding: 8mm 16mm 6mm 16mm !important;
              box-shadow: none !important;
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
            }
            @page {
              size: A4 portrait;
              margin: 0;
            }
          }
          .dot-val {
            display: inline-block;
            border-bottom: 1px dotted #000;
            padding: 0 5px;
            font-weight: 500;
            color: #000;
            text-align: left;
            vertical-align: baseline;
            height: 19px;
            line-height: 18px;
          }
          .dot-val-center {
            display: inline-block;
            border-bottom: 1px dotted #000;
            padding: 0 2px;
            font-weight: 500;
            color: #000;
            text-align: center;
            vertical-align: baseline;
            height: 19px;
            line-height: 18px;
          }
          .signatory-name {
            width: auto;
            white-space: nowrap;
            padding-left: 8px;
            padding-right: 8px;
          }
          .e-sig-area {
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
          }
        `}} />

        {/* 1. Header Title (16pt bold) */}
        <h1 className="text-center text-[16pt] font-bold mb-2 tracking-normal">
          แบบใบลาป่วย ลากิจส่วนตัว ลาคลอดบุตร
        </h1>

        {/* 2. Top Right Written At & Date */}
        <div className="w-[50%] ml-auto mb-1 text-right">
          <p className="my-0.5">เขียนที่ <span className="dot-val w-[180px]">{request.writtenAt || 'โรงเรียนมกุฎเมืองราชวิทยาลัย'}</span></p>
          <p className="my-0.5">
            วันที่ <span className="dot-val-center w-[30px]">{createdDate.day}</span> เดือน <span className="dot-val-center w-[85px]">{createdDate.month}</span> พ.ศ. <span className="dot-val-center w-[45px]">{createdDate.year}</span>
          </p>
        </div>

        {/* 3. Letter Body (14pt) */}
        <div className="space-y-0.5 mt-0.5">
          <p className="my-0.5">
            เรื่อง <span className="dot-val w-[380px]">ขอลา{isSick ? 'ป่วย' : isPersonal ? 'กิจส่วนตัว' : isMaternity ? 'คลอดบุตร' : request.otherLeaveDetails || 'อื่นๆ'}</span>
          </p>
          <p className="my-0.5">เรียน ผู้อำนวยการโรงเรียนมกุฎเมืองราชวิทยาลัย</p>
          
          <p className="my-0.5 indent-10">
            ข้าพเจ้า <span className="dot-val w-[240px]">{request.userName}</span> ตำแหน่ง <span className="dot-val w-[210px]">{request.userPosition}</span>
          </p>
          <p className="my-0.5">
            สังกัดสำนักงานเขตพื้นที่การศึกษามัธยมศึกษาชลบุรี ระยอง
          </p>

          {/* Leave Type with Parentheses ( / ) */}
          <div className="my-1 pl-8 space-y-0.5">
            <div className="flex items-baseline gap-1">
              <span className="w-[50px] shrink-0 font-medium text-right pr-2">ขอลา</span>
              <span className="shrink-0">( {renderCheck(isSick)} ) ป่วยเนื่องจาก</span>
              <span className="dot-val flex-1">{isSick ? request.reason : ''}</span>
            </div>
            <div className="flex items-baseline gap-1 pl-[50px]">
              <span className="shrink-0">( {renderCheck(isPersonal)} ) กิจส่วนตัว เนื่องจาก</span>
              <span className="dot-val flex-1">{isPersonal ? request.reason : ''}</span>
            </div>
            <div className="flex items-baseline gap-1 pl-[50px]">
              <span>( {renderCheck(isMaternity)} ) คลอดบุตร</span>
            </div>
          </div>

          <p className="my-0.5">
            ตั้งแต่วันที่ <span className="dot-val-center w-[30px]">{startDate.day}</span> เดือน <span className="dot-val-center w-[80px]">{startDate.month}</span> พ.ศ. <span className="dot-val-center w-[45px]">{startDate.year}</span> ถึงวันที่ <span className="dot-val-center w-[30px]">{endDate.day}</span> เดือน <span className="dot-val-center w-[80px]">{endDate.month}</span> พ.ศ. <span className="dot-val-center w-[45px]">{endDate.year}</span> มีกำหนด <span className="dot-val-center w-[35px]">{request.totalDays}</span> วัน
          </p>

          <p className="my-0.5">
            ข้าพเจ้าเคยลา &nbsp;&nbsp;&nbsp;&nbsp;
            ( {renderCheck(request.lastLeave?.type === 'sick')} ) ป่วย &nbsp;&nbsp;&nbsp;&nbsp;
            ( {renderCheck(request.lastLeave?.type === 'personal')} ) กิจส่วนตัว &nbsp;&nbsp;&nbsp;&nbsp;
            ( {renderCheck(request.lastLeave?.type === 'maternity')} ) คลอดบุตร
          </p>

          <p className="my-0.5">
            ครั้งสุดท้ายตั้งแต่วันที่ <span className="dot-val-center w-[30px]">{lastStartDate.day}</span> เดือน <span className="dot-val-center w-[80px]">{lastStartDate.month}</span> พ.ศ. <span className="dot-val-center w-[45px]">{lastStartDate.year}</span> ถึงวันที่ <span className="dot-val-center w-[30px]">{lastEndDate.day}</span> เดือน <span className="dot-val-center w-[80px]">{lastEndDate.month}</span> พ.ศ. <span className="dot-val-center w-[45px]">{lastEndDate.year}</span>
          </p>

          <p className="my-1 text-left">
            ในระหว่างการลาขอติดต่อข้าพเจ้าได้ที่ <span className="dot-val w-[440px]">{request.contactAddress || 'บ้านพักครู รร.มกุฎเมืองราชวิทยาลัย'} (โทร. {request.contactPhone || '-'})</span>
          </p>
        </div>

        {/* 4. Applicant Signature Block */}
        <div className="w-[300px] ml-auto mr-3 my-2 text-center">
          <p className="mb-1">ขอแสดงความนับถือ</p>
          
          {/* E-Signature Area */}
          <div className="e-sig-area min-h-[36px] flex items-end justify-center mb-0.5">
            {request.signatureUrl ? (
              <img src={request.signatureUrl} alt="Signature" className="max-h-10 max-w-[160px] object-contain mx-auto" />
            ) : null}
          </div>

          <p className="my-0.5">ลงชื่อ <span className="dot-val-center w-[170px]"></span></p>
          <p className="my-0.5">( <span className="dot-val-center signatory-name">{request.userName}</span> )</p>
        </div>

        {/* 5. Bottom 2-Column Approval Section */}
        <div className="grid grid-cols-[52%_48%] gap-x-6 items-start mt-3 pt-2 border-t border-slate-200">
          {/* Left Column: Statistics Table & Admin Review */}
          <div>
            <table className="w-full border-collapse border border-black text-[12pt] text-center leading-tight">
              <thead>
                <tr>
                  <th rowSpan={2} className="border border-black p-1 text-center w-[36%] font-semibold">ประเภทการลา</th>
                  <th colSpan={2} className="border border-black p-0.5 font-semibold">ลามาแล้ว</th>
                  <th colSpan={2} className="border border-black p-0.5 font-semibold">ลาครั้งนี้</th>
                  <th colSpan={2} className="border border-black p-0.5 font-semibold">รวมเป็น</th>
                </tr>
                <tr>
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
                  <td className="border border-black p-1 text-center">ป่วย (ทำการ)</td>
                  <td className="border border-black p-0.5">{sickPastCount > 0 ? sickPastCount : ''}</td>
                  <td className="border border-black p-0.5">{sickPastDays > 0 ? sickPastDays : ''}</td>
                  <td className="border border-black p-0.5">{sickCurrentCount > 0 ? sickCurrentCount : ''}</td>
                  <td className="border border-black p-0.5">{sickCurrentDays > 0 ? sickCurrentDays : ''}</td>
                  <td className="border border-black p-0.5 font-bold">{sickTotalCount > 0 ? sickTotalCount : ''}</td>
                  <td className="border border-black p-0.5 font-bold">{sickTotalDays > 0 ? sickTotalDays : ''}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center">ลาคลอดบุตร</td>
                  <td className="border border-black p-0.5">{maternityPastCount > 0 ? maternityPastCount : ''}</td>
                  <td className="border border-black p-0.5">{maternityPastDays > 0 ? maternityPastDays : ''}</td>
                  <td className="border border-black p-0.5">{maternityCurrentCount > 0 ? maternityCurrentCount : ''}</td>
                  <td className="border border-black p-0.5">{maternityCurrentDays > 0 ? maternityCurrentDays : ''}</td>
                  <td className="border border-black p-0.5 font-bold">{maternityTotalCount > 0 ? maternityTotalCount : ''}</td>
                  <td className="border border-black p-0.5 font-bold">{maternityTotalDays > 0 ? maternityTotalDays : ''}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center">ลากิจส่วนตัว (ทำการ)</td>
                  <td className="border border-black p-0.5">{personalPastCount > 0 ? personalPastCount : ''}</td>
                  <td className="border border-black p-0.5">{personalPastDays > 0 ? personalPastDays : ''}</td>
                  <td className="border border-black p-0.5">{personalCurrentCount > 0 ? personalCurrentCount : ''}</td>
                  <td className="border border-black p-0.5">{personalCurrentDays > 0 ? personalCurrentDays : ''}</td>
                  <td className="border border-black p-0.5 font-bold">{personalTotalCount > 0 ? personalTotalCount : ''}</td>
                  <td className="border border-black p-0.5 font-bold">{personalTotalDays > 0 ? personalTotalDays : ''}</td>
                </tr>
              </tbody>
            </table>

            {/* Officer / Admin Review with Single Dotted Line */}
            <div className="text-center mt-2 space-y-0.5">
              <div className="e-sig-area min-h-[30px] flex items-end justify-center mb-0.5">
                {request.adminReview?.signatureUrl ? (
                  <img src={request.adminReview.signatureUrl} alt="Admin Signature" className="max-h-8 max-w-[140px] object-contain mx-auto" />
                ) : null}
              </div>
              <p className="my-0.5">ลงชื่อ <span className="dot-val-center w-[160px]"></span></p>
              <p className="my-0.5">( <span className="dot-val-center signatory-name">{request.adminReview?.approvedBy || 'นางสาวอัชฌาพัชญ์ แก้วแกมกาญจน์'}</span> )</p>
              <p className="my-0.5">ตำแหน่ง <span className="dot-val w-[160px]">{request.adminReview?.approverRole || 'ครูชำนาญการพิเศษ'}</span></p>
              <p className="my-0.5">
                วันที่ <span className="dot-val-center w-[25px]">{adminDate.day}</span> เดือน <span className="dot-val-center w-[70px]">{adminDate.month}</span> พ.ศ. <span className="dot-val-center w-[40px]">{adminDate.year}</span>
              </p>
            </div>
          </div>

          {/* Right Column: Deputy & Director Approval */}
          <div className="space-y-3">
            {/* Deputy Approval with Single Dotted Line */}
            <div className="text-center space-y-0.5">
              <div className="e-sig-area min-h-[30px] flex items-end justify-center mb-0.5">
                {request.deputyApproval?.signatureUrl ? (
                  <img src={request.deputyApproval.signatureUrl} alt="Deputy Signature" className="max-h-8 max-w-[140px] object-contain mx-auto" />
                ) : null}
              </div>
              <p className="my-0.5">ลงชื่อ <span className="dot-val-center w-[160px]"></span></p>
              <p className="my-0.5">( <span className="dot-val-center signatory-name">{request.deputyApproval?.approvedBy || 'นางสาวสุริยาพร นพกรเศรษฐกุล'}</span> )</p>
              <p className="my-0.5 font-medium">รองผู้อำนวยการโรงเรียนมกุฎเมืองราชวิทยาลัย</p>
              <p className="my-0.5">
                วันที่ <span className="dot-val-center w-[25px]">{deputyDate.day}</span> เดือน <span className="dot-val-center w-[70px]">{deputyDate.month}</span> พ.ศ. <span className="dot-val-center w-[40px]">{deputyDate.year}</span>
              </p>
            </div>

            {/* Director Decision with Single Dotted Line */}
            <div className="text-center space-y-0.5 pt-1">
              <p className="my-0.5">
                ( {renderCheck(request.status === 'approved')} ) อนุญาต &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                ( {renderCheck(request.status === 'rejected')} ) ไม่อนุญาต
              </p>
              <p className="my-0.5 text-center">
                <span className="dot-val w-[240px] text-center">{request.directorApproval?.comment || 'อนุมัติตามเสนอ'}</span>
              </p>
              <p className="my-0.5 text-center">
                <span className="dot-val w-[240px] text-center"></span>
              </p>
              
              <div className="mt-1 space-y-0.5">
                <div className="e-sig-area min-h-[30px] flex items-end justify-center mb-0.5">
                  {request.directorApproval?.signatureUrl ? (
                    <img src={request.directorApproval.signatureUrl} alt="Director Signature" className="max-h-8 max-w-[140px] object-contain mx-auto" />
                  ) : null}
                </div>
                <p className="my-0.5">ลงชื่อ <span className="dot-val-center w-[160px]"></span></p>
                <p className="my-0.5">( <span className="dot-val-center signatory-name">{request.directorApproval?.approvedBy || 'นางสาวมณฑาทิพย์ เสาวคนธ์'}</span> )</p>
                <p className="my-0.5 font-medium">ผู้อำนวยการโรงเรียนมกุฎเมืองราชวิทยาลัย</p>
                <p className="my-0.5">
                  วันที่ <span className="dot-val-center w-[25px]">{directorDate.day}</span> เดือน <span className="dot-val-center w-[70px]">{directorDate.month}</span> พ.ศ. <span className="dot-val-center w-[40px]">{directorDate.year}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
