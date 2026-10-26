'use client';
import React,{useEffect,useState} from 'react';
import {useApp} from '../context/AppContext';
import {eofficeSignatureApi} from '../lib/api';

export function EofficeSignatureSettings({onBack}:{onBack:()=>void}){
 const {currentUser}=useApp();
 const [position,setPosition]=useState(currentUser.position),[school,setSchool]=useState('โรงเรียนมกุฎเมืองราชวิทยาลัย');
 const [signature,setSignature]=useState(''),[saved,setSaved]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>{let cancelled=false;void eofficeSignatureApi.get().then(profile=>{if(!cancelled&&profile){setPosition(profile.position);setSchool(profile.school);setSignature(profile.signatureData);setSaved(profile.signatureData);}}).catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:'โหลดข้อมูลไม่สำเร็จ');}).finally(()=>{if(!cancelled)setLoading(false);});return()=>{cancelled=true;};},[]);
 const upload=async(file:File)=>{
  setError('');setMessage('');if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024){setError('รองรับ PNG, JPG, WebP ขนาดไม่เกิน 10 MB');return;}
  setBusy(true);const url=URL.createObjectURL(file);
  try{const image=new Image();await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('อ่านรูปไม่สำเร็จ'));image.src=url;});
   const canvas=document.createElement('canvas');canvas.width=600;canvas.height=200;const ctx=canvas.getContext('2d');if(!ctx||!image.naturalWidth||!image.naturalHeight)throw new Error('เตรียมรูปไม่สำเร็จ');
   const scale=Math.min(600/image.naturalWidth,200/image.naturalHeight);const w=image.naturalWidth*scale,h=image.naturalHeight*scale;ctx.drawImage(image,(600-w)/2,(200-h)/2,w,h);
   const data=canvas.toDataURL('image/png');if(data.length>200000)throw new Error('กรุณาครอบภาพให้เหลือเฉพาะลายเซ็นแล้วเลือกใหม่');setSignature(data);
  }catch(e){setError(e instanceof Error?e.message:'อัปโหลดไม่สำเร็จ');}finally{URL.revokeObjectURL(url);setBusy(false);}
 };
 const field='mt-1 w-full rounded-xl border bg-slate-50 px-3 py-2';
 return <div className="rounded-3xl border bg-white p-6 space-y-5"><div className="flex justify-between gap-3"><h1 className="text-xl font-bold">ข้อมูลลายเซ็นของฉัน</h1><button onClick={onBack} className="rounded-xl border px-3 py-2">กลับทะเบียนรับ</button></div><p className="text-sm text-slate-500">{currentUser.name} · ลายเซ็นส่วนตัวนี้ใช้ร่วมกับ e-Office การลา ขออนุญาตไปราชการ และเอกสารลงนาม โดยต้องเลือกใช้และยืนยันแต่ละครั้ง</p>
 {error&&<p role="alert" className="text-rose-700">{error}</p>}{message&&<p role="status" className="text-emerald-700">{message}</p>}
 {loading?<p>กำลังโหลด...</p>:<form className="max-w-2xl space-y-4" onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setError('');setMessage('');try{await eofficeSignatureApi.save({position,school,signatureData:signature});setSaved(signature);setMessage('บันทึกลายเซ็นและข้อมูลเรียบร้อยแล้ว');}catch(err){setError(err instanceof Error?err.message:'บันทึกไม่สำเร็จ');}finally{setBusy(false);}}}>
  <label className="block text-sm font-semibold">อัปโหลดลายเซ็น<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} className={field} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void upload(file);}}/><small className="text-slate-500">เลือกภาพที่ครอบเฉพาะลายเซ็น PNG, JPG หรือ WebP ไม่เกิน 10 MB</small></label>
  <label className="block text-sm font-semibold">ตำแหน่ง<input required maxLength={255} value={position} onChange={e=>setPosition(e.target.value)} className={field}/></label>
  <label className="block text-sm font-semibold">โรงเรียน<input required maxLength={255} value={school} onChange={e=>setSchool(e.target.value)} className={field}/></label>
  {signature&&<div><p className="text-sm font-semibold">{signature===saved?'ลายเซ็นปัจจุบัน':'ตัวอย่างลายเซ็นใหม่ (ยังไม่บันทึก)'}</p><img src={signature} alt="ตัวอย่างลายเซ็นของฉัน" className="mt-2 w-full max-w-md rounded-xl border bg-white"/></div>}
  <button disabled={busy||!signature} className="rounded-xl bg-blue-700 px-5 py-2 font-bold text-white disabled:opacity-40">{busy?'กำลังบันทึก...':'บันทึกข้อมูลลายเซ็น'}</button>
 </form>}</div>;
}
