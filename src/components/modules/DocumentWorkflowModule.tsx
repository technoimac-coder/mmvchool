'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FileSignature, FileSpreadsheet, Printer, RotateCcw, Search, Upload, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DocumentSigningViewer } from '../DocumentSigningViewer';
import { documentWorkflowsApi } from '../../lib/api';
import type { DocumentWorkflow, DocumentWorkflowTopic } from '../../types';

const topics: Array<[DocumentWorkflowTopic, string]> = [
  ['lesson_plan', 'แผนการสอน (บันทึกหลังแผน)'],
  ['plc', 'กิจกรรมชุมชนการเรียนรู้ทางวิชาชีพ (PLC)'],
  ['id_plan', 'ID PLAN'],
  ['sar', 'SAR รายบุคคล'],
  ['other', 'อื่นๆ'],
];

export const DocumentWorkflowModule: React.FC = () => {
  const { users, currentUser, addToast, academicPeriod } = useApp();
  const [items, setItems] = useState<DocumentWorkflow[]>([]);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState<DocumentWorkflowTopic>('lesson_plan');
  const [desc, setDesc] = useState('');
  const [signers, setSigners] = useState<string[]>([]);
  const [signerSearch, setSignerSearch] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [selected, setSelected] = useState<DocumentWorkflow | null>(null);
  const [busy, setBusy] = useState(false);
  const [topicFilter, setTopicFilter] = useState<'all' | DocumentWorkflowTopic>('all');
  const [yearFilter, setYearFilter] = useState('current');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('all');
  const [documentSearch, setDocumentSearch] = useState('');
  const [filtersHydrated, setFiltersHydrated] = useState(false);

  const load = () => documentWorkflowsApi.list().then(setItems).catch(() => undefined);
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`document-workflow-filters:${currentUser.id}`);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<{ search: string; status: typeof statusFilter; topic: typeof topicFilter; year: string }>;
        if (typeof parsed.search === 'string') setDocumentSearch(parsed.search);
        if (parsed.status === 'all' || parsed.status === 'pending' || parsed.status === 'completed' || parsed.status === 'rejected') setStatusFilter(parsed.status);
        if (parsed.topic && (parsed.topic === 'all' || topics.some(([value]) => value === parsed.topic))) setTopicFilter(parsed.topic);
        if (typeof parsed.year === 'string') setYearFilter(parsed.year);
      }
    } catch { /* ignore invalid saved filters */ }
    setFiltersHydrated(true);
  }, [currentUser.id]);
  useEffect(() => {
    if (!filtersHydrated) return;
    window.localStorage.setItem(`document-workflow-filters:${currentUser.id}`, JSON.stringify({ search: documentSearch, status: statusFilter, topic: topicFilter, year: yearFilter }));
  }, [currentUser.id, documentSearch, filtersHydrated, statusFilter, topicFilter, yearFilter]);
  const pending = useMemo(() => items.filter((d) => d.signers.some((s) => s.userId === currentUser.id && s.step === d.currentStep && s.status === 'pending')), [items, currentUser.id]);
  const availableUsers = useMemo(() => users.filter((u) => u.id !== currentUser.id && u.status !== 'inactive'), [users, currentUser.id]);
  const unselectedUsers = useMemo(() => availableUsers.filter((u) => !signers.includes(u.id)), [availableUsers, signers]);
  const filteredUsers = useMemo(() => { const q = signerSearch.trim().toLocaleLowerCase(); if (!q) return unselectedUsers; return unselectedUsers.filter((u) => `${u.name} ${u.position}`.toLocaleLowerCase().includes(q)); }, [unselectedUsers, signerSearch]);
  const selectedUsers = useMemo(() => signers.map((id) => availableUsers.find((u) => u.id === id)).filter(Boolean), [signers, availableUsers]);
  const toggleSigner = (id: string, checked: boolean) => setSigners((previous) => checked ? (previous.includes(id) ? previous : [...previous, id]) : previous.filter((x) => x !== id));

  const create = async () => {
    if (!file || !title.trim() || signers.length === 0) { addToast('กรุณากรอกหัวข้อ แนบเอกสาร และเลือกผู้ลงนาม', 'warning'); return; }
    setBusy(true);
    try { await documentWorkflowsApi.create(title.trim(), topic, desc.trim(), signers, file, academicPeriod.academicYear, academicPeriod.semester); setTitle(''); setDesc(''); setFile(null); setSigners([]); setSignerSearch(''); addToast('ส่งเอกสารเข้าสู่ลำดับการลงนามแล้ว ระบบแจ้งเตือนผู้ลงนามแล้ว', 'success'); await load(); }
    catch (error) { addToast(error instanceof Error ? error.message : 'ส่งเอกสารไม่สำเร็จ กรุณาลองใหม่', 'error'); }
    finally { setBusy(false); }
  };

  const years = useMemo(() => Array.from(new Set(items.map(item => item.academicYear).filter(Boolean) as string[])).sort((a, b) => Number(b) - Number(a)), [items]);
  const visibleItems = useMemo(() => items.filter((item) => {
    const query = documentSearch.trim().toLocaleLowerCase();
    const matchesSearch = !query || `${item.title} ${item.fileName} ${item.createdByName}`.toLocaleLowerCase().includes(query);
    const matchesTopic = topicFilter === 'all' || item.topic === topicFilter;
    const matchesYear = yearFilter === 'all' || (yearFilter === 'current' ? (!item.academicYear || (item.academicYear === academicPeriod.academicYear && item.semester === academicPeriod.semester)) : item.academicYear === yearFilter);
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'pending' ? item.status === 'pending' || item.status === 'in_review' : item.status === statusFilter);
    return matchesSearch && matchesTopic && matchesYear && matchesStatus;
  }).sort((a, b) => {
    const responsibility = (item: DocumentWorkflow) => {
      const assigned = item.signers.some(s => s.userId === currentUser.id && s.step === item.currentStep && s.status === 'pending');
      const submitted = item.createdBy === currentUser.id;
      return assigned ? 0 : submitted ? 1 : 2;
    };
    const priority = responsibility(a) - responsibility(b);
    if (priority !== 0) return priority;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  }), [academicPeriod.academicYear, academicPeriod.semester, currentUser.id, documentSearch, items, statusFilter, topicFilter, yearFilter]);
  const isManager = ['admin', 'director', 'head', 'deputy_personnel', 'deputy_budget', 'deputy_general'].includes(currentUser.role);
  const statusCounts = useMemo(() => ({ pending: items.filter(item => item.status === 'pending' || item.status === 'in_review').length, completed: items.filter(item => item.status === 'completed').length, rejected: items.filter(item => item.status === 'rejected').length }), [items]);
  const clearFilters = () => { setDocumentSearch(''); setStatusFilter('all'); setTopicFilter('all'); setYearFilter('current'); };
  const hasActiveFilters = Boolean(documentSearch.trim()) || statusFilter !== 'all' || topicFilter !== 'all' || yearFilter !== 'current';
  const exportCsv = () => {
    const esc = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const rows = [['ชื่อเรื่อง', 'ประเภท', 'ปีการศึกษา', 'ภาคเรียน', 'ผู้ส่ง', 'สถานะ', 'ลำดับปัจจุบัน', 'ประวัติผู้ลงนาม'], ...visibleItems.map(item => [item.title, topics.find(x => x[0] === item.topic)?.[1] || item.topic, item.academicYear || '', item.semester || '', item.createdByName, item.status === 'completed' ? 'ลงนามครบแล้ว' : item.status === 'rejected' ? 'ส่งกลับแก้ไข' : 'ยังไม่ลงนาม', String(item.currentStep), item.signers.map(s => `${s.step}. ${s.userName}: ${s.status}${s.signedAt ? ` (${s.signedAt})` : ''}${s.comment ? ` - ${s.comment}` : ''}`).join(' | ')])];
    const csv = '\uFEFF' + rows.map(row => row.map(esc).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = `รายงานเอกสารลงนาม-${academicPeriod.academicYear}-${academicPeriod.semester}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  const printReport = () => {
    const win = window.open('', '_blank', 'noopener,noreferrer'); if (!win) return;
    const rows = visibleItems.map(item => `<tr><td>${item.title}</td><td>${topics.find(x => x[0] === item.topic)?.[1] || item.topic}</td><td>${item.academicYear || '-'}/${item.semester || '-'}</td><td>${item.createdByName}</td><td>${item.status === 'completed' ? 'ลงนามครบแล้ว' : item.status === 'rejected' ? 'ส่งกลับแก้ไข' : 'ยังไม่ลงนาม'}</td><td>${item.signers.map(s => `${s.step}. ${s.userName} — ${s.status}${s.signedAt ? ` ${s.signedAt}` : ''}${s.comment ? ` (${s.comment})` : ''}`).join('<br>')}</td></tr>`).join('');
    win.document.write(`<html><head><meta charset="utf-8"><title>รายงานเอกสารลงนาม</title><style>body{font-family:Arial,sans-serif;padding:24px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #999;padding:6px;vertical-align:top}h1{font-size:20px}</style></head><body><h1>รายงานเอกสารลงนามออนไลน์</h1><p>ปีการศึกษา ${academicPeriod.academicYear} ภาคเรียนที่ ${academicPeriod.semester} · ${new Date().toLocaleString('th-TH')}</p><table><thead><tr><th>ชื่อเรื่อง</th><th>ประเภท</th><th>ปี/ภาคเรียน</th><th>ผู้ส่ง</th><th>สถานะ</th><th>ประวัติการลงนาม</th></tr></thead><tbody>${rows || '<tr><td colspan="6">ไม่พบข้อมูล</td></tr>'}</tbody></table></body></html>`); win.document.close(); win.focus(); win.print();
  };

  return <div className="space-y-5">
    <div className="rounded-2xl bg-gradient-to-r from-indigo-700 to-violet-600 p-5 text-white shadow-lg shadow-indigo-200/50"><div className="flex items-center gap-3"><FileSignature className="h-8 w-8" /><div><h1 className="text-xl font-extrabold">ส่งเอกสารและลงนามออนไลน์</h1><p className="text-sm text-indigo-100">ส่งต่อเอกสารตามลำดับ เซ็นในระบบ และเก็บประวัติไว้ตรวจสอบ</p></div></div></div>
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><h2 className="font-bold text-slate-800">ส่งเอกสารใหม่</h2><div className="mt-4 space-y-3">
        <input className="w-full rounded-xl border border-slate-200 p-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="ชื่อเรื่องเอกสาร" value={title} onChange={(e) => setTitle(e.target.value)} />
        <select className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-indigo-500" value={topic} onChange={(e) => setTopic(e.target.value as DocumentWorkflowTopic)}>{topics.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <textarea className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-indigo-500" rows={2} placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-3 text-sm text-slate-700 hover:bg-indigo-50"><Upload className="h-4 w-4 text-indigo-600" />{file ? <span className="truncate">{file.name}</span> : 'แนบไฟล์ PDF สำหรับลงนามออนไลน์ (ไม่เกิน 15 MB)'}<input type="file" className="hidden" accept=".pdf,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
        <div>
          <div className="mb-3 flex items-start justify-between gap-3"><div><div className="text-sm font-bold text-slate-800">เลือกผู้ลงนามตามลำดับ</div><p className="mt-0.5 text-xs text-slate-500">คลิกชื่อเพื่อเพิ่ม ผู้ลงนามคนแรกจะได้รับแจ้งเตือนก่อน</p></div><span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">{signers.length} คน</span></div>
          <div className="relative mb-3"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input className="w-full rounded-xl border border-slate-200 bg-white p-2.5 pl-9 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="ค้นหาชื่อหรือกลุ่มงาน..." value={signerSearch} onChange={(e) => setSignerSearch(e.target.value)} /></div>
          <div className="mb-3 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 to-violet-50/60 p-3">
            <div className="mb-2 flex items-center justify-between"><div className="text-xs font-bold uppercase tracking-wide text-indigo-700">ลำดับการลงนาม</div>{selectedUsers.length > 0 && <span className="text-[11px] text-indigo-500">ก่อน → หลัง</span>}</div>
            {selectedUsers.length === 0 ? <div className="rounded-xl border border-dashed border-indigo-200 bg-white/70 px-3 py-4 text-center text-xs text-slate-400">ยังไม่ได้เลือกผู้ลงนาม<br /><span className="text-[11px]">เลือกจากรายชื่อด้านล่างเพื่อเริ่มจัดลำดับ</span></div> : <div className="space-y-2">{selectedUsers.map((u, index) => u && <div key={u.id} className="flex items-center gap-2 rounded-xl border border-white bg-white px-2.5 py-2 shadow-sm"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-extrabold text-white">{index + 1}</span><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-slate-800">{u.name}</div><div className="truncate text-[11px] text-slate-400">{u.position}</div></div><button type="button" aria-label={`นำ ${u.name} ออกจากลำดับ`} className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" onClick={() => toggleSigner(u.id, false)}><X className="h-4 w-4" /></button></div>)}</div>}
          </div>
          <div className="mb-1 flex items-center justify-between"><div className="text-xs font-semibold text-slate-600">{signerSearch.trim() ? 'ผลการค้นหา' : 'รายชื่อที่เลือกเพิ่มได้'}</div><span className="text-[11px] text-slate-400">{filteredUsers.length} รายชื่อ</span></div>
          <div className={`max-h-52 space-y-1.5 overflow-auto rounded-xl border p-2 transition ${signerSearch.trim() ? 'border-indigo-200 bg-indigo-50/40 shadow-sm' : 'border-slate-200 bg-slate-50/40'}`}>{filteredUsers.length === 0 ? <p className="p-4 text-center text-sm text-slate-400">{signers.length > 0 && !signerSearch ? 'เลือกบุคลากรครบแล้ว' : 'ไม่พบรายชื่อที่ค้นหา'}</p> : filteredUsers.map((u) => <button key={u.id} type="button" className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-transparent bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-200" onClick={() => toggleSigner(u.id, true)}><span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-extrabold text-indigo-700">{u.name.trim().charAt(0)}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{u.name}</span><span className="block truncate text-[11px] text-slate-400">{u.position}</span></span><span className="shrink-0 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition group-hover:bg-indigo-700">+ เลือก</span></button>)}</div>
        </div>
        <button disabled={busy} onClick={() => void create()} className="w-full rounded-xl bg-indigo-600 p-3 font-bold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-50">{busy ? 'กำลังบันทึก...' : 'ส่งเข้าลำดับการลงนาม'}</button>
      </div></section>
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-bold text-slate-800">เอกสารของฉัน{isManager && 'และเอกสารทั้งหมด'}</h2><p className="text-xs text-slate-500">{isManager ? 'ผู้บริหารมองเห็นเอกสารของทุกคน' : 'แสดงเอกสารที่คุณส่งหรือมีลำดับลงนามเท่านั้น'}</p></div><span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">รอฉันเซ็น {pending.length}</span></div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]"><label className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className="w-full rounded-xl border border-slate-200 p-2 pl-9 text-sm" placeholder="ค้นหาตามชื่อเรื่องหรือผู้ส่ง" value={documentSearch} onChange={e => setDocumentSearch(e.target.value)} /></label><select className="w-full min-w-0 rounded-xl border border-slate-200 bg-white p-2 text-sm whitespace-nowrap" value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}><option value="all">ทุกสถานะ ({items.length})</option><option value="pending">ยังไม่ลงนาม ({statusCounts.pending})</option><option value="completed">ลงนามครบแล้ว ({statusCounts.completed})</option><option value="rejected">ส่งกลับแก้ไข ({statusCounts.rejected})</option></select><select className="w-full min-w-0 rounded-xl border border-slate-200 bg-white p-2 text-sm whitespace-nowrap" value={topicFilter} onChange={e => setTopicFilter(e.target.value as typeof topicFilter)}><option value="all">ทุกประเภท</option>{topics.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select aria-label="ปีการศึกษาและภาคเรียน" className="w-full min-w-0 rounded-xl border border-slate-200 bg-white p-2 text-sm whitespace-nowrap" value={yearFilter} onChange={e => setYearFilter(e.target.value)}><option value="current">ปี/ภาคเรียนปัจจุบัน {academicPeriod.academicYear}/{academicPeriod.semester}</option><option value="all">ทุกปีการศึกษา</option>{years.map(year => <option key={year} value={year}>ปีการศึกษา {year}</option>)}</select></div>
        <div className="mt-3 flex flex-wrap items-center gap-2"><button onClick={exportCsv} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50"><FileSpreadsheet className="h-4 w-4" />ส่งออก Excel</button><button onClick={printReport} className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50"><Printer className="h-4 w-4" />รายงาน PDF</button><button onClick={clearFilters} disabled={!hasActiveFilters} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><RotateCcw className="h-3.5 w-3.5" />ล้างตัวกรอง</button><span className="text-xs text-slate-400">พบ {visibleItems.length} จาก {items.length} รายการ</span></div>
        <div className="mt-4 space-y-3">{visibleItems.length === 0 ? <p className="py-10 text-center text-sm text-slate-400">ยังไม่มีเอกสารในตัวกรองนี้</p> : visibleItems.map((d) => <button key={d.id} onClick={() => setSelected(d)} className="w-full rounded-xl border border-slate-200 p-3 text-left transition hover:border-indigo-400 hover:bg-indigo-50/30"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-slate-800">{d.title}</div><div className="text-xs text-slate-500">{topics.find((x) => x[0] === d.topic)?.[1]} · ปีการศึกษา {d.academicYear || 'ไม่ระบุ'} / ภาคเรียน {d.semester || '-'} · ผู้ส่ง {d.createdByName}</div></div><span className={`text-xs font-bold ${d.status === 'completed' ? 'text-emerald-600' : d.status === 'rejected' ? 'text-rose-600' : 'text-indigo-600'}`}>{d.status === 'completed' ? 'ลงนามแล้ว' : d.status === 'rejected' ? 'ส่งกลับแก้ไข' : 'ยังไม่ลงนาม · ขั้นที่ ' + d.currentStep}</span></div></button>)}</div></section>
    </div>
    {selected && <DocumentSigningViewer key={selected.id} item={selected} userId={currentUser.id} onClose={() => setSelected(null)} onSaved={updated => { setItems(previous => previous.map(x => x.id === updated.id ? updated : x)); setSelected(updated); addToast(updated.status === 'rejected' ? 'ส่งกลับแล้ว' : 'บันทึกลายเซ็นแล้ว ผู้ลงนามลำดับถัดไปสามารถดำเนินการต่อได้', 'success'); }} />}
  </div>;
};
