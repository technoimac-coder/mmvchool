'use client';

import React from 'react';
import { Printer, X } from 'lucide-react';
import { LeaveRequest } from '../types';

interface ForeignLeavePrintDocumentProps {
  request: LeaveRequest;
  onClose: () => void;
}

const formatDateParts = (value?: string) => {
  if (!value) return { day: '', month: '', year: '' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { day: '', month: '', year: '' };
  return {
    day: String(date.getDate()),
    month: date.toLocaleString('en-US', { month: 'long' }),
    year: String(date.getFullYear()),
  };
};

const positionTranslations: Record<string, string> = {
  'ครูอัตราจ้าง': 'Contract Teacher',
  'ครูผู้ช่วย': 'Assistant Teacher',
  'ครู': 'Teacher',
  'ครูชำนาญการ': 'Professional Level Teacher',
  'ครูชำนาญการพิเศษ': 'Senior Professional Level Teacher',
};

export const ForeignLeavePrintDocument: React.FC<ForeignLeavePrintDocumentProps> = ({ request, onClose }) => {
  const [previewScale, setPreviewScale] = React.useState(1);

  React.useEffect(() => {
    const updatePreviewScale = () => {
      const a4WidthPx = (210 / 25.4) * 96;
      setPreviewScale(Math.min(1, Math.max(0.35, (window.innerWidth - 24) / a4WidthPx)));
    };
    updatePreviewScale();
    window.addEventListener('resize', updatePreviewScale);
    return () => window.removeEventListener('resize', updatePreviewScale);
  }, []);

  const englishSignatories = {
    head: 'Miss Parichart Boonmee',
    deputy: 'Miss Suriyapohn Noppakornsettakul',
    director: 'Miss Monthatip Saowakon',
  };
  const englishNameByThaiName: Record<string, string> = {
    'นางสาวปาริชาต บุญมี': englishSignatories.head,
    'นางสาวสุริยาพร นพกรเศรษฐกุล': englishSignatories.deputy,
    'นางสาวมณฑาทิพย์ เสาวคนธ์': englishSignatories.director,
  };
  const displaySignatoryName = (name?: string, fallback = '') => name ? (englishNameByThaiName[name] || name) : fallback;
  const formDate = formatDateParts(request.createdAt);
  const startDate = formatDateParts(request.startDate);
  const endDate = formatDateParts(request.endDate);
  const adminDate = formatDateParts(request.adminReview?.date);
  const deputyDate = formatDateParts(request.deputyApproval?.date);
  const directorDate = formatDateParts(request.directorApproval?.date);
  const position = positionTranslations[request.userPosition?.trim()] || request.userPosition || '';
  const isChecked = (value: boolean) => value ? '✓' : '';
  const leaveTypes = [
    { key: 'sick' as const, label: 'Sick Leave' },
    { key: 'personal' as const, label: 'Personal Leave' },
    { key: 'maternity' as const, label: 'Maternity Leave' },
  ];
  const leaveStatistics = leaveTypes.map(({ key, label }) => {
    const summary = request.leaveSummary?.[key];
    const isCurrentType = request.leaveType === key;
    const pastCount = summary?.pastCount ?? (isCurrentType ? request.leaveStats?.pastCount ?? 0 : 0);
    const pastDays = summary?.pastDays ?? (isCurrentType ? request.leaveStats?.pastDays ?? 0 : 0);
    const currentCount = summary?.currentCount ?? (isCurrentType ? 1 : 0);
    const currentDays = summary?.currentDays ?? (isCurrentType ? request.totalDays : 0);
    return {
      key,
      label,
      pastCount,
      pastDays,
      currentCount,
      currentDays,
      totalCount: summary?.totalCount ?? pastCount + currentCount,
      totalDays: summary?.totalDays ?? pastDays + currentDays,
    };
  });

  const approvalBlock = (
    title: string,
    step: LeaveRequest['adminReview'],
    date: ReturnType<typeof formatDateParts>,
    fallbackName: string,
  ) => (
    <section className="foreign-approval">
      <h2>{title}</h2>
      <div className="foreign-decisions">
        <span className="foreign-radio">{isChecked(step?.status === 'approved')}</span><span>Approved</span>
        <span className="foreign-radio">{isChecked(step?.status === 'rejected')}</span><span>Disapproved</span>
      </div>
      <div className="foreign-comment-line">{step?.comment || ''}</div>
      <div className="foreign-comment-line" />
      <div className="foreign-signature-row">
        <span>Signature</span>
        <span className="foreign-signature-line">
          {step?.signatureUrl ? <img src={step.signatureUrl} alt={`${title} signature`} /> : null}
        </span>
      </div>
      <div className="foreign-name">( {displaySignatoryName(step?.approvedBy, fallbackName)} )</div>
      <div className="foreign-date-row">
        <span>Date</span><span>{date.day}</span><span>Month</span><span>{date.month}</span><span>Year</span><span>{date.year}</span>
      </div>
    </section>
  );

  const handlePrint = async () => {
    await document.fonts.ready;
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-slate-900/70 backdrop-blur-xs flex flex-col items-start sm:items-center p-3 sm:p-5 print:p-0 print:bg-white" data-no-auto-translate="true">
      <div className="w-full max-w-[210mm] mb-3 flex items-center justify-between gap-3 bg-white/95 px-4 py-2.5 rounded-2xl shadow-xl border border-slate-200 no-print sticky left-0 top-0 z-10">
        <div>
          <h3 className="font-bold text-slate-800 text-sm">Foreign Teacher Leave Form</h3>
          <p className="text-[11px] text-slate-500">Request ID: {request.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handlePrint} className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md">
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        className="foreign-leave-stage"
        style={{ width: `${210 * previewScale}mm`, height: `${297 * previewScale}mm` }}
      >
      <main className="foreign-leave-paper" style={{ transform: `scale(${previewScale})` }}>
        <style dangerouslySetInnerHTML={{ __html: `
          .foreign-leave-paper{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:10mm 16mm 8mm;box-sizing:border-box;color:#111;font-family:'TH SarabunPSK','Sarabun',sans-serif;font-size:14pt;line-height:1.1;box-shadow:0 5px 22px rgba(0,0,0,.18)}
          .foreign-leave-paper *{box-sizing:border-box}.foreign-leave-paper h1{margin:0 0 4mm;text-align:center;font-size:16pt;font-weight:700}.foreign-top-date{width:46%;margin:0 0 4mm auto}.foreign-row{display:flex;align-items:baseline;gap:1.5mm;min-width:0;margin:1.2mm 0}.foreign-line{flex:1;min-width:0;min-height:4.2mm;border-bottom:.3mm dotted #222;padding:0 .8mm}.foreign-date-row{display:grid;grid-template-columns:auto 1fr auto 1.5fr auto 1fr;align-items:end;gap:1mm;margin:1mm 0}.foreign-date-row span:nth-child(even){min-height:4.2mm;border-bottom:.3mm dotted #222;text-align:center;padding:0 .8mm}.foreign-subject{display:grid;grid-template-columns:22mm 1fr;align-items:start;margin-bottom:1.5mm}.foreign-choices{display:grid;gap:.8mm}.foreign-choice{display:flex;align-items:center;gap:1.5mm}.foreign-radio{display:inline-flex;width:5.3mm;height:5.3mm;flex:0 0 5.3mm;border:.3mm solid #222;border-radius:50%;align-items:center;justify-content:center;font-size:12pt;font-weight:700;line-height:1}.foreign-pair{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:2.5mm}.foreign-writing-lines{min-height:11mm;line-height:5.5mm;white-space:pre-wrap;background-image:radial-gradient(circle at .7mm 5mm,#222 .25mm,transparent .3mm);background-size:2mm 5.5mm;background-repeat:repeat;padding:0 .8mm}.foreign-address-note{margin-top:.5mm;font-size:11pt}.foreign-stats-section{display:inline-block;width:92mm;min-width:92mm;max-width:92mm;margin:1.5mm auto 2mm 0}.foreign-stats-title{font-weight:700;margin-bottom:1mm}.foreign-stats-table{display:table;width:92mm;min-width:92mm;max-width:92mm;table-layout:fixed;border-collapse:collapse;font-size:10pt;text-align:center}.foreign-stats-table th,.foreign-stats-table td{border:.25mm solid #222;padding:.6mm .4mm;white-space:nowrap}.foreign-stats-table th{font-weight:600}.foreign-stats-table th:first-child,.foreign-stats-table td:first-child{width:26mm;text-align:left}.foreign-applicant-signature{width:48%;margin:1mm 2% 1.5mm auto;text-align:center}.foreign-signature-row{display:flex;align-items:flex-end;gap:1.5mm;justify-content:center;margin-top:1mm}.foreign-signature-line{display:flex;align-items:flex-end;justify-content:center;width:48mm;height:7mm;border-bottom:.3mm dotted #222}.foreign-signature-line img{max-width:90%;max-height:8mm;object-fit:contain}.foreign-name{text-align:center;margin-top:.5mm;min-height:4mm}.foreign-divider{border:0;border-top:.25mm solid #222;margin:0 0 3mm}.foreign-approval-grid{display:grid;grid-template-columns:1fr 1fr;column-gap:10mm;row-gap:1mm}.foreign-approval h2{margin:0 0 1mm;font-size:14pt;font-weight:400}.foreign-decisions{display:grid;grid-template-columns:auto auto auto auto;align-items:center;justify-content:start;gap:1.2mm;margin-bottom:1mm}.foreign-comment-line{height:4.5mm;border-bottom:.3mm dotted #222;padding:0 .8mm;overflow:hidden}.foreign-approval-director{grid-column:2}.foreign-approval-director h2{text-align:center}.foreign-approval-director .foreign-decisions{justify-content:center}
          .foreign-leave-stage{position:relative;flex:none;margin:0 auto}.foreign-leave-paper{transform-origin:top left}
          @page{size:A4 portrait;margin:0}@media print{html,body{width:210mm!important;height:297mm!important;margin:0!important;padding:0!important;background:#fff!important}.no-print{display:none!important}.foreign-leave-stage{width:210mm!important;height:297mm!important;margin:0!important}.foreign-leave-paper{width:210mm!important;height:297mm!important;min-height:297mm!important;margin:0!important;padding:10mm 16mm 8mm!important;box-shadow:none!important;overflow:hidden!important;page-break-inside:avoid!important;transform:none!important}.foreign-stats-section{display:inline-block!important;width:92mm!important;min-width:92mm!important;max-width:92mm!important;margin-left:0!important;margin-right:auto!important}.foreign-stats-table{display:table!important;width:92mm!important;min-width:92mm!important;max-width:92mm!important}}
        `}} />

        <h1>LEAVE FORM</h1>
        <div className="foreign-top-date foreign-date-row">
          <span>DATE</span><span>{formDate.day}</span><span>Month</span><span>{formDate.month}</span><span>Year</span><span>{formDate.year}</span>
        </div>

        <section className="foreign-subject">
          <span>Subject</span>
          <div className="foreign-choices">
            <div className="foreign-choice"><span className="foreign-radio">{isChecked(request.leaveType === 'sick')}</span><span>Sick leave</span><span className="foreign-line">{request.leaveType === 'sick' ? request.reason : ''}</span></div>
            <div className="foreign-choice"><span className="foreign-radio">{isChecked(request.leaveType === 'maternity')}</span><span>Maternity leave for</span><span className="foreign-line">{request.leaveType === 'maternity' ? `${request.totalDays} day(s)` : ''}</span></div>
            <div className="foreign-choice"><span className="foreign-radio">{isChecked(request.leaveType === 'personal')}</span><span>Personal matter for</span><span className="foreign-line">{request.leaveType === 'personal' ? request.reason : ''}</span></div>
          </div>
        </section>

        <div className="foreign-row"><span>Attention to :</span><span className="foreign-line">Director of Makudmuang Rachawitthayalai School</span></div>
        <div className="foreign-pair">
          <div className="foreign-row"><span>Full name :</span><span className="foreign-line">{request.userName}</span></div>
          <div className="foreign-row"><span>Position :</span><span className="foreign-line">{position}</span></div>
        </div>
        <div className="foreign-row"><span>Reason :</span><span className="foreign-line">{request.reason}</span></div>
        <div className="foreign-writing-lines">{request.otherLeaveDetails || ''}</div>

        <div className="foreign-row">
          <span>From</span><span className="foreign-line">{startDate.day} {startDate.month} {startDate.year}</span>
          <span>To</span><span className="foreign-line">{endDate.day} {endDate.month} {endDate.year}</span>
          <span>Total</span><span className="foreign-line">{request.totalDays} day(s)</span>
        </div>
        <div className="foreign-row"><span>During my absence, I can be contacted at</span><span className="foreign-line">{request.contactAddress || 'Teacher Residence, Makudmuang Rachawitthayalai School'}</span></div>
        <div className="foreign-row"><span>Contact number</span><span className="foreign-line">{request.contactPhone || '-'}</span></div>
        <div className="foreign-address-note">(Address where I can be contacted)</div>

        <div className="foreign-applicant-signature">
          <div className="foreign-signature-row"><span>Signature</span><span className="foreign-signature-line">{request.signatureUrl ? <img src={request.signatureUrl} alt="Applicant signature" /> : null}</span></div>
          <div className="foreign-name">( {request.userName} )</div>
        </div>

        <section
          className="foreign-stats-section"
          style={{ width: '92mm', maxWidth: '92mm', marginLeft: 0, marginRight: 'auto' }}
        >
          <div className="foreign-stats-title">Cumulative Leave Record</div>
          <table className="foreign-stats-table" style={{ display: 'table', width: '92mm', minWidth: '92mm', maxWidth: '92mm' }}>
            <colgroup>
              <col style={{ width: '26mm' }} />
              {Array.from({ length: 6 }, (_, index) => <col key={index} style={{ width: '11mm' }} />)}
            </colgroup>
            <thead>
              <tr><th rowSpan={2}>Leave Type</th><th colSpan={2}>Previous</th><th colSpan={2}>Current</th><th colSpan={2}>Total</th></tr>
              <tr><th>Time(s)</th><th>Day(s)</th><th>Time(s)</th><th>Day(s)</th><th>Time(s)</th><th>Day(s)</th></tr>
            </thead>
            <tbody>
              {leaveStatistics.map(row => (
                <tr key={row.key}>
                  <td>{row.label}</td><td>{row.pastCount}</td><td>{row.pastDays}</td><td>{row.currentCount}</td><td>{row.currentDays}</td><td>{row.totalCount}</td><td>{row.totalDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <hr className="foreign-divider" />
        <div className="foreign-approval-grid">
          {approvalBlock('Head of English Program Comment', request.adminReview, adminDate, englishSignatories.head)}
          {approvalBlock('Deputy Director Comment', request.deputyApproval, deputyDate, englishSignatories.deputy)}
          <div className="foreign-approval-director">
            {approvalBlock('Director Comment', request.directorApproval, directorDate, englishSignatories.director)}
          </div>
        </div>
      </main>
      </div>
    </div>
  );
};
