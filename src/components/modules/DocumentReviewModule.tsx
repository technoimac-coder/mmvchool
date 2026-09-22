'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Clock3, Eye, FileText, Search, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { documentWorkflowsApi } from '../../lib/api';
import type { DocumentWorkflow, DocumentWorkflowTopic } from '../../types';
import { DocumentSigningViewer } from '../DocumentSigningViewer';

const topics: Array<[DocumentWorkflowTopic, string]> = [
  ['lesson_plan_before', 'แผนการสอน (ก่อนบันทึกหลังแผน)'],
  ['lesson_plan', 'แผนการสอน (บันทึกหลังแผน)'],
  ['learner_quality', 'รายงานการพัฒนาคุณภาพผู้เรียน'],
  ['course_plan', 'โครงการสอน'],
  ['classroom_research', 'วิจัยในชั้นเรียน'],
  ['substitute_report', 'รายงานการจัดสอนแทน'],
  ['plc_setup', 'บันทึกการจัดตั้งกลุ่ม PLC'],
  ['plc', 'กิจกรรมชุมนุมการเรียนรู้ทางวิชาชีพ (PLC)'],
  ['innovation_report', 'รายงานนวัตกรรม'],
  ['id_plan', 'ID PLAN'],
  ['sar', 'SAR รายบุคคล'],
  ['other', 'อื่น ๆ'],
];

type StatusFilter = 'all' | DocumentWorkflow['status'];
type TopicFilter = 'all' | DocumentWorkflowTopic;

const topicLabel = (topic: DocumentWorkflowTopic) => topics.find(([value]) => value === topic)?.[1] || topic;

const statusDetail = (item: DocumentWorkflow) => {
  if (item.status === 'completed') return { label: 'เสร็จสิ้น', className: 'bg-emerald-50 text-emerald-700' };
  if (item.status === 'rejected') return { label: 'ส่งกลับแก้ไข', className: 'bg-rose-50 text-rose-700' };
  return { label: `รอขั้นที่ ${item.currentStep}`, className: 'bg-amber-50 text-amber-800' };
};

const submittedAt = (createdAt: string) => new Date(createdAt).toLocaleString('th-TH', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export const DocumentReviewModule: React.FC = () => {
  const { currentUser, academicPeriod, addToast } = useApp();
  const { t } = useLanguage();
  const [items, setItems] = useState<DocumentWorkflow[]>([]);
  const [selected, setSelected] = useState<DocumentWorkflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<TopicFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [academicYear, setAcademicYear] = useState(academicPeriod.academicYear);
  const [semester, setSemester] = useState<'all' | '1' | '2'>(academicPeriod.semester);

  const load = async () => {
    try {
      setItems(await documentWorkflowsApi.list());
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'โหลดรายการเอกสารไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

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
      .filter(item => !normalizedQuery || `${item.createdByName} ${item.title} ${item.fileName} ${topicLabel(item.topic)}`.toLocaleLowerCase().includes(normalizedQuery))
      .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  }, [periodItems, query, status, topic]);

  const teacherCount = new Set(periodItems.map(item => item.createdBy)).size;
  const completedCount = periodItems.filter(item => item.status === 'completed').length;

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

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <SummaryCard label="เอกสารทั้งหมด" value={`${periodItems.length} รายการ`} icon={<FileText className="h-5 w-5" />} tone="indigo" />
      <SummaryCard label="ครูที่ส่งเอกสาร" value={`${teacherCount} คน`} icon={<Users className="h-5 w-5" />} tone="violet" />
      <SummaryCard label="ดำเนินการเสร็จแล้ว" value={`${completedCount} รายการ`} icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" />
    </div>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4 sm:p-5">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[1fr_180px_160px_160px]">
          <label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="ค้นหาชื่อครู หัวข้อ หรือไฟล์" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-violet-400" /></label>
          <select aria-label="เลือกชนิดเอกสาร" value={topic} onChange={event => setTopic(event.target.value as TopicFilter)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="all">ทุกชนิดเอกสาร</option>{topics.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <select aria-label="เลือกปีการศึกษา" value={academicYear} onChange={event => setAcademicYear(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="all">ทุกปีการศึกษา</option>{years.map(year => <option key={year} value={year}>ปีการศึกษา {year}</option>)}</select>
          <select aria-label="เลือกภาคเรียน" value={semester} onChange={event => setSemester(event.target.value as 'all' | '1' | '2')} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="all">ทุกภาคเรียน</option><option value="1">ภาคเรียนที่ 1</option><option value="2">ภาคเรียนที่ 2</option></select>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-xs font-semibold text-violet-700"><Clock3 className="h-4 w-4" />{t('เรียงตามเวลาส่ง: รายการแรกอยู่บนสุด')}</div><select aria-label="กรองสถานะเอกสาร" value={status} onChange={event => setStatus(event.target.value as StatusFilter)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs"><option value="all">ทุกสถานะ</option><option value="pending">รอดำเนินการ</option><option value="in_review">กำลังตรวจสอบ</option><option value="completed">เสร็จสิ้น</option><option value="rejected">ส่งกลับแก้ไข</option></select></div>
      </div>

      {loading ? <p className="p-10 text-center text-sm text-slate-400">กำลังโหลดรายการ...</p> : visibleItems.length === 0 ? <p className="p-10 text-center text-sm text-slate-400">ไม่พบเอกสารตามตัวกรองที่เลือก</p> : <>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[900px] text-sm"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-3 text-center">ลำดับ</th><th className="px-4 py-3">{t('วัน–เวลาที่ส่ง')}</th><th className="px-4 py-3">{t('ครูผู้ส่ง')}</th><th className="px-4 py-3">{t('ชนิดเอกสาร')}</th><th className="px-4 py-3">ชื่อเรื่อง</th><th className="px-4 py-3">สถานะ</th><th className="px-4 py-3 text-center">ตรวจสอบ</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleItems.map((item, index) => { const detail = statusDetail(item); return <tr key={item.id} className="hover:bg-violet-50/40"><td className="px-4 py-3 text-center font-bold text-violet-700">{index + 1}</td><td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700">{submittedAt(item.createdAt)}</td><td className="px-4 py-3 font-bold text-slate-800">{item.createdByName}</td><td className="max-w-[180px] px-4 py-3 text-slate-600">{topicLabel(item.topic)}</td><td className="max-w-[220px] px-4 py-3"><div className="truncate font-semibold text-slate-700">{item.title}</div><div className="truncate text-xs text-slate-400">{item.fileName}</div></td><td className="px-4 py-3"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${detail.className}`}>{detail.label}</span></td><td className="px-4 py-3 text-center"><button type="button" onClick={() => setSelected(item)} className="inline-flex items-center gap-1 rounded-lg border border-violet-200 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-50"><Eye className="h-4 w-4" />ดูเอกสาร</button></td></tr>; })}</tbody></table></div>
        <div className="space-y-3 p-3 md:hidden">{visibleItems.map((item, index) => { const detail = statusDetail(item); return <button type="button" key={item.id} onClick={() => setSelected(item)} className="w-full rounded-xl border border-slate-200 p-3 text-left shadow-sm"><div className="flex items-start justify-between gap-2"><span className="rounded-lg bg-violet-50 px-2 py-1 text-xs font-extrabold text-violet-700">#{index + 1}</span><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${detail.className}`}>{detail.label}</span></div><div className="mt-2 font-extrabold text-slate-800">{item.createdByName}</div><div className="mt-1 text-xs font-semibold text-violet-700">{submittedAt(item.createdAt)}</div><div className="mt-2 text-sm font-semibold text-slate-700">{item.title}</div><div className="mt-1 text-xs text-slate-500">{topicLabel(item.topic)}</div></button>; })}</div>
      </>}
    </section>
  </div>;
};

function SummaryCard({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: 'indigo' | 'violet' | 'emerald' }) {
  const styles = { indigo: 'bg-indigo-50 text-indigo-700', violet: 'bg-violet-50 text-violet-700', emerald: 'bg-emerald-50 text-emerald-700' };
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><span className={`rounded-xl p-2.5 ${styles[tone]}`}>{icon}</span><div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-0.5 text-lg font-extrabold text-slate-800">{value}</p></div></div></div>;
}
