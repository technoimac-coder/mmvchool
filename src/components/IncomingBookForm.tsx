'use client';
import React, { useState } from 'react';
import type { IncomingBook } from '../lib/api';

export function IncomingBookForm({ books, academicYear, busy, error, onSubmit, onCancel }: {
  books: IncomingBook[]; academicYear: string; busy: boolean; error: string;
  onSubmit: (body: FormData) => Promise<void>; onCancel: () => void;
}) {
  const [year,setYear]=useState(academicYear);
  const [attachments,setAttachments]=useState<number[]>([]);
  const [nextAttachment,setNextAttachment]=useState(1);
  const latest=books.filter(book=>book.academic_year===year && /^\d+$/.test(book.receipt_no)).reduce((maximum,book)=>Math.max(maximum,Number(book.receipt_no)),0);
  const years=[...new Set([academicYear,...books.map(book=>book.academic_year)])].sort().reverse();
  const field='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-600';
  const label='text-sm font-semibold text-slate-700 md:text-right md:pt-2';
  const buttonBase='rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-40';
  const button=`${buttonBase} border-slate-300 bg-white text-slate-800 hover:bg-slate-50`;
  const primaryButton=`${buttonBase} border-blue-700 bg-blue-700 text-white hover:bg-blue-800`;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="การลงรับหนังสือจากภายนอก">
    <form onSubmit={event=>{event.preventDefault();if(!busy)void onSubmit(new FormData(event.currentTarget));}} className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-slate-100 px-5 py-3">
        <h2 className="text-lg font-bold text-[#0b1f3a]">การลงรับหนังสือจากภายนอก</h2>
        <div className="flex gap-2"><button type="submit" disabled={busy} className={primaryButton}>{busy?'กำลังบันทึก...':'บันทึก'}</button><button type="button" disabled={busy} onClick={onCancel} className={button}>ยกเลิก</button></div>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-sm text-slate-600">พิมพ์รายละเอียดเอกสารลงในช่องด้านล่าง และแนบไฟล์หนังสือทุกครั้ง</p>
        {error&&<p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p>}
        <div className="grid grid-cols-1 items-start gap-x-4 gap-y-3 md:grid-cols-[12rem_1fr]">
          <label htmlFor="office-receipt" className={label}>เลขทะเบียนรับ *</label>
          <div className="flex flex-wrap items-center gap-2"><input key={year} id="office-receipt" name="receipt_no" required maxLength={100} defaultValue={latest+1} className={`${field} max-w-40`}/><span className="text-xs text-slate-500">เลขทะเบียนใช้ล่าสุด {latest||'ยังไม่มี'}</span><label className="sr-only" htmlFor="office-year">ปีการศึกษา</label><select id="office-year" name="academic_year" value={year} onChange={event=>setYear(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2">{years.map(value=><option key={value} value={value}>ปีการศึกษา {value}</option>)}</select><p className="w-full text-xs text-slate-500">เลขที่แนะนำแก้ไขได้ ระบบจะตรวจสอบเลขซ้ำอีกครั้งเมื่อบันทึก</p></div>
          <label htmlFor="office-book-no" className={label}>ที่ *</label><input id="office-book-no" name="book_no" required maxLength={150} className={field}/>
          <label htmlFor="office-book-date" className={label}>ลงวันที่ *</label><input id="office-book-date" type="date" name="book_date" required className={`${field} max-w-xs`}/>
          <label htmlFor="office-sender" className={label}>หนังสือจาก *</label><input id="office-sender" name="sender" required maxLength={255} placeholder="เช่น สพม.ชลบุรี ระยอง" className={field}/>
          <label htmlFor="office-recipient" className={label}>เรียน</label><input id="office-recipient" name="recipient" defaultValue="ผู้อำนวยการ" maxLength={255} className={field}/>
          <label htmlFor="office-title" className={label}>เรื่อง *</label><input id="office-title" name="title" required maxLength={255} className={field}/>
          <label htmlFor="office-document" className={label}>แนบไฟล์หนังสือ <span className="text-rose-600">* ต้องแนบ</span></label>
          <div className="space-y-2"><div className="flex flex-wrap gap-2"><input id="office-document" type="file" name="document" required accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="min-w-0 flex-1 rounded-lg border p-2 text-sm"/><button type="button" disabled={attachments.length>=5} className={button} onClick={()=>{setAttachments(previous=>[...previous,nextAttachment]);setNextAttachment(previous=>previous+1);}}>แนบไฟล์เพิ่มเติม</button></div>
            {attachments.map((id,index)=><div key={id} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2"><label htmlFor={`office-extra-${id}`} className="text-xs whitespace-nowrap">แนบ {index+1}</label><input id={`office-extra-${id}`} type="file" name="attachments[]" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="min-w-0 flex-1 text-sm"/><button type="button" aria-label={`ลบไฟล์เพิ่มเติม ${index+1}`} onClick={()=>setAttachments(previous=>previous.filter(value=>value!==id))} className="px-2 py-1 text-rose-600">ลบ</button></div>)}
            <p className="text-xs text-slate-500">ไฟล์หลัก 1 ไฟล์ และไฟล์เพิ่มเติมได้ 5 ไฟล์ รวมไม่เกิน 15 MB · PDF, Word, JPG, PNG · ใช้ PDF เป็นไฟล์หลักสำหรับเกษียน</p>
          </div>
          <span className={label}>จำนวนหน้า / หน้าเกษียน</span><div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm">จำนวนหน้าทั้งหมด<input name="page_count" required type="number" min={1} max={10000} defaultValue={1} className={`${field} max-w-24`}/> หน้า</label><label className="flex items-center gap-2 text-sm">ผู้บริหารลงนามอยู่ในหน้าที่<input name="signing_page" required type="number" min={1} max={10000} defaultValue={1} className={`${field} max-w-24`}/></label></div>
          <label htmlFor="office-note" className={label}>หมายเหตุ / ข้อความเพิ่มเติม</label><textarea id="office-note" name="details" rows={2} className={field}/>
          <span className={label}>พิมพ์ตราลงทะเบียนบนหนังสือ</span><div className="flex items-center gap-5 pt-2 text-sm"><label className="flex gap-2"><input name="stamp_enabled" type="radio" value="1" defaultChecked/>พิมพ์</label><label className="flex gap-2"><input name="stamp_enabled" type="radio" value="0"/>ไม่พิมพ์</label></div>
        </div>
        <details className="rounded-lg border p-3 text-sm"><summary className="cursor-pointer font-semibold">วันที่รับ / ความเร่งด่วน / วันที่ติดตาม</summary><div className="mt-3 grid gap-3 sm:grid-cols-3"><label>วันที่รับ *<input name="received_date" type="date" required defaultValue={new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())} className={field}/></label><label>ความเร่งด่วน<select name="urgency" className={field}><option value="normal">ปกติ</option><option value="urgent">ด่วน</option><option value="very_urgent">ด่วนที่สุด</option></select></label><label>วันที่ติดตาม<input name="follow_date" type="date" className={field}/></label></div></details>
        <label className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm"><input type="checkbox" name="initial_endorsement" value="1" defaultChecked/><span>ลงความเห็นเสนอและลงชื่อโดยเจ้าหน้าที่หลังลงทะเบียน (สำหรับ PDF)<small className="mt-1 block text-slate-600">ระบบจะเปิดเอกสารให้ใส่ความเห็น ลายเซ็น ชื่อ และวันที่ตามแบบ แล้วเลือกผู้บริหารที่จะส่งต่อ</small></span></label>
        <label className="block text-sm font-semibold text-blue-900">ข้อความเสนอเบื้องต้น (แก้ไขได้ตามหนังสือแต่ละฉบับ)<textarea name="initial_note" rows={4} maxLength={500} defaultValue="- เห็นสมควรเสนอกลุ่มบริหารวิชาการ" className={`${field} mt-2 font-normal`}/><small className="mt-1 block font-normal text-slate-500">ไม่เกิน 4 บรรทัด ข้อความนี้จะนำไปแสดงบนหน้าเกษียน ให้ตรวจสอบและแก้ไขก่อนลงนามได้อีกครั้ง</small></label>
        <div className="flex justify-end gap-2 border-t pt-4"><button type="submit" disabled={busy} className={primaryButton}>{busy?'กำลังบันทึก...':'จัดเก็บเอกสาร'}</button><button type="button" disabled={busy} onClick={onCancel} className={button}>ยกเลิก</button></div>
      </div>
    </form>
  </div>;
}
