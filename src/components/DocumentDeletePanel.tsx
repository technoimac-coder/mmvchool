'use client';

import { useRef, useState } from 'react';
import type { DocumentWorkflow } from '../types';
import { canCorrectDocument } from '../lib/document-correction';
import { documentWorkflowsApi } from '../lib/api';

export function DocumentDeletePanel({ item, userId, busy, onBusyChange, onSaved, onError }: {
  item: DocumentWorkflow; userId: string; busy: boolean; onBusyChange: (value: boolean) => void;
  onSaved: (item: DocumentWorkflow) => void; onError: (message: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const submitting = useRef(false);
  if (!canCorrectDocument(item, userId)) return null;
  return <section className="border-b px-4 py-2" aria-label="ลบเอกสารก่อนลงนาม">
    {!confirming ? <button type="button" disabled={busy} onClick={() => setConfirming(true)} className="min-h-11 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700">ลบเอกสาร</button> :
      <div role="group" aria-label="ยืนยันลบเอกสาร" className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
        <p className="break-words text-sm font-bold text-rose-800">ลบเอกสาร “{item.title}” ใช่ไหม?</p>
        <p className="text-xs text-slate-700">รายการจะออกจากงานรอลงนามและรายงาน เก็บไฟล์และประวัติเดิมไว้ สามารถนำกลับคืนได้จาก “เอกสารที่ลบ”</p>
        <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} className="min-h-11 rounded-lg bg-rose-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50" onClick={async () => {
          if (busy || submitting.current) return;
          submitting.current = true; onBusyChange(true); onError('');
          try { onSaved(await documentWorkflowsApi.setDeleted(item.id, true, item.fileVersion ?? 1, item.lifecycleVersion ?? 0)); }
          catch (error) { onError(error instanceof Error ? error.message : 'ลบเอกสารไม่สำเร็จ'); }
          finally { submitting.current = false; onBusyChange(false); }
        }}>{busy ? 'กำลังลบ…' : 'ยืนยันลบ'}</button><button type="button" disabled={busy} onClick={() => setConfirming(false)} className="min-h-11 rounded-lg border bg-white px-3 py-2 text-sm">ยกเลิก</button></div>
      </div>}
  </section>;
}
