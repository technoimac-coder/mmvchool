import { useEffect, useRef, useState, type FormEvent } from 'react';
import { leavesApi, type SickLeaveNotice } from '../../lib/api';
import type { LeaveRequest, User } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface Props {
  isSecretary: boolean;
  currentUserId: string;
  users: User[];
  leaveRequests: LeaveRequest[];
  onWriteLeave: (date: string) => void;
}

export function SickLeaveNoticeQueue({ isSecretary, currentUserId, users, leaveRequests, onWriteLeave }: Props) {
  const { t } = useLanguage();
  const pendingLabel = (count: number) => t(`รอยื่นใบลา ${count} วัน`, `${count} ${count === 1 ? 'day' : 'days'} awaiting a leave request`);
  const [notices, setNotices] = useState<SickLeaveNotice[]>([]);
  const [userId, setUserId] = useState('');
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let active = true;
    leavesApi.listSickNotices().then(items => {
      if (active) {
        setNotices(items);
        setError('');
      }
    }).catch((failure: unknown) => {
      if (active) setError(failure instanceof Error ? failure.message : 'โหลดรายการรับแจ้งลาป่วยไม่สำเร็จ');
    });
    return () => { active = false; };
  }, [currentUserId, isSecretary, leaveRequests, revision]);

  async function record(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const start = String(data.get('startDate') || '');
    const end = String(data.get('endDate') || start);
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      await leavesApi.recordSickNotice(userId, start, end);
      form.reset();
      setRevision(value => value + 1);
      setSaved(true);
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'บันทึกรับแจ้งลาป่วยไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  const visible = notices.filter(item => isSecretary || item.userId === currentUserId);
  const pending = visible.filter(item => !item.leaveId);
  const history = visible.filter(item => item.leaveId);
  const label = 'block text-sm font-medium';
  const field = 'mt-1 block min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2';

  return (
    <>
      <button type="button" aria-haspopup="dialog" onClick={() => { dialogRef.current?.showModal(); setRevision(value => value + 1); }} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-900">
        {isSecretary ? 'รับแจ้งลาป่วย' : 'แจ้งลาป่วยของฉัน'}
        {pending.length > 0 && <span className="rounded bg-emerald-100 px-1.5" aria-label={pendingLabel(pending.length)}>{pending.length}</span>}
      </button>
      <dialog ref={dialogRef} aria-label="รายการรับแจ้งลาป่วย" className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto rounded-2xl border border-emerald-200 bg-white p-4 text-slate-800 shadow-xl backdrop:bg-slate-900/50">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-emerald-900">{pendingLabel(pending.length)}</h3>
          <button type="button" className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => dialogRef.current?.close()}>ปิด</button>
        </div>
      <button type="button" onClick={() => setRevision(value => value + 1)} className="mt-3 rounded-lg border px-3 py-1.5 text-sm">
        รีเฟรชรายการ
      </button>
      {isSecretary && (
        <form onSubmit={record} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <label className={label}>บุคลากร
            <select required value={userId} onChange={event => setUserId(event.target.value)} className={field}>
              <option value="">เลือกบุคลากร</option>
              {users.filter(user => user.status !== 'inactive').map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
          </label>
          <label className={label}>วันที่เริ่มลา<input required name="startDate" type="date" className={field} /></label>
          <label className={label}>ถึงวันที่ (เว้นว่างถ้าลาวันเดียว)<input name="endDate" type="date" className={field} /></label>
          <button disabled={saving} type="submit" className="min-h-10 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? 'กำลังบันทึก…' : 'บันทึก / เพิ่มวันลา'}
          </button>
        </form>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
      {saved && <p role="status" className="mt-3 text-sm text-emerald-700">บันทึกรับแจ้งแล้ว</p>}
      {pending.length === 0 && <p className="mt-3 text-sm text-slate-500">ไม่มีวันที่รอยื่นใบลา</p>}
      <ul className="mt-2 divide-y divide-slate-100">
        {pending.map(item => (
          <li key={item.userId + ':' + item.date} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
            <span>{item.userName} · {item.date}</span>
            <div className="flex gap-2">
              {isSecretary && <button type="button" className="rounded-lg border px-3 py-1.5" onClick={() => setUserId(item.userId)}>เลือกเพื่อเพิ่มวัน</button>}
              {item.userId === currentUserId && <button type="button" className="rounded-lg bg-emerald-700 px-3 py-1.5 text-white" onClick={() => { dialogRef.current?.close(); onWriteLeave(item.date); }}>เขียนใบลา</button>}
            </div>
          </li>
        ))}
      </ul>
      {history.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-medium">{t(`ประวัติที่ยื่นใบลาแล้ว (${history.length} วัน)`, `Submitted leave history (${history.length} ${history.length === 1 ? 'day' : 'days'})`)}</summary>
          <ul className="mt-2 space-y-1">{history.map(item => (
            <li key={item.userId + ':' + item.date}>{item.userName} · {item.date} · {item.leaveId}</li>
          ))}</ul>
        </details>
      )}
      </dialog>
    </>
  );
}
