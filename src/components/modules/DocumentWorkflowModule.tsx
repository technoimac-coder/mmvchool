'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FileSignature, FileText, Inbox, Search, Send, Upload, X } from 'lucide-react';
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

function documentStatus(item: DocumentWorkflow, userId: string) {
  if (item.status === 'completed') return { label: 'เสร็จสิ้น', className: 'bg-emerald-50 text-emerald-700' };
  if (item.status === 'rejected') return { label: 'ส่งกลับแก้ไข', className: 'bg-rose-50 text-rose-700' };
  const waitingForMe = item.signers.some(s => s.userId === userId && s.step === item.currentStep && s.status === 'pending');
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
  const [documentSearch, setDocumentSearch] = useState('');

  const load = () => documentWorkflowsApi.list().then(setItems).catch(() => undefined);
  useEffect(() => { void load(); }, []);
  const pending = useMemo(() => items.filter((d) => d.signers.some((s) => s.userId === currentUser.id && s.step === d.currentStep && s.status === 'pending')), [items, currentUser.id]);
  const visibleItems = useMemo(() => {
    const query = documentSearch.trim().toLocaleLowerCase();
    if (!query) return items;
    return items.filter(item => `${item.title} ${item.fileName} ${item.createdByName} ${topicLabel(item.topic)}`.toLocaleLowerCase().includes(query));
  }, [items, documentSearch]);
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
  const selectedIsPdf = selected?.fileName.toLowerCase().endsWith('.pdf') ?? false;
  const selectedIsImage = selected ? /\.(png|jpe?g|gif|webp)$/i.test(selected.fileName) : false;
  const toggleSigner = (id: string, checked: boolean) => setSigners((previous) => checked ? (previous.includes(id) ? previous : [...previous, id]) : previous.filter((x) => x !== id));
  const selectSigner = (id: string) => { toggleSigner(id, true); setSignerSearch(''); };

  const create = async () => {
    if (!file || !title.trim() || signers.length === 0) { addToast('กรุณากรอกหัวข้อ แนบเอกสาร และเลือกผู้ลงนาม', 'warning'); return; }
    setBusy(true);
    try { await documentWorkflowsApi.create(title.trim(), topic, desc.trim(), signers, file); setTitle(''); setDesc(''); setFile(null); setSigners([]); setSignerSearch(''); addToast('ส่งเอกสารเข้าสู่ลำดับการลงนามแล้ว', 'success'); await load(); }
    catch (error) { addToast(error instanceof Error ? error.message : 'ส่งเอกสารไม่สำเร็จ กรุณาลองใหม่', 'error'); }
    finally { setBusy(false); }
  };

  return <div className="space-y-5">
    <div className="rounded-2xl bg-gradient-to-r from-indigo-700 to-violet-600 p-5 text-white shadow-lg shadow-indigo-200/50"><div className="flex items-center gap-3"><FileSignature className="h-8 w-8" /><div><h1 className="text-xl font-extrabold">ส่งเอกสารและลงนามออนไลน์</h1><p className="text-sm text-indigo-100">ส่งต่อเอกสารตามลำดับ เซ็นในระบบ และเก็บประวัติไว้ตรวจสอบ</p></div></div></div>
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><h2 className="font-bold text-slate-800">ส่งเอกสารใหม่</h2><div className="mt-4 space-y-3">
        <input className="w-full rounded-xl border border-slate-200 p-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="ชื่อเรื่องเอกสาร" value={title} onChange={(e) => setTitle(e.target.value)} />
        <select className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-indigo-500" value={topic} onChange={(e) => setTopic(e.target.value as DocumentWorkflowTopic)}>{topics.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <textarea className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-indigo-500" rows={2} placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-3 text-sm text-slate-700 hover:bg-indigo-50"><Upload className="h-4 w-4 text-indigo-600" />{file ? <span className="truncate">{file.name}</span> : 'แนบไฟล์ PDF หรือเอกสาร'}<input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
        <div><div className="mb-2 flex items-center justify-between"><div className="text-sm font-semibold text-slate-800">เลือกผู้ลงนามตามลำดับ</div><span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">เลือกแล้ว {signers.length} คน</span></div>
          <div className="relative z-20 mb-2">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              className="w-full rounded-xl border border-slate-200 p-2.5 pl-9 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="พิมพ์ตัวอักษรเพื่อค้นหาชื่อผู้ลงนาม..."
              value={signerSearch}
              onChange={(event) => setSignerSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && filteredUsers[0]) {
                  event.preventDefault();
                  selectSigner(filteredUsers[0].id);
                }
              }}
            />
            {signerSearch.trim() && <div className="absolute left-0 right-0 top-full mt-1 max-h-52 space-y-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
              {filteredUsers.length === 0 ? <p className="p-3 text-center text-sm text-slate-400">ไม่พบรายชื่อที่ตรงกัน</p> : filteredUsers.map((user) => <button key={user.id} type="button" onClick={() => selectSigner(user.id)} className="flex w-full items-center justify-between gap-3 rounded-xl p-2 text-left transition hover:bg-indigo-50">
                <span className="flex min-w-0 items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{user.name.charAt(0)}</span><span className="min-w-0"><span className="block truncate text-sm font-bold text-slate-800">{user.name}</span><span className="block truncate text-xs text-slate-400">{user.position}</span></span></span>
                <span className="shrink-0 rounded-lg bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-600">+ เลือก</span>
              </button>)}
            </div>}
          </div>
          {selectedUsers.length > 0 && <div className="mb-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-2"><div className="mb-1 text-xs font-bold text-indigo-700">ลำดับที่เลือก</div><div className="space-y-1">{selectedUsers.map((u, index) => u && <div key={u.id} className="flex items-center justify-between rounded-lg bg-white px-2 py-1.5 text-sm shadow-sm"><span className="min-w-0 truncate"><b className="mr-2 text-indigo-700">{index + 1}.</b>{u.name}<span className="ml-1 text-xs text-slate-400">{u.position}</span></span><button type="button" className="ml-2 shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-rose-500 hover:bg-rose-50" onClick={() => toggleSigner(u.id, false)}><X className="mr-1 inline h-3 w-3" />นำออก</button></div>)}</div></div>}
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">พิมพ์ชื่อหรือตำแหน่ง แล้วกด “+ เลือก” หรือกด Enter เพื่อเพิ่มตามลำดับ</p>
        </div>
        <button disabled={busy} onClick={() => void create()} className="w-full rounded-xl bg-indigo-600 p-3 font-bold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-50">{busy ? 'กำลังบันทึก...' : 'ส่งเข้าลำดับการลงนาม'}</button>
      </div></section>
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-bold text-slate-800">แฟ้มเอกสาร</h2><p className="text-xs text-slate-500">แยกตามผู้รับผิดชอบและหัวข้อ เพื่อค้นประวัติย้อนหลังได้ง่าย</p></div>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">รอฉันเซ็น {pending.length}</span>
        </div>
        <div className="relative mt-4"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input className="w-full rounded-xl border border-slate-200 p-2.5 pl-9 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="ค้นหาชื่อเรื่อง ชื่อไฟล์ ผู้ส่ง หรือประเภทเอกสาร" value={documentSearch} onChange={(event) => setDocumentSearch(event.target.value)} /></div>
        <div className="mt-4 space-y-4">
          <DocumentFolder title="เอกสารที่ฉันต้องตรวจและลงนาม" description="รายการที่ส่งถึงฉัน รวมทั้งงานรอคิวและประวัติที่ดำเนินการแล้ว" icon={<Inbox className="h-5 w-5" />} items={assignedToMe} userId={currentUser.id} emptyText={documentSearch ? 'ไม่พบเอกสารที่ตรงกับคำค้น' : 'ไม่มีเอกสารที่ส่งมาให้ฉัน'} onSelect={setSelected} />
          <DocumentFolder title="เอกสารที่ฉันอัปโหลดและส่งต่อ" description="ติดตามสถานะไฟล์ที่ฉันเป็นผู้ส่งและตรวจสอบย้อนหลัง" icon={<Send className="h-5 w-5" />} items={uploadedByMe} userId={currentUser.id} emptyText={documentSearch ? 'ไม่พบเอกสารที่ตรงกับคำค้น' : 'ยังไม่มีเอกสารที่ฉันอัปโหลด'} onSelect={setSelected} />
        </div>
      </section>
    </div>
    {selected && <DocumentSigningViewer item={selected} userId={currentUser.id} onClose={() => setSelected(null)} onSaved={(updated) => { setItems((previous) => previous.map((x) => x.id === updated.id ? updated : x)); setSelected(null); addToast('ดำเนินการเอกสารเรียบร้อย', 'success'); }} />}
  </div>;
};
