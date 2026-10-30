'use client';

import { useRef, useState } from 'react';
import type { DocumentWorkflow } from '../types';
import { documentWorkflowsApi } from '../lib/api';

export function DocumentTrashPanel({ onRestored, userId }: { onRestored: (item: DocumentWorkflow) => void; userId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DocumentWorkflow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <button type="button" disabled={busy} aria-expanded={open} className="min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold" onClick={async () => {
      if (open) { setOpen(false); return; }
      if (submitting.current) return;
      submitting.current = true; setOpen(true); setItems([]); setBusy(true); setError('');
      try { setItems((await documentWorkflowsApi.trash()).filter(item => item.createdBy === userId)); }
      catch (error) { setError(error instanceof Error ? error.message : 'โหลดเอกสารที่ลบไม่สำเร็จ'); }
      finally { submitting.current = false; setBusy(false); }
    }}>เอกสารที่ลบ</button>
    {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
    {open && <div className="mt-3 space-y-2">
      <p className="text-xs text-slate-600">เฉพาะเอกสารที่คุณลบ เก็บไฟล์และประวัติไว้ เมื่อนำกลับคืนจะใช้รายการเดิมและแจ้งผู้ลงนามคนแรกอีกครั้ง</p>
      {busy && <p role="status" className="text-sm">กำลังดำเนินการ…</p>}
      {!busy && !items.length && !error && <p className="text-sm text-slate-500">ไม่มีเอกสารที่ลบ</p>}
      {items.map(item => <div key={item.id} className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><p className="break-words text-sm font-semibold">{item.title}</p><p className="break-all text-xs text-slate-500">{item.fileName}</p><p className="text-xs text-slate-500">ภาคเรียน {item.semester}/{item.academicYear} · ลบเมื่อ {item.deletedAt}</p></div>
        <button type="button" disabled={busy} className="min-h-11 shrink-0 rounded-lg border border-indigo-200 px-3 py-2 text-sm font-bold text-indigo-700" onClick={async () => {
          if (submitting.current) return;
          submitting.current = true; setBusy(true); setError('');
          try { const restored = await documentWorkflowsApi.setDeleted(item.id, false, item.fileVersion ?? 1, item.lifecycleVersion ?? 0); setItems(previous => previous.filter(value => value.id !== item.id)); onRestored(restored); }
          catch (error) { setError(error instanceof Error ? error.message : 'นำเอกสารกลับคืนไม่สำเร็จ'); }
          finally { submitting.current = false; setBusy(false); }
        }}>นำกลับคืน</button>
      </div>)}
    </div>}
  </section>;
}
