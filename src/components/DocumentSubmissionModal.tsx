'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, LoaderCircle, Search, Upload, X } from 'lucide-react';
import { documentWorkflowsApi } from '../lib/api';
import { documentFileError, MAX_DOCUMENT_FILES, submitDocumentFiles, type DocumentUpload } from '../lib/document-upload';
import { lessonPlanTopicLabel, fiscalYearForAcademicTerm } from '../lib/lessonPlanTopicLabel';
import type { DocumentWorkflow, DocumentWorkflowTopic, User } from '../types';

type Props = {
  users: User[];
  currentUser: User;
  academicYear: string;
  semester: '1' | '2';
  topics: Array<[DocumentWorkflowTopic, string]>;
  onClose: () => void;
  onCreated: (item: DocumentWorkflow) => void;
  notify: (message: string, type: 'success' | 'warning' | 'error') => void;
};

export function DocumentSubmissionModal({ users, currentUser, academicYear, semester, topics, onClose, onCreated, notify }: Props) {
  const [entries, setEntries] = useState<DocumentUpload[]>([]);
  const [topic, setTopic] = useState<DocumentWorkflowTopic>('lesson_plan_before');
  const [createSemester, setCreateSemester] = useState(semester);
  const [description, setDescription] = useState('');
  const [signers, setSigners] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [selectionError, setSelectionError] = useState('');
  const submitting = useRef(false);
  const batchId = useRef('');
  const availableUsers = users.filter(user => user.id !== currentUser.id && user.status !== 'inactive');
  const matches = search.trim() ? availableUsers.filter(user => !signers.includes(user.id) && `${user.name} ${user.position}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())).slice(0, 8) : [];
  const completed = entries.filter(entry => entry.status === 'success').length;
  const failed = entries.filter(entry => entry.status === 'error').length;

  const selectFiles = (files: FileList | null) => {
    if (!files || started) return;
    const added = Array.from(files).filter(file => !entries.some(entry => entry.file.name === file.name && entry.file.size === file.size && entry.file.lastModified === file.lastModified));
    if (entries.length + added.length > MAX_DOCUMENT_FILES) {
      setSelectionError(`เลือกได้ครั้งละไม่เกิน ${MAX_DOCUMENT_FILES} ไฟล์`);
      return;
    }
    if (added.length && !batchId.current) batchId.current = crypto.randomUUID();
    setSelectionError('');
    setEntries(previous => [...previous, ...added.map(file => ({ requestId: crypto.randomUUID(), file, title: file.name.replace(/\.pdf$/i, '').slice(0, 255), status: 'ready' as const }))]);
  };

  const send = async () => {
    if (submitting.current) return;
    if (!entries.length || !signers.length) { notify('กรุณาเลือกไฟล์ PDF และผู้ลงนามอย่างน้อย 1 คน', 'warning'); return; }
    if (entries.some(entry => documentFileError(entry.file) || !entry.title.trim())) { notify('กรุณาแก้ไขไฟล์หรือชื่อเรื่องที่ระบุไว้ก่อนส่ง', 'warning'); return; }
    submitting.current = true;
    setBusy(true);
    setStarted(true);
    try {
      const result = await submitDocumentFiles(entries,
        entry => documentWorkflowsApi.create(entry.title.trim(), topic, description.trim(), signers, entry.file, academicYear, createSemester, entry.requestId, batchId.current),
        (requestId, change, item) => {
          setEntries(previous => previous.map(entry => entry.requestId === requestId ? { ...entry, ...change } : entry));
          if (item) onCreated(item);
        });
      let notificationFailed = false;
      let notificationsSent = 0;
      if (result.succeeded > 0 && batchId.current) {
        try {
          notificationsSent = await documentWorkflowsApi.notifyBatch(batchId.current);
        } catch {
          notificationFailed = true;
          notify('บันทึกไฟล์แล้ว แต่ส่งการแจ้งเตือนไม่สำเร็จ กรุณากดส่งซ้ำเพื่อแจ้งผู้ลงนาม', 'warning');
        }
      }
      if (!result.failed && !notificationFailed) {
        notify(`ส่งเอกสาร ${result.succeeded} ไฟล์ แยกรายแผนในภาคเรียน ${createSemester}/${academicYear} แล้ว${notificationsSent ? ' พร้อมแจ้งผู้ลงนามแล้ว' : ''}`, 'success');
        onClose();
      } else if (result.failed) {
        notify(`ส่งสำเร็จ ${result.succeeded} ไฟล์ ไม่สำเร็จ ${result.failed} ไฟล์${notificationsSent ? ' แจ้งผู้ลงนามในไฟล์ที่สำเร็จแล้ว' : ''} กดส่งซ้ำได้`, 'warning');
      }
    } finally { submitting.current = false; setBusy(false); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-3 backdrop-blur-xs sm:p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="document-submission-title" className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
      <div className="sticky top-0 z-30 flex items-start justify-between gap-3 border-b border-slate-100 bg-white p-5">
        <div><h2 id="document-submission-title" className="font-extrabold text-slate-800">ส่งเอกสารใหม่</h2><p className="text-xs text-slate-500">เลือกหลายไฟล์ได้ แต่ละไฟล์ตรวจและลงนามแยกกัน</p></div>
        <button type="button" disabled={busy} aria-label="ปิดหน้าส่งเอกสาร" onClick={onClose} className="rounded-xl p-2 text-slate-500 disabled:opacity-40"><X className="h-5 w-5" /></button>
      </div>
      <div className="space-y-4 p-5">
        <fieldset disabled={busy || started} className="space-y-4 disabled:opacity-70">
          <label className="block text-sm font-bold text-slate-700">ชนิดเอกสาร<select className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3" value={topic} onChange={event => setTopic(event.target.value as DocumentWorkflowTopic)}>{topics.map(([value, label]) => <option key={value} value={value}>{lessonPlanTopicLabel(value, label, academicYear, createSemester)}</option>)}</select></label>
          {topic === 'classroom_research' && <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"><label className="block font-bold">ปีงบประมาณ<input readOnly value={fiscalYearForAcademicTerm(academicYear, createSemester)} className="mt-1.5 w-full rounded-lg border border-blue-200 bg-white p-2" /></label><p className="mt-2">ปีงบประมาณอ้างอิงภาคเรียนที่เลือก: เทอม 1 ใช้ปีเดียวกับปีการศึกษา เทอม 2 ใช้ปีถัดไป</p></div>}
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold text-slate-700">ปีการศึกษา<input readOnly value={academicYear} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-100 p-3" /></label><label className="text-sm font-bold text-slate-700">ภาคเรียน<select value={createSemester} onChange={event => setCreateSemester(event.target.value as '1' | '2')} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3"><option value="1">ภาคเรียนที่ 1</option><option value="2">ภาคเรียนที่ 2</option></select></label></div>
          <label className="block text-sm font-bold text-slate-700">รายละเอียดเพิ่มเติม (ใช้กับทุกไฟล์)<textarea className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 font-normal" rows={2} maxLength={4000} value={description} onChange={event => setDescription(event.target.value)} /></label>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 p-5 text-center text-sm text-slate-700"><Upload className="h-6 w-6 text-indigo-600" /><span className="font-bold">เลือกไฟล์ PDF หลายไฟล์</span><span className="text-xs">เช่น 20 แผนในหนึ่งภาคเรียน · ไม่เกิน 15 MB ต่อไฟล์ · สูงสุด {MAX_DOCUMENT_FILES} ไฟล์ต่อครั้ง</span><input aria-label="เลือกไฟล์แผนการสอนหรือเอกสาร PDF" type="file" multiple accept=".pdf,application/pdf" className="max-w-full text-xs" onChange={event => { selectFiles(event.target.files); event.target.value = ''; }} /></label>
          {selectionError && <p role="alert" className="text-sm text-rose-600">{selectionError}</p>}
          <div className="text-xs text-slate-500">เก็บแต่ละไฟล์ภายใต้บัญชี {currentUser.name} แยกตามปีการศึกษาและภาคเรียน ตั้งชื่อเรื่องแยกแต่ละแผนได้ด้านล่าง</div>
          <div className="space-y-2"><label className="block text-sm font-bold text-slate-800">ผู้ลงนามตามลำดับ (ใช้กับทุกไฟล์)<span className="relative mt-2 block"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input className="w-full rounded-xl border border-slate-200 p-2.5 pl-9 text-sm font-normal" placeholder="ค้นหาชื่อหรือตำแหน่งผู้ลงนาม" value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && matches[0]) { event.preventDefault(); setSigners(previous => [...previous, matches[0].id]); setSearch(''); } }} /></span></label>
            {search.trim() && <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 p-1">{matches.length ? matches.map(user => <button key={user.id} type="button" onClick={() => { setSigners(previous => [...previous, user.id]); setSearch(''); }} className="block w-full rounded-lg p-2 text-left text-sm hover:bg-indigo-50">{user.name} <span className="text-xs text-slate-500">{user.position}</span><span className="float-right text-indigo-600">+ เลือก</span></button>) : <p className="p-2 text-sm text-slate-500">ไม่พบผู้ลงนามที่ตรงกัน</p>}</div>}
            {signers.map((id, index) => <div key={id} className="flex items-center justify-between gap-2 rounded-lg bg-indigo-50 p-2 text-sm"><span>{index + 1}. {availableUsers.find(user => user.id === id)?.name}</span><button type="button" onClick={() => setSigners(previous => previous.filter(value => value !== id))} className="text-rose-600">นำออก</button></div>)}
            <p className="text-xs text-slate-500">แจ้งเตือนผู้ลงนามคนแรกของแต่ละไฟล์ และแจ้งคนถัดไปเมื่อถึงลำดับ</p>
          </div>
        </fieldset>
        {entries.length > 0 && <section aria-label="รายการไฟล์ที่เลือก" className="space-y-2">
          <div className="flex justify-between text-sm font-bold text-slate-700"><span>เลือกแล้ว {entries.length} ไฟล์</span><span aria-live="polite">สำเร็จ {completed} · ไม่สำเร็จ {failed}</span></div>
          {started && <div role="status" className="rounded-xl bg-indigo-50 p-3 text-sm text-indigo-700">{busy ? 'กำลังส่งไฟล์ กรุณาเปิดหน้านี้ไว้จนเสร็จ' : 'ไฟล์ที่สำเร็จเก็บแล้ว กดส่งซ้ำได้เฉพาะรายการที่ไม่สำเร็จ'}</div>}
          <div className="max-h-80 space-y-2 overflow-y-auto">{entries.map((entry, index) => { const error = documentFileError(entry.file) || entry.error; return <div key={entry.requestId} className={`rounded-xl border p-3 ${error ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200'}`}>
            <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="break-all text-xs text-slate-500">{index + 1}. {entry.file.name} · {(entry.file.size / (1024 * 1024)).toFixed(2)} MB</p></div>{!started && <button type="button" aria-label={`นำไฟล์ ${entry.file.name} ออก`} className="shrink-0 text-rose-600" onClick={() => setEntries(previous => previous.filter(item => item.requestId !== entry.requestId))}><X className="h-4 w-4" /></button>}</div>
            <label className="mt-2 block text-xs text-slate-600">ชื่อเรื่องเอกสาร<input aria-label={`ชื่อเรื่องไฟล์ที่ ${index + 1}`} disabled={busy || started} maxLength={255} value={entry.title} onChange={event => setEntries(previous => previous.map(item => item.requestId === entry.requestId ? { ...item, title: event.target.value } : item))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-800 disabled:bg-slate-50" /></label>
            {entry.status === 'success' && <p className="mt-2 flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="h-4 w-4" />ส่งแล้ว รอลงนามตามลำดับ</p>}
            {entry.status === 'uploading' && <p className="mt-2 flex items-center gap-1 text-xs text-indigo-600"><LoaderCircle className="h-4 w-4 animate-spin" />กำลังส่งไฟล์นี้...</p>}
            {error && <p role="alert" className="mt-2 break-words text-xs text-rose-600">{error}</p>}
          </div>; })}</div>
        </section>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm disabled:opacity-40">{started ? 'ปิด' : 'ยกเลิก'}</button><button type="button" disabled={busy || !entries.length} onClick={() => void send()} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? `กำลังส่ง (${completed}/${entries.length})` : started ? 'ส่งซ้ำ / แจ้งผู้ลงนาม' : `ส่ง ${entries.length || ''} ไฟล์เข้าลำดับการลงนาม`}</button></div>
      </div>
    </section>
  </div>;
}
