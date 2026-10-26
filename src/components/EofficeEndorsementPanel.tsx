'use client';
import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { EofficeForward, EofficeSignatureProfile } from '../lib/api';

export function EofficeEndorsementPanel({value,onChange,onPlace,hasSignature,disabled,initialEndorsement=false,initialText,savedProfile}:{
 value:EofficeForward;onChange:(value:EofficeForward)=>void;
 onPlace:(text:string,identity:string)=>void;hasSignature:boolean;disabled:boolean;initialEndorsement?:boolean;initialText?:string;savedProfile?:EofficeSignatureProfile|null;
}){
 const {users,currentUser}=useApp();
 const [lines,setLines]=useState(()=>initialEndorsement?[...(initialText??'- เห็นสมควรเสนอกลุ่มบริหารวิชาการ').split(/\r\n|\r|\n/),...['','','','']].slice(0,4):['- ทราบ','- แจ้งกลุ่มบริหารวิชาการ','','']);
 const [name,setName]=useState(currentUser.name);
 const [position,setPosition]=useState(currentUser.position);
 const [school,setSchool]=useState(currentUser.organization?.includes('โรงเรียน')?currentUser.organization:'โรงเรียนมกุฎเมืองราชวิทยาลัย');
 useEffect(()=>{if(savedProfile){setPosition(savedProfile.position);setSchool(savedProfile.school);}},[savedProfile]);
 const [search,setSearch]=useState('');
 const field='mt-1 w-full rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-sm';
 const groups=[...new Set(users.map(user=>user.department||'บุคลากร'))];
 const date=new Date(`${value.endorsementDate}T00:00:00`);
 const dateText=Number.isNaN(date.getTime())?'':date.toLocaleDateString('th-TH-u-nu-thai',{day:'numeric',month:'long',year:'numeric'});
 return <fieldset disabled={disabled} className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
  <legend className="px-1 font-bold text-blue-800">เกษียนหนังสือและส่งต่อ</legend>
  <p className="text-xs text-slate-600">อัปโหลดหรือวาดลายเซ็น แล้วกดลงนามเอกสาร ระบบจะจัดข้อความ ลายเซ็น ชื่อ ตำแหน่ง และวันที่ตามแบบให้อัตโนมัติ ตรวจข้อความและปรับชื่อกลุ่มงานก่อนบันทึกได้</p>
  {lines.map((line,index)=><label key={index} className="block text-xs">บรรทัดที่ {index+1}<input maxLength={120} value={line} onChange={event=>setLines(previous=>previous.map((text,i)=>i===index?event.target.value:text))} className={field}/></label>)}
  <label className="block text-xs">ชื่อผู้ลงนาม<input value={name} maxLength={150} onChange={event=>setName(event.target.value)} className={field}/></label>
  {!initialEndorsement&&<label className="block text-xs">ตำแหน่ง<input value={position} maxLength={150} onChange={event=>setPosition(event.target.value)} className={field}/></label>}
  {!initialEndorsement&&<label className="block text-xs">โรงเรียน<input value={school} maxLength={100} onChange={event=>setSchool(event.target.value)} className={field}/></label>}
  <label className="block text-xs">วันที่เกษียน<input type="date" value={value.endorsementDate} onChange={event=>onChange({...value,endorsementDate:event.target.value})} className={field}/></label>
  <button type="button" disabled={!hasSignature||!dateText} onClick={()=>{const text=lines.map(line=>line.trim()).filter(Boolean).join('\n');const displayName=name.trim()?`(${name.trim().replace(/^\(|\)$/g,'')})`:'';const displayPosition=position.includes(school)?position:[position,school].filter(Boolean).join(' ');onPlace(text,(initialEndorsement?[name.trim(),dateText]:[displayName,displayPosition,dateText]).filter(Boolean).join('\n'));if(!value.instruction)onChange({...value,instruction:text});}} className="w-full rounded-lg bg-blue-700 p-2 text-sm font-bold text-white disabled:opacity-40">ลงนามเอกสาร</button>
  <p className="text-xs text-slate-500">เมื่อแก้ข้อความหรือวันที่ กดวางอีกครั้งเพื่อแทนที่ข้อความชุดเดิม</p>
  <label className="block text-xs">ดำเนินการหลังลงนาม<select value={value.mode} onChange={event=>onChange({...value,mode:event.target.value as EofficeForward['mode'],recipientIds:[]})} className={field}><option value="none">บันทึกเกษียนก่อน ยังไม่ส่งต่อ</option><option value="route">ส่งให้ผู้รับเกษียนลำดับถัดไป (1 คน)</option><option value="distribute">ส่งถึงครู / ผู้ปฏิบัติ (หลายคน)</option></select></label>
  {value.mode!=='none'&&<><input aria-label="ค้นหาผู้รับหนังสือ" placeholder="ค้นหาชื่อ / กลุ่มงาน" value={search} onChange={event=>setSearch(event.target.value)} className={field}/><p className="text-xs font-bold">เลือกแล้ว {value.recipientIds.length} คน</p><div className="max-h-60 overflow-auto rounded-lg border bg-white p-2">{groups.map(group=>{const people=users.filter(user=>(user.department||'บุคลากร')===group&&`${user.name} ${group}`.includes(search));return people.length>0&&<div className="mb-3" key={group}><p className="text-xs font-bold text-blue-800">{group}</p>{people.map(user=><label key={user.id} className="mt-1 flex gap-2 text-xs"><input type={value.mode==='route'?'radio':'checkbox'} name="eoffice-next-recipient" checked={value.recipientIds.includes(user.id)} onChange={()=>onChange({...value,recipientIds:value.mode==='route'?[user.id]:value.recipientIds.includes(user.id)?value.recipientIds.filter(id=>id!==user.id):[...value.recipientIds,user.id]})}/>{user.name}</label>)}</div>;})}</div><label className="block text-xs">ข้อความแจ้งผู้รับ<textarea maxLength={4000} value={value.instruction} onChange={event=>onChange({...value,instruction:event.target.value})} className={field}/></label></>}
 </fieldset>;
}
