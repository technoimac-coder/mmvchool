'use client';
import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { eofficeApi, type IncomingBook } from '../../lib/api';

export function EOfficeModule() {
  const { currentUser, academicPeriod } = useApp();
  const [books, setBooks] = useState<IncomingBook[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [year, setYear] = useState(academicPeriod.academicYear);
  const canRegister = ['admin', 'director', 'academic_affairs'].includes(currentUser.role);
  const load = async () => {
    setLoading(true); setError('');
    try { setBooks(await eofficeApi.list()); }
    catch (e) { setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (saving) return;
    const body = new FormData(event.currentTarget);
    setSaving(true); setError('');
    try { await eofficeApi.create(body); setOpen(false); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ'); }
    finally { setSaving(false); }
  };
  const filtered = books.filter(book => (year === 'all' || book.academic_year === year)
    && [book.receipt_no, book.book_no, book.title, book.sender].some(value => value.toLowerCase().includes(search.toLowerCase())));
  const years = [...new Set([academicPeriod.academicYear, ...books.map(book => book.academic_year)])].sort().reverse();
  const field = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 mt-1';
  return <div className="space-y-5">
    <div className="rounded-3xl bg-[#0b1f3a] p-6 text-white flex flex-wrap justify-between gap-3">
      <div><h1 className="text-xl font-bold">สารบรรณอิเล็กทรอนิกส์ (e-Office)</h1><p className="mt-2 text-sm text-slate-200">ทะเบียนรับหนังสือจากเขตและหน่วยงานภายนอก</p></div>
      {canRegister && <button onClick={() => { setOpen(true); setError(''); }} className="rounded-xl bg-white px-4 py-2 font-bold text-blue-900">+ ลงทะเบียนรับหนังสือ</button>}
    </div>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-rose-700">{error}</p>}
    <div className="rounded-3xl border bg-white p-5 space-y-4">
      <div className="flex flex-wrap gap-3"><input aria-label="ค้นหาหนังสือ" placeholder="ค้นหาเลขรับ เลขหนังสือ เรื่อง หรือหน่วยงาน" value={search} onChange={e => setSearch(e.target.value)} className="flex-1 min-w-48 rounded-xl border px-3 py-2" />
        <select aria-label="ปีการศึกษา" value={year} onChange={e => setYear(e.target.value)} className="rounded-xl border px-3 py-2"><option value="all">ทุกปีการศึกษา</option>{years.map(value => <option key={value} value={value}>ปีการศึกษา {value}</option>)}</select>
        <button onClick={() => void load()} disabled={loading} className="rounded-xl border px-3 py-2">โหลดใหม่</button>
      </div>
      <p className="text-sm text-slate-500">{filtered.length} รายการ</p>
      {loading ? <p>กำลังโหลดหนังสือ...</p> : filtered.length === 0 ? <p className="py-10 text-center text-slate-400">ไม่พบหนังสือตามเงื่อนไขที่เลือก</p> : filtered.map(book => <details key={book.id} className="rounded-xl border p-4">
        <summary className="cursor-pointer"><span className="font-bold">รับที่ {book.receipt_no} · {book.title}</span><span className="block mt-1 text-sm text-slate-500">{book.sender} · รับวันที่ {book.received_date} · หนังสือที่ {book.book_no}</span></summary>
        <div className="mt-3 space-y-2 text-sm"><p>หนังสือลงวันที่ {book.book_date} · ปีการศึกษา {book.academic_year}</p><p>ความเร่งด่วน: {book.urgency === 'very_urgent' ? 'ด่วนที่สุด' : book.urgency === 'urgent' ? 'ด่วน' : 'ปกติ'}</p><p className="whitespace-pre-wrap">{book.details}</p><p>ผู้ลงทะเบียน: {book.created_by_name}</p><a className="inline-block rounded-lg bg-blue-700 px-3 py-2 text-white" href={`/api/eoffice.php?download=${encodeURIComponent(book.id)}`}>ดาวน์โหลด {book.file_name}</a></div>
      </details>)}
    </div>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true" aria-label="ลงทะเบียนรับหนังสือ"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6">
      <h2 className="font-bold text-lg mb-4">ลงทะเบียนรับหนังสือ</h2>
      <form onSubmit={submit} className="space-y-3 text-sm">
        {error && <p role="alert" className="text-rose-700">{error}</p>}
        <div className="grid sm:grid-cols-2 gap-3"><label>เลขทะเบียนรับ *<input name="receipt_no" required maxLength={100} className={field} /></label><label>ปีการศึกษา *<input name="academic_year" required pattern="[0-9]{4}" defaultValue={academicPeriod.academicYear} className={field} /></label></div>
        <label className="block">เลขที่หนังสือ *<input name="book_no" required maxLength={150} className={field} /></label>
        <label className="block">เรื่อง *<input name="title" required maxLength={255} className={field} /></label>
        <label className="block">หน่วยงานต้นทาง *<input name="sender" required maxLength={255} placeholder="เช่น สพม.ชลบุรี ระยอง" className={field} /></label>
        <div className="grid sm:grid-cols-2 gap-3"><label>วันที่หนังสือ *<input type="date" name="book_date" required className={field} /></label><label>วันที่รับ *<input type="date" name="received_date" required className={field} /></label></div>
        <label className="block">ความเร่งด่วน<select name="urgency" className={field}><option value="normal">ปกติ</option><option value="urgent">ด่วน</option><option value="very_urgent">ด่วนที่สุด</option></select></label>
        <label className="block">รายละเอียดเพิ่มเติม<textarea name="details" rows={3} className={field} /></label>
        <label className="block">ไฟล์หนังสือ *<input type="file" name="document" required accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className={field} /><span className="text-xs text-slate-500">PDF, Word, JPG, PNG ขนาดไม่เกิน 15 MB</span></label>
        <div className="flex justify-end gap-2 pt-3"><button type="button" disabled={saving} onClick={() => setOpen(false)} className="rounded-xl border px-4 py-2">ยกเลิก</button><button disabled={saving} className="rounded-xl bg-blue-700 px-4 py-2 font-bold text-white">{saving ? 'กำลังบันทึก...' : 'บันทึกทะเบียนรับ'}</button></div>
      </form>
    </div></div>}
  </div>;
}
