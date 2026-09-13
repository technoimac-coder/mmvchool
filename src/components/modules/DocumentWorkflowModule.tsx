'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, FileSignature, FileText, Inbox, LayoutGrid, Plus, RotateCcw, Search, Send, Upload, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { documentWorkflowsApi } from '../../lib/api';
import type { DocumentWorkflow, DocumentWorkflowTopic } from '../../types';
import { DocumentSigningViewer } from '../DocumentSigningViewer';

const topics: Array<[DocumentWorkflowTopic, string]> = [
  ['lesson_plan', 'แผนการสอน (บันทึกหลังแผน)'],
  ['plc', 'กิจกรรมชุมชนการเรียนรู้ทางวิชาชีพ (PLC)'],
  ['id_plan', 'ID PLAN'],
  ['sar', 'SAR รายบุคคล'],
  ['other', 'อื่นๆ'],
];

const topicLabel = (topic: DocumentWorkflowTopic) => topics.find(([value]) => value === topic)?.[1] || topic;

type DocumentView = 'all' | 'waiting_for_me' | 'in_progress' | 'completed' | 'rejected';

const isWaitingForUser = (item: DocumentWorkflow, userId: string) => item.signers.some(
  signer => signer.userId === userId && signer.step === item.currentStep && signer.status === 'pending',
);

function documentStatus(item: DocumentWorkflow, userId: string) {
  if (item.status === 'completed') return { label: 'เสร็จสิ้น', className: 'bg-emerald-50 text-emerald-700' };
  if (item.status === 'rejected') return { label: 'ส่งกลับแก้ไข', className: 'bg-rose-50 text-rose-700' };
  const waitingForMe = isWaitingForUser(item, userId);
  return waitingForMe
    ? { label: 'รอฉันเซ็น', className: 'bg-amber-100 text-amber-800' }
    : { label: `รอขั้นที่ ${item.currentStep}`, className: 'bg-indigo-50 text-indigo-700' };
}

function DocumentFolder({ title, description, icon, items, userId, emptyText, onSelect }: {
  title: string; description: string; icon: React.ReactNode; items: DocumentWorkflow[]; userId: string; emptyText: string; onSelect: (item: DocumentWorkflow) => void;
}) {
  const groups = topics.map(([topic, label]) => ({
    topic,
    label,
    items: items
      .filter(item => item.topic === topic)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
  })).filter(group => group.items.length > 0);
  return <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
    <div className="flex items-start justify-between gap-3"><div className="flex gap-2"><span className="mt-0.5 rounded-lg bg-white p-2 text-indigo-600 shadow-sm">{icon}</span><div><h3 className="font-bold text-slate-800">{title}</h3><p className="text-xs text-slate-500">{description}</p></div></div><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 shadow-sm">{items.length} ไฟล์</span></div>
    {groups.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">{emptyText}</p> : <div className="mt-3 space-y-4">{groups.map(group => <div key={group.topic}>
      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700"><FileText className="h-4 w-4 text-indigo-500" /><span>{group.label}</span><span className="text-xs font-normal text-slate-400">({group.items.length})</span></div>
      <div className="space-y-2">{group.items.map(item => { const status = documentStatus(item, userId); return <button key={item.id} onClick={() => onSelect(item)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-indigo-400 hover:bg-indigo-50/30"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate font-semibold text-slate-800">{item.title}</div><div className="mt-1 truncate text-xs text-slate-500">ไฟล์: {item.fileName}</div><div className="mt-1 text-xs text-slate-400">ผู้ส่ง {item.createdByName} · {new Date(item.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</div></div><span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${status.className}`}>{status.label}</span></div></button>; })}</div>
    </div>)}</div>}
  </div>;
}

export const DocumentWorkflowModule: React.FC = () => {
  const { users, currentUser, addToast } = useApp();
  const [items, setItems] = useState<DocumentWorkflow[]>([]);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState<DocumentWorkflowTopic>('lesson_plan');
  const [desc, setDesc] = useState('');
  const [signers, setSigners] = useState<string[]>([]);
  const [signerSearch, setSignerSearch] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [selected, setSelected] = useState<DocumentWorkflow | null>(null);
  const [busy, setBusy] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [documentSearch, setDocumentSearch] = useState('');
  const [documentView, setDocumentView] = useState<DocumentView>('all');

  const load = () => documentWorkflowsApi.list().then(setItems).catch(() => undefined);
  useEffect(() => { void load(); }, []);
  const pending = useMemo(() => items.filter(item => isWaitingForUser(item, currentUser.id)), [items, currentUser.id]);
  const searchedItems = useMemo(() => {
    const query = documentSearch.trim().toLocaleLowerCase();
    if (!query) return items;
    return items.filter(item => `${item.title} ${item.fileName} ${item.createdByName} ${topicLabel(item.topic)}`.toLocaleLowerCase().includes(query));
  }, [items, documentSearch]);
  const categoryCounts = useMemo<Record<DocumentView, number>>(() => ({
    all: items.length,
    waiting_for_me: pending.length,
    in_progress: items.filter(item => item.status !== 'completed' && item.status !== 'rejected' && !isWaitingForUser(item, currentUser.id)).length,
    completed: items.filter(item => item.status === 'completed').length,
    rejected: items.filter(item => item.status === 'rejected').length,
  }), [items, pending.length, currentUser.id]);
  const documentCategories: Array<{ value: DocumentView; label: string; icon: React.ReactNode; activeClass: string }> = [
    { value: 'all', label: 'เอกสารทั้งหมด', icon: <LayoutGrid className="h-4 w-4" />, activeClass: 'border-indigo-200 bg-indigo-50 text-indigo-700' },
    { value: 'waiting_for_me', label: 'รอฉันลงนาม', icon: <FileSignature className="h-4 w-4" />, activeClass: 'border-amber-200 bg-amber-50 text-amber-700' },
    { value: 'in_progress', label: 'กำลังดำเนินการ', icon: <Clock3 className="h-4 w-4" />, activeClass: 'border-blue-200 bg-blue-50 text-blue-700' },
    { value: 'completed', label: 'เสร็จสิ้น', icon: <CheckCircle2 className="h-4 w-4" />, activeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    { value: 'rejected', label: 'ส่งกลับแก้ไข', icon: <RotateCcw className="h-4 w-4" />, activeClass: 'border-rose-200 bg-rose-50 text-rose-700' },
  ];
  const visibleItems = useMemo(() => searchedItems.filter(item => {
    if (documentView === 'all') return true;
    if (documentView === 'waiting_for_me') return isWaitingForUser(item, currentUser.id);
    if (documentView === 'in_progress') return item.status !== 'completed' && item.status !== 'rejected' && !isWaitingForUser(item, currentUser.id);
    return item.status === documentView;
  }), [searchedItems, documentView, currentUser.id]);
  const uploadedByMe = useMemo(() => visibleItems.filter(item => item.createdBy === currentUser.id), [visibleItems, currentUser.id]);
  const assignedToMe = useMemo(() => visibleItems.filter(item => item.createdBy !== currentUser.id && item.signers.some(signer => signer.userId === currentUser.id)), [visibleItems, currentUser.id]);
  const availableUsers = useMemo(() => users.filter((u) => u.id !== currentUser.id && u.status !== 'inactive'), [users, currentUser.id]);
  const unselectedUsers = useMemo(() => availableUsers.filter((u) => !signers.includes(u.id)), [availableUsers, signers]);
  const filteredUsers = useMemo(() => {
    const q = signerSearch.trim().toLocaleLowerCase();
    if (!q) return [];
    return unselectedUsers.filter((u) => `${u.name} ${u.position}`.toLocaleLowerCase().includes(q)).slice(0, 8);
  }, [unselectedUsers, signerSearch]);
  const selectedUsers = useMemo(() => signers.map((id) => availableUsers.find((u) => u.id === id)).filter(Boolean), [signers, availableUsers]);
  const toggleSigner = (id: string, checked: boolean) => setSigners((previous) => checked ? (previous.includes(id) ? previous : [...previous, id]) : previous.filter((x) => x !== id));
  const selectSigner = (id: string) => { toggleSigner(id, true); setSignerSearch(''); };

  const create = async () => {
    if (!file || !title.trim() || signers.length === 0) { addToast('กรุณากรอกหัวข้อ แนบเอกสาร และเลือกผู้ลงนาม', 'warning'); return; }
    setBusy(true);
    try { await documentWorkflowsApi.create(title.trim(), topic, desc.trim(), signers, file); setTitle(''); setDesc(''); setFile(null); setSigners([]); setSignerSearch(''); setShowCreateModal(false); addToast('ส่งเอกสารเข้าสู่ลำดับการลงนามแล้ว', 'success'); await load(); }
    catch (error) { addToast(error instanceof Error ? error.message : 'ส่งเอกสารไม่สำเร็จ กรุณาลองใหม่', 'error'); }
    finally { setBusy(false); }
  };

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-indigo-700 via-violet-600 to-purple-700 p-5 text-white shadow-lg shadow-indigo-200/50 md:flex-row md:items-center sm:p-6">
      <div><div className="mb-1 flex items-start gap-2"><FileSignature className="h-7 w-7 shrink-0 text-indigo-100" /><h1 className="text-lg font-extrabold sm:text-xl">ส่งเอกสารและลงนามออนไลน์</h1></div><p className="text-sm text-indigo-100">ส่งต่อเอกสารตามลำดับ ลงนามในระบบ และจัดเก็บเป็นแฟ้มประวัติที่ตรวจสอบย้อนหลังได้</p></div>
      <button type="button" onClick={() => setShowCreateModal(true)} className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50"><Plus className="h-5 w-5" />ส่งเอกสารใหม่</button>
    </div>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <DocumentSummary label="เอกสารทั้งหมดในระบบ" value={`${items.length} รายการ`} icon={<FileText className="h-6 w-6" />} tone="indigo" />
      <DocumentSummary label="รอฉันตรวจและลงนาม" value={`${pending.length} รายการ`} icon={<FileSignature className="h-6 w-6" />} tone="amber" />
      <DocumentSummary label="เอกสารที่ฉันส่ง" value={`${items.filter(item => item.createdBy === currentUser.id).length} รายการ`} icon={<Send className="h-6 w-6" />} tone="violet" />
    </div>

    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-2">
          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="หมวดหมู่เอกสารลงนาม">
            {documentCategories.map(category => <button
              key={category.value}
              type="button"
              role="tab"
              aria-selected={documentView === category.value}
              onClick={() => setDocumentView(category.value)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${documentView === category.value ? `${category.activeClass} shadow-sm` : 'border-transparent bg-white text-slate-500 hover:border-slate-200 hover:text-slate-700'}`}
            >
              {category.icon}<span>{category.label}</span><span className={`rounded-full px-1.5 py-0.5 text-[10px] ${documentView === category.value ? 'bg-white/80' : 'bg-slate-100 text-slate-500'}`}>{categoryCounts[category.value]}</span>
            </button>)}
          </div>
        </div>
        <div className="relative w-full xl:max-w-sm"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input className="w-full rounded-xl border border-slate-200 p-2.5 pl-9 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="ค้นหาชื่อเรื่อง ไฟล์ ผู้ส่ง หรือประเภท" value={documentSearch} onChange={(event) => setDocumentSearch(event.target.value)} /></div>
      </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <DocumentFolder title="เอกสารที่ฉันต้องตรวจและลงนาม" description="รายการที่ส่งถึงฉัน รวมทั้งงานรอคิวและประวัติที่ดำเนินการแล้ว" icon={<Inbox className="h-5 w-5" />} items={assignedToMe} userId={currentUser.id} emptyText={documentSearch ? 'ไม่พบเอกสารที่ตรงกับคำค้น' : 'ไม่มีเอกสารที่ส่งมาให้ฉัน'} onSelect={setSelected} />
          <DocumentFolder title="เอกสารที่ฉันอัปโหลดและส่งต่อ" description="ติดตามสถานะไฟล์ที่ฉันเป็นผู้ส่งและตรวจสอบย้อนหลัง" icon={<Send className="h-5 w-5" />} items={uploadedByMe} userId={currentUser.id} emptyText={documentSearch ? 'ไม่พบเอกสารที่ตรงกับคำค้น' : 'ยังไม่มีเอกสารที่ฉันอัปโหลด'} onSelect={setSelected} />
        </div>
    </section>

    {showCreateModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-3 backdrop-blur-xs sm:p-4"><div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl sm:rounded-3xl">
      <div className="sticky top-0 z-30 flex items-start justify-between gap-3 rounded-t-2xl border-b border-slate-100 bg-white p-5 sm:rounded-t-3xl"><div><h2 className="font-extrabold text-slate-800">ส่งเอกสารใหม่</h2><p className="text-xs text-slate-500">แนบไฟล์และกำหนดผู้ลงนามตามลำดับ</p></div><button type="button" onClick={() => setShowCreateModal(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
      <div className="space-y-4 p-5">
        <input className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100" placeholder="ชื่อเรื่องเอกสาร" value={title} onChange={(e) => setTitle(e.target.value)} />
        <select className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-indigo-500 focus:bg-white" value={topic} onChange={(e) => setTopic(e.target.value as DocumentWorkflowTopic)}>{topics.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <textarea className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-indigo-500 focus:bg-white" rows={3} placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 p-5 text-center text-sm text-slate-700 hover:border-indigo-400 hover:bg-indigo-50"><Upload className="h-6 w-6 text-indigo-600" />{file ? <span className="max-w-full truncate font-bold text-indigo-700">{file.name}</span> : <><span className="font-bold">เลือกไฟล์ PDF หรือเอกสาร</span><span className="text-xs text-slate-400">PDF, Word, Excel, PowerPoint หรือรูปภาพ</span></>}<input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
        <div><div className="mb-2 flex items-center justify-between"><div className="text-sm font-bold text-slate-800">เลือกผู้ลงนามตามลำดับ</div><span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">เลือกแล้ว {signers.length} คน</span></div>
          <div className="relative z-20 mb-2"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input className="w-full rounded-xl border border-slate-200 p-2.5 pl-9 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="พิมพ์ตัวอักษรเพื่อค้นหาชื่อผู้ลงนาม..." value={signerSearch} onChange={(event) => setSignerSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && filteredUsers[0]) { event.preventDefault(); selectSigner(filteredUsers[0].id); } }} />
            {signerSearch.trim() && <div className="absolute left-0 right-0 top-full mt-1 max-h-52 space-y-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">{filteredUsers.length === 0 ? <p className="p-3 text-center text-sm text-slate-400">ไม่พบรายชื่อที่ตรงกัน</p> : filteredUsers.map((user) => <button key={user.id} type="button" onClick={() => selectSigner(user.id)} className="flex w-full items-center justify-between gap-3 rounded-xl p-2 text-left transition hover:bg-indigo-50"><span className="flex min-w-0 items-center gap-2"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{user.name.charAt(0)}</span><span className="min-w-0"><span className="block truncate text-sm font-bold text-slate-800">{user.name}</span><span className="block truncate text-xs text-slate-400">{user.position}</span></span></span><span className="shrink-0 rounded-lg bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-600">+ เลือก</span></button>)}</div>}
          </div>
          {selectedUsers.length > 0 && <div className="mb-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-2"><div className="mb-1 text-xs font-bold text-indigo-700">ลำดับที่เลือก</div><div className="space-y-1">{selectedUsers.map((u, index) => u && <div key={u.id} className="flex items-center justify-between rounded-lg bg-white px-2 py-1.5 text-sm shadow-sm"><span className="min-w-0 truncate"><b className="mr-2 text-indigo-700">{index + 1}.</b>{u.name}<span className="ml-1 text-xs text-slate-400">{u.position}</span></span><button type="button" className="ml-2 shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-rose-500 hover:bg-rose-50" onClick={() => toggleSigner(u.id, false)}><X className="mr-1 inline h-3 w-3" />นำออก</button></div>)}</div></div>}
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">พิมพ์ชื่อหรือตำแหน่ง แล้วกด “+ เลือก” หรือกด Enter เพื่อเพิ่มตามลำดับ</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setShowCreateModal(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">ยกเลิก</button><button disabled={busy} onClick={() => void create()} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-50">{busy ? 'กำลังบันทึก...' : 'ส่งเข้าลำดับการลงนาม'}</button></div>
      </div>
    </div></div>}
    {selected && <DocumentSigningViewer item={selected} userId={currentUser.id} onClose={() => setSelected(null)} onSaved={(updated) => { setItems((previous) => previous.map((x) => x.id === updated.id ? updated : x)); setSelected(null); addToast('ดำเนินการเอกสารเรียบร้อย', 'success'); }} />}
  </div>;
};

function DocumentSummary({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: 'indigo' | 'amber' | 'violet' }) {
  const colors = tone === 'amber' ? 'bg-amber-50 text-amber-600' : tone === 'violet' ? 'bg-violet-50 text-violet-600' : 'bg-indigo-50 text-indigo-600';
  return <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-2xl font-extrabold text-slate-800">{value}</p></div><span className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors}`}>{icon}</span></div>;
}
