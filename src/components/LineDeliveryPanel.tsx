'use client';

import { useCallback, useEffect, useState } from 'react';
import { lineDeliveryApi, LineDeliveryReport, LineDeliveryState } from '../lib/api';
import { useApp } from '../context/AppContext';

const labels: Record<LineDeliveryState, string> = {
  sent: 'LINE ตอบรับแล้ว', pending: 'รอลองส่งใหม่', sending: 'กำลังส่ง', failed: 'ส่งไม่สำเร็จ', cancelled: 'ยุติการส่ง',
};
const colors: Record<LineDeliveryState, string> = {
  sent: 'bg-emerald-50 text-emerald-800', pending: 'bg-amber-50 text-amber-900', sending: 'bg-blue-50 text-blue-800', failed: 'bg-rose-50 text-rose-800', cancelled: 'bg-slate-100 text-slate-600',
};
const modules: Record<string, string> = { document_workflow: 'เอกสารลงนาม', eoffice: 'สารบรรณ e-Office', leave: 'การลา', official_duty: 'ไปราชการ', vehicle: 'ขอใช้รถ', room: 'อาคารสถานที่', repair: 'แจ้งซ่อม', substitute: 'สอนแทน', dashboard: 'ข่าว/คำสั่ง', system: 'ระบบ' };
const time = (value: string | null) => value ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(value.replace(' ', 'T') + '+07:00')) : '—';

export function LineDeliveryPanel() {
  const { addToast } = useApp();
  const [report, setReport] = useState<LineDeliveryReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'jobs' | 'accounts'>('jobs');
  const [retrying, setRetrying] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try { setReport(await lineDeliveryApi.report(status, search, page)); setError(''); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'โหลดสถานะไม่สำเร็จ'); }
    finally { setLoading(false); }
  }, [status, search, page]);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try { const value = await lineDeliveryApi.report(status, search, page); if (active) { setReport(value); setError(''); } }
      catch (failure) { if (active) setError(failure instanceof Error ? failure.message : 'โหลดสถานะไม่สำเร็จ'); }
    };
    void refresh();
    const interval = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 30000);
    return () => { active = false; window.clearInterval(interval); };
  }, [status, search, page]);
  const retry = async (job: LineDeliveryReport['jobs'][number]) => {
    setRetrying(job.id);
    try { await lineDeliveryApi.retry(job.id, job.attempts); addToast('นำรายการเข้าคิวส่งซ้ำแล้ว', 'success'); await load(); }
    catch (failure) { addToast(failure instanceof Error ? failure.message : 'ส่งซ้ำไม่สำเร็จ', 'error'); }
    finally { setRetrying(''); }
  };
  const accounts = report?.accounts.filter(account => `${account.id} ${account.name}`.toLowerCase().includes(search.toLowerCase())) ?? [];
  const linked = report?.accounts.filter(account => account.linked).length ?? 0;
  return <section className="space-y-4" aria-label="ตรวจสอบการส่ง LINE">
    <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-base font-extrabold">ตรวจสอบการส่ง LINE</h2><p className="text-xs text-slate-500">ผลส่งรายคนและการผูกบัญชี · รายการส่งใน 7 วันล่าสุด · อัปเดตทุก 30 วินาที</p></div>
        <button type="button" disabled={loading} onClick={() => void load()} className="rounded-xl border px-4 py-2 text-sm disabled:opacity-50">{loading ? 'กำลังโหลด…' : 'โหลดสถานะใหม่'}</button>
      </div>
      <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">“LINE ตอบรับแล้ว” หมายถึง LINE รับคำขอส่งข้อความ ไม่ยืนยันว่าเปิดอ่านหรือได้รับบนมือถือ หากไม่ได้รับให้ตรวจการเพิ่มเพื่อน การบล็อก และการปิดแจ้งเตือน LINE OA</p>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error} · ข้อมูลที่แสดงอาจไม่ใช่สถานะล่าสุด</p>}
      {report && <>
        {!report.configured && <p role="alert" className="text-sm text-rose-800">ยังไม่ได้ตั้งค่า LINE OA บนเซิร์ฟเวอร์</p>}
        <div className={`rounded-xl p-3 text-sm ${report.worker.healthy ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
          {report.worker.healthy ? 'งานส่งซ้ำอัตโนมัติทำงานปกติ' : 'งานส่งซ้ำไม่ได้รายงานผลใน 3 นาทีล่าสุด กรุณาตรวจ Scheduled Tasks บนโฮสติ้ง'} · ล่าสุด {time(report.worker.lastRunAt)}
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
          {(['sent', 'pending', 'failed'] as const).map(key => <button key={key} type="button" onClick={() => { setView('jobs'); setStatus(key); setPage(1); }} className={`rounded-xl p-3 text-left ${colors[key]}`}><span className="block text-xs">{labels[key]}</span><strong className="text-xl">{report.summary[key]}</strong></button>)}
          <button type="button" onClick={() => setView('accounts')} className="rounded-xl bg-slate-50 p-3 text-left"><span className="block text-xs">บุคลากรที่ผูก LINE</span><strong className="text-xl">{linked}/{report.accounts.length}</strong></button>
        </div>
      </>}
      <div className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={view === 'jobs'} onClick={() => setView('jobs')} className={`rounded-xl px-4 py-2 text-sm ${view === 'jobs' ? 'bg-[#0b1f3a] text-white' : 'border'}`}>รายการส่ง</button>
        <button type="button" aria-pressed={view === 'accounts'} onClick={() => setView('accounts')} className={`rounded-xl px-4 py-2 text-sm ${view === 'accounts' ? 'bg-[#0b1f3a] text-white' : 'border'}`}>บัญชีบุคลากร</button>
      </div>
      <form onSubmit={event => { event.preventDefault(); setSearch(draft.trim()); setPage(1); }} className="flex flex-wrap gap-2">
        <input aria-label="ค้นหาผู้รับหรือหัวข้อ LINE" value={draft} onChange={event => setDraft(event.target.value)} placeholder="ชื่อครู / รหัสบุคลากร / หัวข้อแจ้งเตือน" className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm" />
        {view === 'jobs' && <select aria-label="สถานะการส่ง LINE" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} className="rounded-xl border px-3 py-2 text-sm"><option value="all">ทุกสถานะ</option><option value="failed">ส่งไม่สำเร็จ</option><option value="pending">รอส่ง / กำลังส่ง</option><option value="sent">LINE ตอบรับแล้ว</option><option value="cancelled">ยุติการส่ง</option></select>}
        <button type="submit" className="rounded-xl border px-4 py-2 text-sm">ค้นหา</button>
      </form>
    </div>
    {view === 'jobs' ? <>
      <div className="space-y-2">
        {report?.jobs.map(job => <article key={job.id} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
          <div className="flex flex-wrap justify-between gap-2"><strong className="text-sm">{job.userName} <span className="font-normal text-slate-500">({job.userId})</span></strong><span className={`rounded-lg px-2 py-1 text-xs font-bold ${colors[job.status]}`}>{labels[job.status]}</span></div>
          <p className="text-sm break-words">{job.title}</p>
          {job.subject && <p className="text-sm break-words text-slate-600">{job.subject}</p>}
          <p className="text-xs text-slate-500">{modules[job.module] ?? 'ระบบโรงเรียน'} · สร้าง {time(job.createdAt)} · ประมวลผล {job.attempts} ครั้ง</p>
          {job.acceptedAt && <p className="text-xs text-emerald-800">LINE ตอบรับ {time(job.acceptedAt)}</p>}
          {job.reason && job.status !== 'sent' && <p className="text-sm text-rose-800">{job.reason}</p>}
          {job.status === 'pending' && <p className="text-xs text-amber-900">ลองส่งครั้งถัดไป {time(job.nextAttemptAt)}</p>}
          {job.canRetry && <button type="button" disabled={!!retrying || !report.configured} onClick={() => void retry(job)} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{retrying === job.id ? 'กำลังนำเข้าคิว…' : 'ส่งซ้ำเฉพาะรายการนี้'}</button>}
        </article>)}
        {report && report.jobs.length === 0 && <p className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">ไม่มีรายการตามตัวกรอง · รายการก่อนเปิดระบบบันทึกผลจะยังไม่มีสถานะส่ง LINE</p>}
      </div>
      {report && <div className="flex items-center justify-between gap-2 text-sm"><span>{report.total} รายการ · หน้า {page}</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)} className="rounded-xl border bg-white px-3 py-2 disabled:opacity-40">ก่อนหน้า</button><button type="button" disabled={page * 20 >= report.total} onClick={() => setPage(value => value + 1)} className="rounded-xl border bg-white px-3 py-2 disabled:opacity-40">ถัดไป</button></div></div>}
    </> : <div className="space-y-2">
      {accounts.map(account => <article key={account.id} className="rounded-2xl border bg-white p-4 flex flex-wrap justify-between gap-3"><div><strong className="text-sm">{account.name} ({account.id})</strong><p className="text-xs text-slate-500">LINE ตอบรับล่าสุด {time(account.lastAcceptedAt)}</p></div><span className={`h-fit rounded-lg px-2 py-1 text-xs font-bold ${account.linked ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{account.linked ? 'ผูกบัญชีแล้ว' : 'ยังไม่ผูกบัญชี'}</span></article>)}
      {report && accounts.length === 0 && <p className="rounded-2xl border bg-white p-8 text-center text-sm">ไม่พบบุคลากรตามคำค้น</p>}
    </div>}
  </section>;
}
