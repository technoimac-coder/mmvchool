'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileSignature, RotateCcw, Search, Upload, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
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
  const { users, currentUser, addToast } = useApp();
  const [items, setItems] = useState<DocumentWorkflow[]>([]);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState<DocumentWorkflowTopic>('lesson_plan');
  const [desc, setDesc] = useState('');
  const [signers, setSigners] = useState<string[]>([]);
  const [signerSearch, setSignerSearch] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [selected, setSelected] = useState<DocumentWorkflow | null>(null);
  const [signature, setSignature] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => documentWorkflowsApi.list().then(setItems).catch(() => undefined);
  useEffect(() => { void load(); }, []);
  const pending = useMemo(() => items.filter((d) => d.signers.some((s) => s.userId === currentUser.id && s.step === d.currentStep && s.status === 'pending')), [items, currentUser.id]);
  const availableUsers = useMemo(() => users.filter((u) => u.id !== currentUser.id && u.status !== 'inactive'), [users, currentUser.id]);
  const unselectedUsers = useMemo(() => availableUsers.filter((u) => !signers.includes(u.id)), [availableUsers, signers]);
  const filteredUsers = useMemo(() => { const q = signerSearch.trim().toLocaleLowerCase(); if (!q) return unselectedUsers; return unselectedUsers.filter((u) => `${u.name} ${u.position}`.toLocaleLowerCase().includes(q)); }, [unselectedUsers, signerSearch]);
  const selectedUsers = useMemo(() => signers.map((id) => availableUsers.find((u) => u.id === id)).filter(Boolean), [signers, availableUsers]);
  const selectedIsPdf = selected?.fileName.toLowerCase().endsWith('.pdf') ?? false;
  const selectedIsImage = selected ? /\.(png|jpe?g|gif|webp)$/i.test(selected.fileName) : false;
  const toggleSigner = (id: string, checked: boolean) => setSigners((previous) => checked ? (previous.includes(id) ? previous : [...previous, id]) : previous.filter((x) => x !== id));

  const create = async () => {
    if (!file || !title.trim() || signers.length === 0) { addToast('กรุณากรอกหัวข้อ แนบเอกสาร และเลือกผู้ลงนาม', 'warning'); return; }
    setBusy(true);
    try { await documentWorkflowsApi.create(title.trim(), topic, desc.trim(), signers, file); setTitle(''); setDesc(''); setFile(null); setSigners([]); setSignerSearch(''); addToast('ส่งเอกสารเข้าสู่ลำดับการลงนามแล้ว', 'success'); await load(); }
    catch (error) { addToast(error instanceof Error ? error.message : 'ส่งเอกสารไม่สำเร็จ กรุณาลองใหม่', 'error'); }
    finally { setBusy(false); }
  };
  const act = async (kind: 'sign' | 'reject') => {
    if (!selected) return;
    if (kind === 'sign' && !signature.trim()) { addToast('กรุณาพิมพ์ชื่อเพื่อยืนยันการลงนาม', 'warning'); return; }
    setBusy(true);
    try { const updated = kind === 'sign' ? await documentWorkflowsApi.sign(selected.id, signature.trim()) : await documentWorkflowsApi.reject(selected.id, 'ไม่อนุมัติ/ส่งกลับเพื่อแก้ไข'); setItems((previous) => previous.map((x) => x.id === updated.id ? updated : x)); setSelected(null); setSignature(''); addToast(kind === 'sign' ? 'ลงนามเอกสารเรียบร้อย' : 'ส่งเอกสารกลับแล้ว', kind === 'sign' ? 'success' : 'info'); }
    catch (error) { addToast(error instanceof Error ? error.message : 'ดำเนินการไม่สำเร็จ', 'error'); }
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
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input className="mb-2 w-full rounded-xl border border-slate-200 p-2.5 pl-9 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="พิมพ์ค้นหาชื่อหรือกลุ่มงาน" value={signerSearch} onChange={(e) => setSignerSearch(e.target.value)} /></div>
          {selectedUsers.length > 0 && <div className="mb-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-2"><div className="mb-1 text-xs font-bold text-indigo-700">ลำดับที่เลือก</div><div className="space-y-1">{selectedUsers.map((u, index) => u && <div key={u.id} className="flex items-center justify-between rounded-lg bg-white px-2 py-1.5 text-sm shadow-sm"><span className="min-w-0 truncate"><b className="mr-2 text-indigo-700">{index + 1}.</b>{u.name}<span className="ml-1 text-xs text-slate-400">{u.position}</span></span><button type="button" className="ml-2 shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-rose-500 hover:bg-rose-50" onClick={() => toggleSigner(u.id, false)}><X className="mr-1 inline h-3 w-3" />นำออก</button></div>)}</div></div>}
          <div className="max-h-40 space-y-1 overflow-auto rounded-xl border border-slate-200 p-2">{filteredUsers.length === 0 ? <p className="p-3 text-center text-sm text-slate-400">{signers.length > 0 && !signerSearch ? 'เลือกครบแล้ว หรือค้นหาชื่อเพื่อเพิ่มผู้ลงนาม' : 'ไม่พบรายชื่อ'}</p> : filteredUsers.map((u) => <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm hover:bg-slate-50"><input type="checkbox" checked={false} onChange={(e) => toggleSigner(u.id, e.target.checked)} /><span className="truncate">{u.name}</span><span className="shrink-0 text-xs text-slate-400">{u.position}</span></label>)}</div>
        </div>
        <button disabled={busy} onClick={() => void create()} className="w-full rounded-xl bg-indigo-600 p-3 font-bold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-50">{busy ? 'กำลังบันทึก...' : 'ส่งเข้าลำดับการลงนาม'}</button>
      </div></section>
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="flex items-center justify-between"><h2 className="font-bold text-slate-800">เอกสารที่เกี่ยวข้อง</h2><span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">รอฉันเซ็น {pending.length}</span></div><div className="mt-4 space-y-3">{items.length === 0 ? <p className="py-10 text-center text-sm text-slate-400">ยังไม่มีเอกสาร</p> : items.map((d) => <button key={d.id} onClick={() => setSelected(d)} className="w-full rounded-xl border border-slate-200 p-3 text-left transition hover:border-indigo-400 hover:bg-indigo-50/30"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-slate-800">{d.title}</div><div className="text-xs text-slate-500">{topics.find((x) => x[0] === d.topic)?.[1]} · ผู้ส่ง {d.createdByName}</div></div><span className="text-xs font-bold text-indigo-600">{d.status === 'completed' ? 'เสร็จสิ้น' : d.status === 'rejected' ? 'ส่งกลับ' : 'ขั้นที่ ' + d.currentStep}</span></div></button>)}</div></section>
    </div>
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" onClick={() => setSelected(null)}><div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="flex shrink-0 items-center justify-between border-b px-5 py-3"><div><h2 className="font-bold text-slate-800">ตรวจสอบและลงนาม: {selected.title}</h2><p className="text-xs text-slate-500">{selected.fileName} · เปิดดูและลงนามในหน้านี้ได้เลย</p></div><button onClick={() => setSelected(null)} aria-label="ปิด" className="rounded-lg p-2 hover:bg-slate-100"><X /></button></div><div className="grid min-h-0 flex-1 gap-4 overflow-auto p-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]"><div className="min-h-[360px] overflow-hidden rounded-xl border bg-slate-100">{selectedIsImage ? <img src={selected.fileUrl} alt={selected.fileName} className="h-full max-h-[65vh] w-full object-contain" /> : selectedIsPdf ? <iframe className="h-[65vh] min-h-[360px] w-full bg-white" src={selected.fileUrl} title={selected.fileName} /> : <div className="flex h-full min-h-[360px] flex-col items-center justify-center p-6 text-center text-sm text-slate-500"><FileSignature className="mb-3 h-10 w-10 text-indigo-400" /><p className="font-semibold text-slate-700">ไฟล์นี้เป็นเอกสารสำนักงาน</p><p className="mt-1">ระบบบันทึกการลงนามออนไลน์ได้ แต่เบราว์เซอร์ไม่สามารถแสดงตัวอย่างไฟล์ชนิดนี้โดยตรง</p></div>}</div><div className="space-y-3"><div className="rounded-xl bg-slate-50 p-3 text-sm"><div className="mb-2 font-bold text-slate-700">ลำดับผู้ลงนาม</div>{selected.signers.map((s, index) => <div key={s.userId} className={`flex items-center gap-2 py-1 ${index === selected.currentStep - 1 ? 'font-bold text-indigo-700' : 'text-slate-600'}`}><span className="w-5 text-right">{index + 1}.</span><span className="min-w-0 truncate">{s.userName}</span><span className="ml-auto shrink-0 text-xs">{s.status === 'signed' ? 'ลงนามแล้ว' : s.status === 'rejected' ? 'ส่งกลับ' : index === selected.currentStep - 1 ? 'รอดำเนินการ' : 'รอคิว'}</span></div>)}</div>{selected.signers.some((s) => s.userId === currentUser.id && s.step === selected.currentStep && s.status === 'pending') && <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3"><div className="mb-2 text-sm font-bold text-indigo-900">ยืนยันการลงนามออนไลน์</div><input className="w-full rounded-lg border border-indigo-200 bg-white p-3" placeholder="พิมพ์ชื่อเพื่อยืนยันลายเซ็น" value={signature} onChange={(e) => setSignature(e.target.value)} /><p className="mt-2 text-xs text-slate-500">ชื่อที่พิมพ์จะถูกบันทึกพร้อมวันเวลาและลำดับการลงนาม</p><div className="mt-3 flex gap-2"><button disabled={busy} onClick={() => void act('sign')} className="flex-1 rounded-lg bg-emerald-600 p-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"><CheckCircle2 className="mr-1 inline h-4 w-4" />ลงนามและส่งต่อ</button><button disabled={busy} onClick={() => void act('reject')} className="rounded-lg border border-rose-200 bg-white px-3 font-bold text-rose-600 hover:bg-rose-50"><RotateCcw className="mr-1 inline h-4 w-4" />ส่งกลับ</button></div></div>}</div></div></div></div>}
  </div>;
};
