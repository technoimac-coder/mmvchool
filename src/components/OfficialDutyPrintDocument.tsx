'use client';

import React from 'react';
import { OfficialDutyRequest } from '../types';
import { Printer, X } from 'lucide-react';

interface OfficialDutyPrintDocumentProps {
  duty: OfficialDutyRequest;
  onClose: () => void;
}

export const OfficialDutyPrintDocument: React.FC<OfficialDutyPrintDocumentProps> = ({ duty, onClose }) => {
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

  const createdDate = parseThaiDate(duty.createdAt);
  const startDate = parseThaiDate(duty.startDate);
  const endDate = parseThaiDate(duty.endDate);

  const deputyDate = parseThaiDate(duty.deputyApproval?.date || duty.createdAt);
  const directorDate = parseThaiDate(duty.directorApproval?.date || duty.createdAt);
  const savedDirectorComment = duty.directorApproval?.comment?.trim() || '';
  const directorComment = ['อนุมัติตามเสนอ', 'เห็นชอบตามเสนอ อนุมัติ'].includes(savedDirectorComment)
    ? ''
    : savedDirectorComment;

  const isSchoolVeh = duty.vehicleType === 'school_vehicle';
  const isPersonalCar = duty.vehicleType === 'personal_car';
  const isPublicTransport = duty.vehicleType === 'public_transport';

  // Budget Text
  const getBudgetText = () => {
    if (duty.budgetCustomText && duty.budgetCustomText.trim()) {
      return duty.budgetCustomText.trim();
    }
    if (duty.budgetType === 'school_budget') {
      return `งบประมาณของโรงเรียนมกุฎเมืองราชวิทยาลัย จำนวน ${duty.budgetAmount.toLocaleString('th-TH')} บาท`;
    }
    if (duty.budgetType === 'organizer_budget') {
      return `งบประมาณจากหน่วยงานผู้จัด (${duty.organizer || 'หน่วยงานภายนอก'})`;
    }
    return 'ไม่ขอเบิกค่าใช้จ่ายในการเดินทางไปราชการ';
  };

  const participantsText = duty.participants && duty.participants.length > 0
    ? duty.participants.join(', ')
    : '-';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-slate-900/70 backdrop-blur-xs flex flex-col items-start sm:items-center p-3 sm:p-5 print:p-0 print:bg-white print-shell">
      {/* Top Floating Bar */}
      <div className="w-full min-w-0 max-w-[210mm] mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/95 backdrop-blur-md px-3 sm:px-5 py-2.5 rounded-2xl shadow-xl border border-slate-200 no-print shrink-0 sticky left-0">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🏢</span>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">แบบขออนุญาตไปราชการ (พิมพ์เอกสารราชการขนาด A4)</h3>
            <p className="text-[11px] text-slate-500">เลขที่คำขอ: {duty.id} | โรงเรียนมกุฎเมืองราชวิทยาลัย</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-200 active:scale-95 transition-all"
          >
            <Printer className="w-4 h-4" />
            พิมพ์เอกสาร / บันทึกเป็น PDF (A4)
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* A4 Paper Container with Strict 14pt Sarabun Typography */}
      <div className="print-paper w-[210mm] min-h-[297mm] bg-white shadow-2xl p-[14mm_22mm_12mm_22mm] text-[#111] font-['TH_Sarabun_New','Sarabun',sans-serif] text-[14pt] leading-[1.38] box-border relative print:shadow-none print:m-0 print:w-[210mm] print:p-[10mm_18mm_8mm_18mm]">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            html, body {
              width: 210mm !important;
              height: 297mm !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
              font-size: 14pt !important;
            }
            .no-print { display: none !important; }
            .print-shell { padding: 0 !important; background: #fff !important; }
            .print-paper {
              width: 210mm !important;
              min-height: 297mm !important;
              margin: 0 !important;
              padding: 10mm 18mm 8mm 18mm !important;
              box-shadow: none !important;
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
              font-size: 14pt !important;
            }
            @page {
              size: A4 portrait;
              margin: 0;
            }
          }
          .duty-text {
            font-size: 14pt;
            line-height: 1.28;
          }
          .dot-line {
            display: inline-block;
            border-bottom: 1px dotted #111;
            padding: 0 4px;
            font-size: 14pt;
            font-weight: 500;
            color: #111;
            text-align: left;
            vertical-align: baseline;
            height: 20px;
            line-height: 19px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .dot-line-center {
            display: inline-block;
            border-bottom: 1px dotted #111;
            padding: 0 2px;
            font-size: 14pt;
            font-weight: 500;
            color: #111;
            text-align: center;
            vertical-align: baseline;
            height: 20px;
            line-height: 19px;
            white-space: nowrap;
          }
          .custom-box {
            width: 14px;
            height: 14px;
            border: 1px solid #111;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: bold;
            vertical-align: -1px;
            margin-right: 6px;
            background: #fff;
          }
          .e-sig-area {
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            margin-bottom: -3px;
          }
          .e-sig-font {
            font-family: 'Brush Script MT', 'Dancing Script', cursive, sans-serif;
            font-size: 20pt;
            color: #1d4ed8;
            transform: rotate(-3deg);
            letter-spacing: 0.5px;
          }
          .signature-row {
            display: flex;
            align-items: flex-end;
            justify-content: center;
            gap: 4px;
            line-height: 20px;
          }
          .signature-line {
            display: inline-flex;
            position: relative;
            height: 36px;
            align-items: flex-end;
            justify-content: center;
            border-bottom: 1px dotted #111;
            overflow: visible;
          }
          .signature-image {
            display: block;
            width: auto;
            max-width: 92%;
            max-height: 40px;
            object-fit: contain;
            object-position: center bottom;
            transform: translateY(2px);
          }
        `}} />

        {/* 1. Header Title (16pt Bold) */}
        <h1 className="text-center text-[16pt] font-bold mb-2 tracking-normal text-black">
          แบบขออนุญาตไปราชการ
        </h1>

        {/* 2. Top Right Meta (14pt) */}
        <div className="w-[52%] ml-auto mb-1 text-right leading-tight duty-text">
          <p className="my-0.5">เขียนที่ <span className="dot-line w-[185px]">โรงเรียนมกุฎเมืองราชวิทยาลัย</span></p>
          <p className="my-0.5">
            วันที่ <span className="dot-line-center w-[30px]">{createdDate.day}</span> เดือน <span className="dot-line-center w-[85px]">{createdDate.month}</span> พ.ศ. <span className="dot-line-center w-[45px]">{createdDate.year}</span>
          </p>
        </div>

        {/* 3. Letter Head (14pt) */}
        <div className="space-y-0.5 mt-0.5 duty-text">
          <p className="my-0.5">
            <strong>เรื่อง</strong>&nbsp;&nbsp;&nbsp;&nbsp;ขออนุญาตไปราชการ
          </p>
          <p className="my-0.5">
            <strong>เรียน</strong>&nbsp;&nbsp;&nbsp;&nbsp;ผู้อำนวยการโรงเรียนมกุฎเมืองราชวิทยาลัย
          </p>
        </div>

        {/* 4. Details Body (14pt) */}
        <div className="space-y-0.5 mt-1 duty-text">
          <p className="my-0.5 indent-10">
            ๑. ข้าพเจ้า <span className="dot-line w-[230px]">{duty.userName}</span> ตำแหน่ง <span className="dot-line w-[205px]">{duty.userPosition}</span>
          </p>
          <p className="my-0.5">
            ฝ่าย <span className="dot-line w-[220px]">{duty.department}</span> สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาชลบุรี ระยอง
          </p>
          <p className="my-0.5">
            พร้อมด้วย <span className="dot-line w-[490px]">{participantsText}</span>
          </p>
          <p className="my-0.5">
            ขออนุญาตไปราชการเพื่อ <span className="dot-line w-[410px]">{duty.title}</span>
          </p>
          <p className="my-0.5">
            สถานที่ <span className="dot-line w-[495px]">{duty.location}</span>
          </p>
          <p className="my-0.5">
            ตั้งแต่วันที่ <span className="dot-line-center w-[30px]">{startDate.day}</span> เดือน <span className="dot-line-center w-[80px]">{startDate.month}</span> พ.ศ. <span className="dot-line-center w-[45px]">{startDate.year}</span> ถึงวันที่ <span className="dot-line-center w-[30px]">{endDate.day}</span> เดือน <span className="dot-line-center w-[80px]">{endDate.month}</span> พ.ศ. <span className="dot-line-center w-[45px]">{endDate.year}</span>
          </p>
          <p className="my-0.5">
            ตั้งแต่เวลา <span className="dot-line-center w-[90px]">08:30 น.</span> ถึงเวลา <span className="dot-line-center w-[90px]">16:30 น.</span> รวมไปราชการครั้งนี้ <span className="dot-line-center w-[40px]">{duty.totalDays}</span> วัน
          </p>

          {/* Section 2: Budget */}
          <p className="my-1 indent-10">
            ๒. โดยขออนุมัติเบิกค่าใช้จ่ายในการเดินทางไปราชการจากเงินงบประมาณ
          </p>
          <p className="my-0.5 pl-10">
            <span className="dot-line w-[500px]">{getBudgetText()}</span>
          </p>

          {/* Section 3: Transportation */}
          <p className="my-1 indent-10">
            ๓. การเดินทางไปราชการครั้งนี้ ขออนุญาตเดินทางโดยพาหนะ
          </p>
          <div className="pl-10 space-y-1 my-1">
            <div className="flex items-baseline gap-1">
              <span className="custom-box">{isSchoolVeh ? '✓' : ''}</span>
              <span>รถยนต์ราชการหมายเลขทะเบียน</span>
              <span className="dot-line w-[160px]">{isSchoolVeh ? (duty.licensePlate || 'นข-4521 สุพรรณบุรี') : ''}</span>
              <span>โดยมี</span>
              <span className="dot-line w-[140px]">{isSchoolVeh ? (duty.driverName || 'นายสมปอง ขับดี') : ''}</span>
            </div>
            <p className="pl-5 my-0.5">
              เป็นพนักงานขับรถยนต์ และมี <span className="dot-line w-[200px]">{isSchoolVeh ? (duty.supervisorName || duty.userName) : ''}</span> เป็นผู้ควบคุม
            </p>

            <div className="flex items-baseline gap-1">
              <span className="custom-box">{isPersonalCar ? '✓' : ''}</span>
              <span>รถยนต์ส่วนตัว หมายเลขทะเบียน</span>
              <span className="dot-line w-[290px]">{isPersonalCar ? (duty.personalLicensePlate || 'กข-1234 ระยอง') : ''}</span>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="custom-box">{isPublicTransport ? '✓' : ''}</span>
              <span>พาหนะอื่น ๆ รถโดยสารประจำทางและรับจ้าง</span>
            </div>
          </div>
        </div>

        {/* 5. Applicant Signature Block (14pt centered) */}
        <div className="w-[320px] ml-auto mr-1 my-2 text-center duty-text">
          <div className="space-y-1">
            <p className="signature-row my-0.5 whitespace-nowrap">
              <span>(ลงชื่อ)</span>
              <span className="signature-line w-[165px]">
                {duty.signatureUrl ? <img src={duty.signatureUrl} alt="Signature" className="signature-image" /> : <span className="e-sig-font">{duty.userName.replace('ครู', '').trim()}</span>}
              </span>
              <span>ผู้ขออนุญาต</span>
            </p>
            <p className="my-0.5 whitespace-nowrap">
              (&nbsp;<span className="dot-line-center w-[185px]">{duty.userName}</span>&nbsp;)
            </p>
            <p className="my-0.5 whitespace-nowrap">
              ตำแหน่ง <span className="dot-line-center w-[200px]">{duty.userPosition}</span>
            </p>
          </div>
        </div>

        {/* 6. Bottom 2-Column Approval Section (14pt) */}
        <div className="grid grid-cols-[48%_48%] gap-x-[4%] items-start mt-4 pt-3 border-t border-slate-300 duty-text">
          {/* Left Column: Deputy Director Approval */}
          <div className="text-center space-y-1 pt-12">
            <div className="space-y-1">
              <p className="signature-row my-0.5 whitespace-nowrap">
                <span>(ลงชื่อ)</span>
                <span className="signature-line w-[165px]">
                  {duty.deputyApproval?.signatureUrl ? <img src={duty.deputyApproval.signatureUrl} alt="Deputy Signature" className="signature-image" /> : duty.deputyApproval ? <span className="e-sig-font">{duty.deputyApproval.approvedBy.replace('นาย', '').replace('นาง', '').trim()}</span> : null}
                </span>
              </p>
              <p className="my-0.5 whitespace-nowrap">
                (&nbsp;<span className="dot-line-center w-[185px]">{duty.deputyApproval?.approvedBy || 'นางสาวสุริยาพร นพกรเศรษฐกุล'}</span>&nbsp;)
              </p>
              <p className="my-0.5 font-medium whitespace-nowrap">
                รองผู้อำนวยการกลุ่มบริหารงานบุคคล
              </p>
              <p className="my-0.5 whitespace-nowrap">
                วันที่ <span className="dot-line-center w-[30px]">{deputyDate.day}</span> เดือน <span className="dot-line-center w-[80px]">{deputyDate.month}</span> พ.ศ. <span className="dot-line-center w-[45px]">{deputyDate.year}</span>
              </p>
            </div>
          </div>

          {/* Right Column: Director Decision */}
          <div className="text-center space-y-1">
            <p className="font-bold text-center mb-0.5">ความเห็น</p>
            <p className="my-0.5 text-center">
              <span className="dot-line w-[240px] text-center">{directorComment}</span>
            </p>

            <div className="flex items-center justify-center gap-8 my-2">
              <label className="inline-flex items-center gap-1 font-bold cursor-pointer">
                <span className="custom-box">{duty.status === 'approved' ? '✓' : ''}</span> อนุมัติ
              </label>
              <label className="inline-flex items-center gap-1 font-bold cursor-pointer">
                <span className="custom-box">{duty.status === 'rejected' ? '✓' : ''}</span> ไม่อนุมัติ
              </label>
            </div>

            <div className="mt-3 space-y-1">
              <p className="signature-row my-0.5 whitespace-nowrap">
                <span>(ลงชื่อ)</span>
                <span className="signature-line w-[165px]">
                  {duty.directorApproval?.signatureUrl ? <img src={duty.directorApproval.signatureUrl} alt="Director Signature" className="signature-image" /> : duty.directorApproval ? <span className="e-sig-font">{duty.directorApproval.approvedBy.replace('ดร.', '').replace('นาย', '').trim()}</span> : null}
                </span>
              </p>
              <p className="my-0.5 whitespace-nowrap">
                (&nbsp;<span className="dot-line-center w-[185px]">{duty.directorApproval?.approvedBy || 'นางสาวมณฑาทิพย์ เสาวคนธ์'}</span>&nbsp;)
              </p>
              <p className="my-0.5 font-medium whitespace-nowrap">
                ผู้อำนวยการโรงเรียนมกุฎเมืองราชวิทยาลัย
              </p>
              <p className="my-0.5 whitespace-nowrap">
                วันที่ <span className="dot-line-center w-[30px]">{directorDate.day}</span> เดือน <span className="dot-line-center w-[80px]">{directorDate.month}</span> พ.ศ. <span className="dot-line-center w-[45px]">{directorDate.year}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
