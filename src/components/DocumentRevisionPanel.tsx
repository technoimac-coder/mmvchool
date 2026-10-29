'use client';

import { useRef, useState } from 'react';
import type { DocumentWorkflow, DocumentWorkflowRevision } from '../types';
import { documentWorkflowsApi } from '../lib/api';
import { documentFileError } from '../lib/document-upload';
import { documentSubmissionTime } from '../lib/document-revision-report';

export function DocumentRevisionPanel({ item, userId, busy, onBusyChange, onSaved, onError, onOpenRevision }: {
  item: DocumentWorkflow; userId: string; busy: boolean;
  onBusyChange: (value: boolean) => void; onSaved: (item: DocumentWorkflow) => void;
  onError: (message: string) => void; onOpenRevision: (item: DocumentWorkflow) => void;
}) {
  const [upload, setUpload] = useState<{ file: File; requestId: string } | null>(null);
  const [history, setHistory] = useState<DocumentWorkflowRevision[] | null>(null);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const submitting = useRef(false);
  const canResubmit = item.createdBy === userId && item.status === 'rejected' && !item.id.startsWith('EO-');

  const resubmit = async () => {
    if (!upload || busy || submitting.current) return;
    submitting.current = true; onBusyChange(true); onError('');
    try {
      const updated = await documentWorkflowsApi.resubmit(item.id, upload.file, item.fileVersion ?? 1, upload.requestId);
      onSaved(updated);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'อัปโหลดฉบับแก้ไขไม่สำเร็จ กรุณาลองใหม่');
    } finally { submitting.current = false; onBusyChange(false); }
  };
  const toggleHistory = async () => {
    if (showHistory) { setShowHistory(false); return; }
    if (history) { setShowHistory(true); return; }
    setHistoryBusy(true); onError('');
    try { setHistory(await documentWorkflowsApi.history(item.id)); setShowHistory(true); }
    catch (error) { onError(error instanceof Error ? error.message : 'โหลดประวัติไม่สำเร็จ'); }
    finally { setHistoryBusy(false); }
  };

  return <section aria-label="ฉบับเอกสารและประวัติ" className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
    <div><p className="text-sm font-bold text-indigo-900">เอกสารฉบับที่ {item.fileVersion ?? 1}</p><p className="mt-1 break-all text-xs text-slate-600">{item.fileName}</p><p className="mt-1 text-xs text-slate-500">ส่งครั้งแรก: {documentSubmissionTime(item.createdAt)}</p>{item.resubmittedAt && <p className="mt-1 text-xs font-semibold text-indigo-700">ส่งฉบับแก้ไข: {documentSubmissionTime(item.resubmittedAt)}</p>}</div>
    {canResubmit && <div className="space-y-3 border-t border-indigo-200 pt-3">
      <h4 className="text-sm font-bold text-indigo-900">อัปโหลดฉบับแก้ไขในรายการเดิม</h4>
      <p className="text-xs leading-relaxed text-slate-600">คงชื่อเรื่อง รายละเอียด ผู้ส่ง รอบปี และลำดับผู้ลงนามเดิม เก็บไฟล์และลายเซ็นเดิมในประวัติ แล้วเริ่มลงนามฉบับใหม่จากคนแรกพร้อมแจ้งเตือน</p>
      <label className="block text-xs font-semibold text-slate-700">ไฟล์ PDF ฉบับแก้ไข (ไม่เกิน 15 MB)
        <input aria-label="ไฟล์ PDF ฉบับแก้ไข" type="file" accept=".pdf,application/pdf" disabled={busy} className="mt-2 block w-full min-w-0 rounded-lg border border-indigo-200 bg-white p-2 text-xs" onChange={event => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (!file) return;
          const error = documentFileError(file);
          if (error) { setUpload(null); onError(error); return; }
          setUpload({ file, requestId: crypto.randomUUID() }); onError('');
        }} />
      </label>
      {upload && <p className="break-all text-xs font-semibold text-indigo-800">ไฟล์ที่เลือก: {upload.file.name}</p>}
      <button type="button" disabled={!upload || busy} onClick={() => void resubmit()} className="min-h-11 w-full rounded-lg bg-indigo-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">{busy ? 'กำลังอัปโหลด…' : 'อัปโหลดและส่งลงนามใหม่'}</button>
    </div>}
    {(item.fileVersion ?? 1) > 1 && <div className="space-y-2 border-t border-indigo-200 pt-3">
      <button type="button" disabled={historyBusy || busy} onClick={() => void toggleHistory()} aria-expanded={showHistory} className="min-h-11 w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-800">{historyBusy ? 'กำลังโหลดประวัติ…' : showHistory ? 'ซ่อนประวัติฉบับก่อนแก้ไข' : 'ดูประวัติฉบับก่อนแก้ไข'}</button>
      {showHistory && history?.map(revision => <button key={revision.version} type="button" onClick={() => onOpenRevision(revision.document)} className="block w-full rounded-lg border border-indigo-100 bg-white p-3 text-left text-xs">
        <span className="block font-bold text-indigo-800">เปิดฉบับที่ {revision.version} (อ่านอย่างเดียว)</span>
        <span className="mt-1 block break-all text-slate-600">{revision.document.fileName}</span>
        <span className="mt-1 block text-slate-500">ส่งฉบับนี้: {documentSubmissionTime(revision.document.resubmittedAt || revision.document.createdAt)}</span><span className="mt-1 block font-semibold text-blue-700">แก้ไขแล้ว — ส่งฉบับใหม่เมื่อ {documentSubmissionTime(revision.replacedAt)}</span>
      </button>)}
    </div>}
  </section>;
}
