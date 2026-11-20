'use client';

import React, { useEffect, useState } from 'react';
import { ExternalLink, Link2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ApiError, isAdminRole, quickLinksApi, type DashboardQuickLink } from '../lib/api';

export const DashboardQuickLinks: React.FC = () => {
  const { currentUser, addToast } = useApp();
  const canManage = isAdminRole(currentUser.role);
  const [links, setLinks] = useState<DashboardQuickLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState<DashboardQuickLink | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { let live = true; quickLinksApi.list().then(rows => { if (live) setLinks(rows); }).catch(() => { if (live) setLoadError(true); }).finally(() => { if (live) setLoading(false); }); return () => { live = false; }; }, []);
  const begin = (link: DashboardQuickLink | null) => { setEditing(link); setTitle(link?.title || ''); setUrl(link?.url || ''); setError(''); setOpen(true); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const saved = await quickLinksApi.save(editing ? 'update' : 'create', title.trim(), url.trim(), editing?.id);
      setLinks(previous => editing ? previous.map(item => item.id === saved.id ? saved : item) : [...previous, saved]); setLoadError(false); setOpen(false); addToast('บันทึกลิงก์เรียบร้อยแล้ว', 'success');
    } catch (err) { setError(err instanceof ApiError ? err.message : 'ไม่สามารถบันทึกลิงก์ได้ กรุณาลองใหม่'); }
    finally { setBusy(false); }
  };
  const remove = async (link: DashboardQuickLink) => {
    if (busy || !window.confirm(`ลบลิงก์ “${link.title}” ใช่ไหม?`)) return;
    setBusy(true);
    try { await quickLinksApi.remove(link.id); setLinks(previous => previous.filter(item => item.id !== link.id)); addToast('ลบลิงก์เรียบร้อยแล้ว', 'success'); }
    catch (err) { addToast(err instanceof ApiError ? err.message : 'ไม่สามารถลบลิงก์ได้', 'error'); }
    finally { setBusy(false); }
  };

  return <section className="bg-white rounded-3xl p-5 border border-[#e6ebf2] shadow-xs space-y-4">
    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center"><Link2 className="w-4 h-4" /></div><h3 className="font-bold text-slate-800 text-sm">ลิงก์งานและเอกสาร</h3></div>{canManage && <button type="button" onClick={() => begin(null)} className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"><Plus className="h-3.5 w-3.5" /> เพิ่มลิงก์</button>}</div>
    {loading ? <p className="text-xs text-slate-500">กำลังโหลดลิงก์…</p> : loadError ? <p className="text-xs text-rose-700">ไม่สามารถโหลดลิงก์ได้ กรุณาลองเปิดหน้าใหม่</p> : links.length === 0 ? <p className="text-xs text-slate-500">ยังไม่มีลิงก์{canManage ? ' กดเพิ่มลิงก์เพื่อเริ่มใช้งาน' : ''}</p> : <ul className="space-y-2">{links.map(link => <li key={link.id} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5"><a href={link.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex flex-1 items-center gap-2 font-semibold text-xs text-indigo-700 hover:underline"><ExternalLink className="h-4 w-4 shrink-0" /><span className="break-words">{link.title}</span></a>{canManage && <><button type="button" disabled={busy} onClick={() => begin(link)} aria-label={`แก้ไข ${link.title}`} className="rounded-lg p-1.5 text-slate-600 hover:bg-white"><Pencil className="h-4 w-4" /></button><button type="button" disabled={busy} onClick={() => void remove(link)} aria-label={`ลบ ${link.title}`} className="rounded-lg p-1.5 text-rose-700 hover:bg-white"><Trash2 className="h-4 w-4" /></button></>}</li>)}</ul>}
    {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"><form onSubmit={save} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-xl"><div className="flex items-center justify-between"><h3 className="font-bold text-slate-900">{editing ? 'แก้ไขลิงก์' : 'เพิ่มลิงก์'}</h3><button type="button" disabled={busy} onClick={() => setOpen(false)} aria-label="ปิด"><X className="h-5 w-5" /></button></div><label className="block text-sm font-semibold">ชื่อลิงก์<input required maxLength={160} value={title} onChange={event => setTitle(event.target.value)} placeholder="เช่น ทะเบียนคุมเกียรติบัตร" className="mt-1 block w-full rounded-lg border border-slate-300 p-2 font-normal" /></label><label className="block text-sm font-semibold">ที่อยู่เว็บไซต์<input required type="url" maxLength={2048} value={url} onChange={event => setUrl(event.target.value)} placeholder="https://..." className="mt-1 block w-full rounded-lg border border-slate-300 p-2 font-normal" /></label>{error && <p className="text-sm text-rose-700">{error}</p>}<div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2 text-sm">ยกเลิก</button><button type="submit" disabled={busy} className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? 'กำลังบันทึก…' : 'บันทึก'}</button></div></form></div>}
  </section>;
};
