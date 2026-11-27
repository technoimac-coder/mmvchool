import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FilePenLine, FileText, Image, Paperclip, Save, X } from 'lucide-react';
import type { SchoolNews, SchoolOrder } from '../types';

const newsCategories = {
  academic: 'งานวิชาการ', general: 'ข่าวทั่วไป', personnel: 'งานบุคคล/ว.PA',
  activity: 'กิจกรรมโรงเรียน', urgent: 'ด่วนที่สุด',
};

export function SchoolContentEditor({
  item, orderCategories, onSave, onClose,
}: {
  item: SchoolNews | SchoolOrder;
  orderCategories: Record<SchoolOrder['category'], string>;
  onSave: (kind: 'news' | 'order', id: string, fields: FormData) => Promise<void>;
  onClose: () => void;
}) {
  const order = 'orderNumber' in item ? item : null;
  const news = 'content' in item ? item : null;
  const categories = order ? orderCategories : newsCategories;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputClass = 'mt-1.5 block min-h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100';

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    for (const [field, maxMB] of [['image', 5], ['attachment', 15], ['document', 15]] as const) {
      const file = fields.get(field);
      if (file instanceof File && file.size > maxMB * 1024 * 1024) {
        setError(`ไฟล์ ${file.name} ต้องมีขนาดไม่เกิน ${maxMB} MB`);
        return;
      }
    }
    setBusy(true);
    setError('');
    try {
      await onSave(order ? 'order' : 'news', item.id, fields);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'บันทึกการแก้ไขไม่สำเร็จ');
      setBusy(false);
    }
  }

  const files: Array<{ name: string; label: string; limit: number; accept: string; url?: string; filename?: string; remove?: string }> = order ? [
    { name: 'document', label: 'ไฟล์คำสั่ง', limit: 15, accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png', url: order.fileUrl, filename: order.fileName },
  ] : [
    { name: 'image', label: 'รูปประกาศ', limit: 5, accept: '.jpg,.jpeg,.png,.webp', url: news?.imageUrl, filename: 'เปิดรูปเดิม', remove: 'removeImage' },
    { name: 'attachment', label: 'เอกสาร PDF', limit: 15, accept: '.pdf,application/pdf', url: news?.attachmentUrl, filename: news?.attachmentName, remove: 'removeAttachment' },
  ];

  return (
    <dialog ref={dialogRef} aria-labelledby="school-content-edit-title"
      onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
      className="m-auto w-[calc(100%-1.5rem)] max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-sm text-slate-800 shadow-2xl backdrop:bg-slate-950/50">
      <form onSubmit={submit} aria-busy={busy} className="flex max-h-[92dvh] flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700"><FilePenLine className="size-5" /></span>
          <h3 id="school-content-edit-title" className="min-w-0 flex-1 text-lg font-bold">{order ? 'แก้ไขคำสั่งโรงเรียน' : 'แก้ไขประกาศโรงเรียน'}</h3>
          <button type="button" disabled={busy} aria-label="ปิด" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="size-5" /></button>
        </header>

        <div className="min-h-0 space-y-5 overflow-y-auto px-4 py-4 sm:px-6">
          <section aria-label="ข้อมูลรายการ" className="grid grid-cols-1 gap-3 font-semibold sm:grid-cols-2">
            <label className="sm:col-span-2">หัวข้อ<textarea name="title" required maxLength={255} rows={2} defaultValue={item.title} className={inputClass} /></label>
            <label>หมวดหมู่<select name="category" defaultValue={item.category} className={inputClass}>
              {!Object.hasOwn(categories, item.category) && <option value={item.category}>หมวดหมู่เดิม ({item.category})</option>}
              {Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
            <label>หน่วยงาน<input name="department" maxLength={255} defaultValue={item.department} className={inputClass} /></label>
            {news && <label className="sm:col-span-2">เนื้อหาประกาศ<textarea name="content" required rows={5} defaultValue={news.content} className={inputClass} /></label>}
            {order && <>
              <label>เลขที่คำสั่ง<input name="orderNumber" required maxLength={100} defaultValue={order.orderNumber} className={inputClass} /></label>
              <label>วันที่ออกคำสั่ง<input type="date" name="signDate" required defaultValue={order.signDate} className={inputClass} /></label>
              <label className="sm:col-span-2">ผู้ลงนาม<input name="signedBy" required maxLength={255} defaultValue={order.signedBy} className={inputClass} /></label>
            </>}
          </section>

          <section className="space-y-3 border-t border-slate-100 pt-4">
            <h4 className="flex items-center gap-2 font-bold"><Paperclip className="size-4 text-indigo-600" /> ไฟล์แนบ</h4>
            <div className={`grid gap-3 ${news ? 'sm:grid-cols-2' : ''}`}>
              {files.map(file => {
                const Icon = file.name === 'image' ? Image : FileText;
                return (
                  <div key={file.name} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <label className="block">
                      <span className="flex items-center gap-2 font-semibold"><Icon className="size-4 text-indigo-600" /> {file.label}</span>
                      <span className="mt-1 block text-xs text-slate-500">เลือกไฟล์ใหม่ · ไม่เกิน {file.limit} MB</span>
                      <input type="file" name={file.name} accept={file.accept} aria-label={`เลือก${file.label}ใหม่`}
                        className="mt-2 block w-full min-w-0 text-xs text-slate-600 file:mr-2 file:cursor-pointer file:rounded-lg file:border-0 file:bg-indigo-100 file:px-2.5 file:py-2 file:font-semibold file:text-indigo-800" />
                    </label>
                    {file.url && (
                      <div className="mt-3 space-y-2 border-t border-slate-200 pt-2 text-xs">
                        <a href={file.url} title={file.filename || 'เปิดไฟล์เดิม'} target="_blank" rel="noreferrer" className="block truncate font-semibold text-indigo-700 hover:underline">{file.filename || 'เปิดไฟล์เดิม'}</a>
                        {file.remove && <label className="flex items-center gap-2 text-rose-700"><input type="checkbox" name={file.remove} value="1" /> เอาไฟล์เดิมออก</label>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <footer className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 sm:px-6">
          {error && <p role="alert" className="mb-2 rounded-lg bg-rose-50 p-2 text-rose-700">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 font-semibold hover:bg-slate-50">ยกเลิก</button>
            <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2 font-semibold text-white hover:bg-indigo-800 disabled:opacity-50"><Save className="size-4" /> {busy ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข'}</button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
