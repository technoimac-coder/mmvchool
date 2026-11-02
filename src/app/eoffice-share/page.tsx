'use client';
import { useEffect, useState } from 'react';
import { DocumentSigningViewer } from '../../components/DocumentSigningViewer';
import type { DocumentWorkflow } from '../../types';

export default function EofficeSharePage() {
  const [item,setItem]=useState<DocumentWorkflow|null>(null);
  const [originalUrl,setOriginalUrl]=useState('');
  const [error,setError]=useState('');
  useEffect(()=>{
    const token=new URLSearchParams(window.location.search).get('token')||'';
    if (!/^[a-f0-9]{64}$/.test(token)) {setError('ลิงก์เอกสารไม่ถูกต้อง');return;}
    const endpoint='/api/eoffice-share.php?token='+encodeURIComponent(token);
    setOriginalUrl(endpoint+'&format=original');
    const controller=new AbortController();
    const refresh=()=>fetch(endpoint+'&format=metadata',{cache:'no-store',signal:controller.signal}).then(async response=>{
      const data=await response.json(); if(!response.ok)throw new Error(data.message||'ไม่สามารถเปิดเอกสารได้');
      setItem(data.data as DocumentWorkflow); setError('');
    }).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'เปิดเอกสารไม่สำเร็จ');});
    void refresh();
    const timer=window.setInterval(()=>void refresh(),15000);
    return()=>{window.clearInterval(timer);controller.abort();};
  },[]);
  if (error) return <main className="mx-auto max-w-xl p-8 text-red-700"><h1 className="text-xl font-bold">เปิดเอกสารไม่ได้</h1><p className="mt-2">{error}</p></main>;
  if (!item) return <main className="p-8 text-center">กำลังเปิดเอกสารล่าสุด…</main>;
  return <DocumentSigningViewer item={item} userId="" readOnlyUrl={originalUrl} publicShare onClose={()=>window.location.assign('/')} onSaved={()=>{}} />;
}
