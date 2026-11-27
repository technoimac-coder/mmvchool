import { useState, type FormEvent } from 'react';
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
  onSave: (kind: 'news' | 'order', id: string, fields: Record<string, string>) => Promise<void>;
  onClose: () => void;
}) {
  const order = 'orderNumber' in item ? item : null;
  const news = 'content' in item ? item : null;
  const categories = order ? orderCategories : newsCategories;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputClass = 'mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = Object.fromEntries(Array.from(new FormData(event.currentTarget), ([key, value]) => [key, String(value)]));
    setBusy(true);
    setError('');
    try {
      await onSave(order ? 'order' : 'news', item.id, fields);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'บันทึกการแก้ไขไม่สำเร็จ');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="school-content-edit-title" className="max-h-[90dvh] w-full max-w-lg space-y-3 overflow-y-auto rounded-2xl bg-white p-5 text-sm shadow-xl">
        <h3 id="school-content-edit-title" className="text-lg font-bold">{order ? 'แก้ไขคำสั่งโรงเรียน' : 'แก้ไขประกาศโรงเรียน'}</h3>
        {order && <label className="block">เลขที่คำสั่ง<input name="orderNumber" required maxLength={100} defaultValue={order.orderNumber} className={inputClass} /></label>}
        <label className="block">หัวข้อ<input name="title" required maxLength={255} defaultValue={item.title} className={inputClass} /></label>
        <label className="block">หมวดหมู่<select name="category" defaultValue={item.category} className={inputClass}>
          {!Object.hasOwn(categories, item.category) && <option value={item.category}>หมวดหมู่เดิม ({item.category})</option>}
          {Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label className="block">หน่วยงาน<input name="department" maxLength={255} defaultValue={item.department} className={inputClass} /></label>
        {news && <label className="block">เนื้อหาประกาศ<textarea name="content" required rows={6} defaultValue={news.content} className={inputClass} /></label>}
        {order && <>
          <label className="block">วันที่ออกคำสั่ง<input type="date" name="signDate" required defaultValue={order.signDate} className={inputClass} /></label>
          <label className="block">ผู้ลงนาม<input name="signedBy" required maxLength={255} defaultValue={order.signedBy} className={inputClass} /></label>
        </>}
        {error && <p role="alert" className="text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={onClose} className="rounded-lg border px-4 py-2">ยกเลิก</button>
          <button type="submit" disabled={busy} className="rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข'}</button>
        </div>
      </form>
    </div>
  );
}
