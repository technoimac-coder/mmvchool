'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, ClipboardCheck, Clock3, Eye, FileText, Printer, Search, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { documentWorkflowsApi } from '../../lib/api';
import type { DocumentWorkflow, DocumentWorkflowTopic, DocumentWorkflowRevision } from '../../types';
import { DocumentSigningViewer } from '../DocumentSigningViewer';
import { lessonPlanTopicLabel } from '../../lib/lessonPlanTopicLabel';
import { useAcademicPeriodSelection } from '../../lib/useAcademicPeriodSelection';
import { documentRevisionReportRows, documentSubmissionTime, DOCUMENT_REPORT_FIT_SCRIPT } from '../../lib/document-revision-report';
import { DocumentRevisionNotice } from '../DocumentRevisionNotice';

const topics: Array<[DocumentWorkflowTopic, string]> = [
  ['lesson_plan_before', 'แผนการสอน (ก่อนบันทึกหลังแผน)'],
  ['lesson_plan', 'แผนการสอน (หลังบันทึกหลังแผน)'],
  ['learner_quality', 'รายงานพัฒนาคุณภาพผู้เรียน'],
  ['course_plan', 'โครงการสอน'],
  ['classroom_research', 'วิจัยในชั้นเรียน'],
  ['plc_setup', 'บันทึกจัดตั้งกลุ่ม PLC'],
  ['plc', 'รายงานกิจกรรมชุมนุมการเรียนรู้ทางวิชาชีพ PLC'],
  ['substitute_report', 'รายงานการจัดสอนแทน'],
  ['innovation_report', 'รายงานนวัตกรรม'],
  ['id_plan', 'ID PLAN'],
  ['sar', 'SAR รายบุคคล'],
  ['other', 'อื่น ๆ'],
];

type StatusFilter = 'all' | DocumentWorkflow['status'];
type TopicFilter = 'all' | DocumentWorkflowTopic;

const topicLabel = (topic: DocumentWorkflowTopic, translate?: (thai: string, english?: string) => string, year = '', semester = '') => {
  const label = topics.find(([value]) => value === topic)?.[1] || topic;
  if (!translate) return lessonPlanTopicLabel(topic, label, year, semester);
  const english: Record<string, string> = {
    'แผนการสอน (ก่อนบันทึกหลังแผน)': 'Lesson plan (before post-lesson record)',
    'แผนการสอน (หลังบันทึกหลังแผน)': 'Lesson plan (after post-lesson reflection)',
    'รายงานพัฒนาคุณภาพผู้เรียน': 'Learner quality development report',
    'โครงการสอน': 'Course plan', 'วิจัยในชั้นเรียน': 'Classroom research',
    'รายงานการจัดสอนแทน': 'Substitute teaching report', 'บันทึกจัดตั้งกลุ่ม PLC': 'PLC group establishment record',
    'รายงานกิจกรรมชุมนุมการเรียนรู้ทางวิชาชีพ PLC': 'Professional learning community (PLC) activity report',
    'รายงานนวัตกรรม': 'Innovation report', 'อื่น ๆ': 'Other',
  };
  return lessonPlanTopicLabel(topic, translate(label, english[label]), year, semester);
};

const statusDetail = (item: DocumentWorkflow, translate: (thai: string, english?: string) => string) => {
  if (item.status === 'completed') return { label: translate('เสร็จสิ้น', 'Completed'), className: 'bg-emerald-50 text-emerald-700' };
  if (item.status === 'rejected') return { label: translate('ส่งกลับแก้ไข', 'Returned for correction'), className: 'bg-rose-50 text-rose-700' };
  return { label: translate(`รอขั้นที่ ${item.currentStep}`, `Waiting for step ${item.currentStep}`), className: 'bg-amber-50 text-amber-800' };
};

const submittedAt = documentSubmissionTime;

export const DocumentReviewModule: React.FC = () => {
  const { currentUser, academicPeriod, addToast } = useApp();
  const { t } = useLanguage();
  const [items, setItems] = useState<DocumentWorkflow[]>([]);
  const [selected, setSelected] = useState<DocumentWorkflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<TopicFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const { academicYear, semester, setAcademicYear, setSemester } = useAcademicPeriodSelection(academicPeriod);
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let active = true;
    void documentWorkflowsApi.list().then(data => {
      if (active) setItems(data);
    }).catch(error => {
      if (active) addToast(error instanceof Error ? error.message : 'โหลดรายการเอกสารไม่สำเร็จ', 'error');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [currentUser.id, addToast]);

  const years = useMemo(() => Array.from(new Set([
    academicPeriod.academicYear,
    ...items.map(item => item.academicYear).filter((value): value is string => Boolean(value)),
  ])).sort((left, right) => right.localeCompare(left)), [academicPeriod.academicYear, items]);

  const periodItems = useMemo(() => items.filter(item => {
    const itemYear = item.academicYear || academicPeriod.academicYear;
    const itemSemester = item.semester || academicPeriod.semester;
    return (academicYear === 'all' || itemYear === academicYear)
      && (semester === 'all' || itemSemester === semester);
  }), [academicPeriod.academicYear, academicPeriod.semester, academicYear, items, semester]);

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return periodItems
      .filter(item => topic === 'all' || item.topic === topic)
      .filter(item => status === 'all' || item.status === status)
      .filter(item => !normalizedQuery || `${item.createdByName} ${item.title} ${item.fileName} ${topicLabel(item.topic, t, item.academicYear || academicPeriod.academicYear, item.semester || academicPeriod.semester)}`.toLocaleLowerCase().includes(normalizedQuery))
      .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  }, [periodItems, query, status, topic, t, academicPeriod.academicYear, academicPeriod.semester]);

  const visibleBatches = useMemo(() => {
    const groups = new Map<string, DocumentWorkflow[]>();
    visibleItems.forEach(item => {
      const legacySigners = item.signers.map(signer => signer.userId).join(',');
      const minute = item.createdAt.slice(0, 16);
      const key = item.batchId
        ? `batch:${item.batchId}`
        : `legacy:${item.createdBy}:${item.topic}:${item.academicYear || ''}:${item.semester || ''}:${minute}:${item.description || ''}:${legacySigners}`;
      groups.set(key, [...(groups.get(key) || []), item]);
    });
    return Array.from(groups, ([key, groupedItems]) => ({ key, items: groupedItems }));
  }, [visibleItems]);

  const teacherCount = new Set(periodItems.map(item => item.createdBy)).size;
  const completedCount = periodItems.filter(item => item.status === 'completed').length;

  const exportReport = async () => {
    if (exporting) return;
    const report = window.open('', '_blank');
    if (!report) {
      addToast(t('กรุณาอนุญาตหน้าต่างป๊อปอัปเพื่อออกรายงาน', 'Please allow pop-ups to export the report'), 'error');
      return;
    }
    setExporting(true);
    report.document.write('<!doctype html><meta charset="utf-8"><title>กำลังเตรียมรายงาน</title><p>กำลังเตรียมรายงานและประวัติฉบับแก้ไข…</p>');
    report.document.close();
    const histories = new Map<string, DocumentWorkflowRevision[]>();
    try {
      for (const item of visibleItems) {
        if ((item.fileVersion ?? 1) > 1) histories.set(item.id, await documentWorkflowsApi.history(item.id));
      }
    } catch (error) {
      report.close(); setExporting(false);
      addToast(error instanceof Error ? error.message : 'โหลดประวัติฉบับแก้ไขไม่สำเร็จ กรุณาลองออกรายงานใหม่', 'error');
      return;
    }
    // Escape every value inserted into the separate printable document.
    const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
    const title = t('รายงานการส่งเอกสาร', 'Document submission report');
    const statusNames = { all: t('ทุกสถานะ', 'All statuses'), pending: t('รอดำเนินการ', 'Pending'), in_review: t('กำลังตรวจสอบ', 'In review'), completed: t('เสร็จสิ้น', 'Completed'), rejected: t('ส่งกลับแก้ไข', 'Returned for correction') };
    const filters = [
      academicYear === 'all' ? t('ทุกปีการศึกษา', 'All academic years') : `${t('ปีการศึกษา', 'Academic year')} ${academicYear}`,
      semester === 'all' ? t('ทุกภาคเรียน', 'All semesters') : `${t('ภาคเรียนที่', 'Semester')} ${semester}`,
      topic === 'all' ? t('ทุกชนิดเอกสาร', 'All document types') : topicLabel(topic, t, academicYear, semester),
      statusNames[status],
      query.trim() ? `${t('คำค้น', 'Search')}: ${query.trim()}` : '',
    ].filter(Boolean).join(' | ');
    const headings = [t('ลำดับ', 'No.'), t('วัน–เวลาที่ส่ง', 'Submitted at'), t('ครูผู้ส่ง', 'Submitted by'), t('ชนิดเอกสาร', 'Document type'), t('ชื่อไฟล์', 'File name'), t('สถานะ', 'Status'), t('ลงนามแล้ว / ทั้งหมด', 'Signed / Total')];
    const rows = documentRevisionReportRows(visibleBatches, histories, {
      t,
      topicLabel: item => topicLabel(item.topic, t, item.academicYear || academicPeriod.academicYear, item.semester || academicPeriod.semester),
      statusLabel: item => {
        const detail = statusDetail(item, t);
        return statusNames[item.status] + (item.status === 'pending' || item.status === 'in_review' ? ' (' + detail.label + ')' : '');
      },
    });
    if (report.closed) { setExporting(false); return; }
    report.document.open();
    report.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escape(title)}</title><style>
      @page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;color:#172033;font-size:9pt;margin:0 auto;width:273mm;max-width:100%}h1{font-size:18pt;margin:0 0 8px}p{margin:6px 0;line-height:1.6}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #b8c0cc;padding:5px;text-align:left;vertical-align:top;white-space:normal;overflow-wrap:normal}th{background:#eef1f6}thead{display:table-header-group;break-inside:avoid}tr{break-inside:avoid;page-break-inside:avoid}.report-heading{border:0;background:white;font-weight:normal;padding:0 0 12px;white-space:normal}.column-headings th:first-child{width:4%}.column-headings th:nth-child(5){width:25%}.fit-line{display:block;width:max-content;max-width:none;white-space:nowrap;overflow-wrap:normal;word-break:normal}.status-cell{white-space:normal;overflow-wrap:normal;font-size:8.5pt}.date-cell{font-size:8.5pt}.count-cell{white-space:nowrap}.revision-note{margin-top:3px;font-size:8pt;color:#475569}.previous-version{background:#f8fafc}.number-cell{text-align:center;white-space:nowrap}.number-cell .fit-line{margin:0 auto}.toolbar{margin-bottom:18px;padding:12px;background:#eef1f6}button{padding:8px 16px;cursor:pointer}@media print{body{width:100%;max-width:none}.toolbar{display:none}thead{display:table-header-group}th{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
      .column-headings th:first-child,tbody tr td.number-cell{width:4%;white-space:nowrap;overflow-wrap:normal;word-break:normal;text-align:center;padding-left:4px;padding-right:4px}
      </style></head><body><div class="toolbar"><button onclick="window.print()">${escape(t('พิมพ์ / บันทึกเป็น PDF', 'Print / Save as PDF'))}</button> ${escape(t('เลือกปลายทาง “บันทึกเป็น PDF” ในหน้าต่างพิมพ์', 'Choose “Save as PDF” in the print dialog'))}</div>
      <table><colgroup><col style="width:4%"><col style="width:12%"><col style="width:15%"><col style="width:22%"><col style="width:25%"><col style="width:14%"><col style="width:8%"></colgroup><thead><tr><th colspan="7" class="report-heading"><h1>${escape(title)}</h1><p>MMV Smart School</p><p>${escape(filters)}</p>
      <p>${escape(t('เอกสาร', 'Documents'))}: ${visibleItems.length} | ${escape(t('ผู้ส่ง', 'Submitters'))}: ${new Set(visibleItems.map(item => item.createdBy)).size} | ${escape(t('เสร็จสิ้น', 'Completed'))}: ${visibleItems.filter(item => item.status === 'completed').length} | ${escape(t('มีฉบับแก้ไข', 'Revised documents'))}: ${visibleItems.filter(item => (item.fileVersion ?? 1) > 1).length}</p>
      <p>${escape(t('ออกรายงานเมื่อ', 'Generated at'))}: ${escape(submittedAt(new Date().toISOString()))} | ${escape(t('ผู้จัดทำ', 'Prepared by'))}: ${escape(currentUser.name)}</p>
      </th></tr><tr class="column-headings">${headings.map(heading => `<th><span class="fit-line" data-fit-line>${escape(heading)}</span></th>`).join('')}</tr></thead><tbody>${rows || `<tr><td colspan="7">${escape(t('ไม่พบเอกสารตามตัวกรองที่เลือก', 'No documents match the selected filters'))}</td></tr>`}</tbody></table><script>${DOCUMENT_REPORT_FIT_SCRIPT}</script></body></html>`);
    report.document.close();
    setExporting(false);
    report.focus();
  };

  const renderDesktopRow = (item: DocumentWorkflow, index: number) => {
    const detail = statusDetail(item, t);
    return <tr key={item.id} className="hover:bg-violet-50/40"><td className="px-4 py-3 text-center font-bold text-violet-700">{index + 1}</td><td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700">{submittedAt(item.createdAt)}</td><td className="px-4 py-3 font-bold text-slate-800">{item.createdByName}</td><td className="max-w-[180px] px-4 py-3 text-slate-600">{topicLabel(item.topic, t, item.academicYear || academicPeriod.academicYear, item.semester || academicPeriod.semester)}</td><td className="max-w-[220px] px-4 py-3"><div className="truncate font-semibold text-slate-700">{item.title}</div><div className="truncate text-xs text-slate-400">{item.fileName}</div><DocumentRevisionNotice item={item} /></td><td className="px-4 py-3"><span className={'whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ' + detail.className}>{detail.label}</span></td><td className="px-4 py-3 text-center"><button type="button" onClick={() => setSelected(item)} className="inline-flex items-center gap-1 rounded-lg border border-violet-200 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-50"><Eye className="h-4 w-4" />ดูเอกสาร</button></td></tr>;
  };

  const renderMobileCard = (item: DocumentWorkflow, index: number) => {
    const detail = statusDetail(item, t);
    return <button type="button" key={item.id} onClick={() => setSelected(item)} className="w-full rounded-xl border border-slate-200 p-3 text-left shadow-sm"><div className="flex items-start justify-between gap-2"><span className="rounded-lg bg-violet-50 px-2 py-1 text-xs font-extrabold text-violet-700">#{index + 1}</span><span className={'rounded-full px-2 py-1 text-[11px] font-bold ' + detail.className}>{detail.label}</span></div><div className="mt-2 font-extrabold text-slate-800">{item.createdByName}</div><div className="mt-1 text-xs font-semibold text-violet-700">{submittedAt(item.createdAt)}</div><div className="mt-2 text-sm font-semibold text-slate-700">{item.title}</div><div className="mt-1 text-xs text-slate-500">{topicLabel(item.topic, t, item.academicYear || academicPeriod.academicYear, item.semester || academicPeriod.semester)}</div><div className="mt-1 break-all text-[11px] text-slate-400">{item.fileName}</div><DocumentRevisionNotice item={item} /></button>;
  };
  if (selected) return <DocumentSigningViewer
    item={selected}
    userId={currentUser.id}
    onClose={() => setSelected(null)}
    onSaved={updated => {
      setItems(previous => previous.map(item => item.id === updated.id ? updated : item));
      setSelected(updated);
    }}
  />;

  return <div className="space-y-5">
    <header className="rounded-2xl bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-700 p-5 text-white shadow-lg shadow-violet-200/50 sm:p-6">
      <div className="flex items-start gap-3"><span className="rounded-xl bg-white/15 p-2.5"><ClipboardCheck className="h-7 w-7" /></span><div><h1 className="text-xl font-extrabold">{t('ตรวจสอบการส่งเอกสาร')}</h1><p className="mt-1 text-sm text-violet-100">ติดตามว่าครูท่านใดส่งเอกสารเมื่อใด พร้อมเปิดตรวจสอบเอกสารย้อนหลัง</p></div></div>
    </header>

    <div className="flex justify-end"><button type="button" disabled={loading || exporting} onClick={() => void exportReport()} className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-50"><Printer className="h-4 w-4" />{exporting ? t('กำลังเตรียมรายงาน…', 'Preparing report…') : t('ออกรายงาน PDF', 'Export PDF report')}</button></div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <SummaryCard label="เอกสารทั้งหมด" value={`${periodItems.length} รายการ`} icon={<FileText className="h-5 w-5" />} tone="indigo" />
      <SummaryCard label="ครูที่ส่งเอกสาร" value={`${teacherCount} คน`} icon={<Users className="h-5 w-5" />} tone="violet" />
      <SummaryCard label="ดำเนินการเสร็จแล้ว" value={`${completedCount} รายการ`} icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" />
    </div>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4 sm:p-5">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[1fr_180px_160px_160px]">
          <label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="ค้นหาชื่อครู หัวข้อ หรือไฟล์" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-violet-400" /></label>
          <select aria-label="เลือกชนิดเอกสาร" value={topic} onChange={event => setTopic(event.target.value as TopicFilter)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="all">ทุกชนิดเอกสาร</option>{topics.map(([value, label]) => <option key={value} value={value}>{topicLabel(value, t, academicYear, semester)}</option>)}</select>
          <select aria-label="เลือกปีการศึกษา" value={academicYear} onChange={event => setAcademicYear(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="all">ทุกปีการศึกษา</option>{years.map(year => <option key={year} value={year}>ปีการศึกษา {year}</option>)}</select>
          <select aria-label="เลือกภาคเรียน" value={semester} onChange={event => setSemester(event.target.value as 'all' | '1' | '2')} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="all">ทุกภาคเรียน</option><option value="1">ภาคเรียนที่ 1</option><option value="2">ภาคเรียนที่ 2</option></select>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-xs font-semibold text-violet-700"><Clock3 className="h-4 w-4" />{t('เรียงตามเวลาส่ง: รายการแรกอยู่บนสุด')}</div><select aria-label="กรองสถานะเอกสาร" value={status} onChange={event => setStatus(event.target.value as StatusFilter)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs"><option value="all">ทุกสถานะ</option><option value="pending">รอดำเนินการ</option><option value="in_review">กำลังตรวจสอบ</option><option value="completed">เสร็จสิ้น</option><option value="rejected">ส่งกลับแก้ไข</option></select></div>
      </div>

      {loading ? <p className="p-10 text-center text-sm text-slate-400">กำลังโหลดรายการ...</p> : visibleItems.length === 0 ? <p className="p-10 text-center text-sm text-slate-400">ไม่พบเอกสารตามตัวกรองที่เลือก</p> : <>
                <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[900px] text-sm"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-3 text-center">ลำดับ</th><th className="px-4 py-3">{t('วัน–เวลาที่ส่ง')}</th><th className="px-4 py-3">{t('ครูผู้ส่ง')}</th><th className="px-4 py-3">{t('ชนิดเอกสาร')}</th><th className="px-4 py-3">ชื่อเรื่อง</th><th className="px-4 py-3">สถานะ</th><th className="px-4 py-3 text-center">ตรวจสอบ</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleBatches.map(batch => {
          const multiFileBatch = batch.items.length > 1;
          const expanded = expandedBatches.has(batch.key);
          const first = batch.items[0];
          const completeCount = batch.items.filter(item => item.status === 'completed').length;
          const returnedCount = batch.items.filter(item => item.status === 'rejected').length;
          const waitingCount = batch.items.length - completeCount - returnedCount;
          if (!multiFileBatch) return batch.items.map(item => renderDesktopRow(item, visibleItems.indexOf(item)));
          return <React.Fragment key={batch.key}><tr className="bg-violet-50/70"><td colSpan={7} className="border-l-4 border-violet-400 px-4 py-3"><button type="button" aria-expanded={expanded} onClick={() => setExpandedBatches(previous => { const next = new Set(previous); expanded ? next.delete(batch.key) : next.add(batch.key); return next; })} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-left"><span className="font-extrabold text-violet-800">{expanded ? <ChevronDown className="mr-1 inline h-4 w-4" /> : <ChevronRight className="mr-1 inline h-4 w-4" />}{t('ชุดส่งเอกสาร', 'Submission batch')} · {batch.items.length} {t('ไฟล์', 'files')}</span><span className="text-xs font-semibold text-slate-600">{first.createdByName} · {submittedAt(first.createdAt)}</span><span className="text-xs text-slate-600">{topicLabel(first.topic, t, first.academicYear || academicPeriod.academicYear, first.semester || academicPeriod.semester)}</span><span className="ml-auto flex flex-wrap gap-2 text-[11px] font-bold"><span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">{completeCount} {t('เสร็จแล้ว', 'completed')}</span><span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">{waitingCount} {t('รอดำเนินการ', 'pending')}</span>{returnedCount > 0 && <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700">{returnedCount} {t('ส่งกลับแก้ไข', 'returned')}</span>}</span></button></td></tr>{expanded && batch.items.map(item => renderDesktopRow(item, visibleItems.indexOf(item)))}</React.Fragment>;
        })}</tbody></table></div>
        <div className="space-y-3 p-3 md:hidden">{visibleBatches.map(batch => {
          const multiFileBatch = batch.items.length > 1;
          const expanded = expandedBatches.has(batch.key);
          const first = batch.items[0];
          const completeCount = batch.items.filter(item => item.status === 'completed').length;
          const returnedCount = batch.items.filter(item => item.status === 'rejected').length;
          const waitingCount = batch.items.length - completeCount - returnedCount;
          const cards = batch.items.map(item => renderMobileCard(item, visibleItems.indexOf(item)));
          if (!multiFileBatch) return cards;
          return <section key={batch.key} className="overflow-hidden rounded-xl border border-violet-200 bg-white shadow-sm"><button type="button" aria-expanded={expanded} onClick={() => setExpandedBatches(previous => { const next = new Set(previous); expanded ? next.delete(batch.key) : next.add(batch.key); return next; })} className="w-full bg-violet-50 p-3 text-left"><span className="flex items-center justify-between gap-2 font-extrabold text-violet-800">{expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}<span className="flex-1">{t('ชุดส่งเอกสาร', 'Submission batch')} · {batch.items.length} {t('ไฟล์', 'files')}</span></span><span className="mt-1 block text-xs font-semibold text-slate-600">{first.createdByName} · {submittedAt(first.createdAt)}</span><span className="mt-1 block text-xs text-slate-600">{topicLabel(first.topic, t, first.academicYear || academicPeriod.academicYear, first.semester || academicPeriod.semester)}</span><span className="mt-2 flex flex-wrap gap-1 text-[10px] font-bold"><span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">{completeCount} {t('เสร็จแล้ว', 'completed')}</span><span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">{waitingCount} {t('รอดำเนินการ', 'pending')}</span>{returnedCount > 0 && <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700">{returnedCount} {t('ส่งกลับแก้ไข', 'returned')}</span>}</span></button>{expanded && <div className="space-y-2 p-2">{cards}</div>}</section>;
        })}</div></>}
    </section>
  </div>;
};

function SummaryCard({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: 'indigo' | 'violet' | 'emerald' }) {
  const styles = { indigo: 'bg-indigo-50 text-indigo-700', violet: 'bg-violet-50 text-violet-700', emerald: 'bg-emerald-50 text-emerald-700' };
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><span className={`rounded-xl p-2.5 ${styles[tone]}`}>{icon}</span><div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-0.5 text-lg font-extrabold text-slate-800">{value}</p></div></div></div>;
}

