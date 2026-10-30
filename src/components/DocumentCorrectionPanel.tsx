'use client';

import { useRef, useState } from 'react';
import type { DocumentWorkflow, DocumentWorkflowTopic } from '../types';
import { canCorrectDocument, documentTopics } from '../lib/document-correction';
import { documentFileError } from '../lib/document-upload';
import { documentWorkflowsApi } from '../lib/api';
import { lessonPlanTopicLabel } from '../lib/lessonPlanTopicLabel';

export function DocumentCorrectionPanel({ item, userId, busy, onBusyChange, onSaved, onError }: {
  item: DocumentWorkflow; userId: string; busy: boolean; onBusyChange: (busy: boolean) => void;
  onSaved: (item: DocumentWorkflow) => void; onError: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [topic, setTopic] = useState<DocumentWorkflowTopic>(item.topic);
  const [description, setDescription] = useState(item.description || '');
  const [file, setFile] = useState<File | null>(null);
  const submitting = useRef(false);
  const retry = useRef('');
  if (!canCorrectDocument(item, userId)) return null;
  const changed = Boolean(file) || title.trim() !== item.title || topic !== item.topic || description.trim() !== (item.description || '');
  const resetRetry = () => { retry.current = ''; };
  return <section className="border-b px-4 py-2" aria-label="แก้ไขเอกสารก่อนลงนาม">
    {!editing ? <button type="button" disabled={busy} onClick={() => {
      setTitle(item.title); setTopic(item.topic); setDescription(item.description || ''); setFile(null); resetRetry(); setEditing(true);
    }} className="min-h-11 rounded-lg border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700">แก้ไขไฟล์ / ชนิดเอกสาร</button> :
      <form className="max-h-[50vh] space-y-3 overflow-auto py-2" onSubmit={async event => {
        event.preventDefault(); if (busy || submitting.current || !changed) return;
        if (file) { const error = documentFileError(file); if (error) { onError(error); return; } }
        submitting.current = true; onBusyChange(true); onError('');
        if (!retry.current) retry.current = crypto.randomUUID();
        try {
          const updated = await documentWorkflowsApi.correctSubmission(item.id, { title: title.trim(), topic, description: description.trim() }, file, item.fileVersion ?? 1, retry.current);
          onSaved(updated); setEditing(false);
        } catch (error) { onError(error instanceof Error ? error.message : 'แก้ไขเอกสารไม่สำเร็จ กรุณาลองใหม่'); }
        finally { submitting.current = false; onBusyChange(false); }
      }}>
        <p className="text-xs text-slate-600">แก้ไขได้เฉพาะเมื่อยังไม่มีผู้ลงนาม ใช้รายการเดิม เก็บฉบับก่อนแก้ไขไว้ในประวัติ และแจ้งผู้ลงนามคนแรกให้เปิดข้อมูลล่าสุด</p>
        <label className="block text-sm font-semibold">ชนิดเอกสาร<select aria-label="แก้ไขชนิดเอกสาร" disabled={busy} value={topic} onChange={event => { setTopic(event.target.value as DocumentWorkflowTopic); resetRetry(); }} className="mt-1 min-h-11 w-full rounded-lg border p-2">
          {documentTopics.map(([value, label]) => <option key={value} value={value}>{lessonPlanTopicLabel(value, label, item.academicYear || '', item.semester || '')}</option>)}
        </select></label>
        <label className="block text-sm font-semibold">ชื่อเรื่อง<input required maxLength={255} disabled={busy} value={title} onChange={event => { setTitle(event.target.value); resetRetry(); }} className="mt-1 min-h-11 w-full rounded-lg border p-2" /></label>
        <label className="block text-sm font-semibold">รายละเอียด<textarea maxLength={4000} rows={2} disabled={busy} value={description} onChange={event => { setDescription(event.target.value); resetRetry(); }} className="mt-1 w-full rounded-lg border p-2" /></label>
        <p className="break-all text-xs text-slate-600">ไฟล์ปัจจุบัน: {item.fileName}</p>
        <label className="block text-sm font-semibold">เปลี่ยนไฟล์ PDF (ไม่เกิน 15 MB หรือเว้นไว้เพื่อใช้ไฟล์เดิม)<input aria-label="เปลี่ยนไฟล์ก่อนลงนาม" type="file" accept=".pdf,application/pdf" disabled={busy} className="mt-1 block w-full rounded-lg border p-2 text-xs" onChange={event => {
          const selected = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (!selected) return;
          const error = documentFileError(selected); if (error) { setFile(null); onError(error); return; }
          setFile(selected); resetRetry(); onError('');
        }} /></label>
        {file && <p className="break-all text-xs font-semibold text-indigo-800">ไฟล์ใหม่: {file.name} <button type="button" disabled={busy} onClick={() => { setFile(null); resetRetry(); }}>ใช้ไฟล์เดิม</button></p>}
        <div className="flex flex-wrap gap-2"><button disabled={busy || !changed || !title.trim()} className="min-h-11 rounded-lg bg-indigo-700 px-3 py-2 text-sm text-white disabled:opacity-50">{busy ? 'กำลังบันทึก…' : 'บันทึกและส่งข้อมูลล่าสุด'}</button><button type="button" disabled={busy} onClick={() => setEditing(false)} className="min-h-11 rounded-lg border px-3 py-2 text-sm">ยกเลิก</button></div>
      </form>}
  </section>;
}
