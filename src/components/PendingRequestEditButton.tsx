'use client';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { PendingRequestModule } from '../lib/api';
import { LeaveRequest, OfficialDutyRequest, RepairTicket, RoomBooking, SubstituteTeaching } from '../types';
import { getPipelineAssignee } from '../config/approvalWorkflow';
import { SignaturePadModal } from './SignaturePadModal';
import { SearchableTeacherSelect } from './SearchableTeacherSelect';

type EditableRequest = LeaveRequest | OfficialDutyRequest | RoomBooking | RepairTicket | SubstituteTeaching;
type Field = { key: string; label: string; type?: string; required?: boolean; options?: Array<[string,string]> };
const fields: Record<PendingRequestModule, Field[]> = {
  leave: [
    { key:'writtenAt',label:'เขียนที่' },{ key:'organization',label:'หน่วยงาน' },
    { key:'leaveType',label:'ประเภทการลา',required:true,options:[['personal','ลากิจส่วนตัว'],['sick','ลาป่วย'],['maternity','ลาคลอดบุตร'],['other','อื่น ๆ']] },
    { key:'otherLeaveDetails',label:'ระบุประเภทการลาอื่น ๆ' },{ key:'startDate',label:'วันเริ่มลา',type:'date',required:true },{ key:'endDate',label:'วันสิ้นสุดลา',type:'date',required:true },
    { key:'totalDays',label:'จำนวนวันลา',type:'number',required:true },{ key:'reason',label:'เหตุผลการลา',type:'textarea',required:true },{ key:'contactAddress',label:'ที่อยู่/สถานที่ที่สามารถติดต่อได้ระหว่างลา' },{ key:'contactPhone',label:'เบอร์โทรศัพท์ติดต่อ' },
  ],
  official_duty: [
    { key:'title',label:'เรื่อง',required:true },{ key:'location',label:'สถานที่',required:true },{ key:'organizer',label:'หน่วยงานผู้จัด' },{ key:'startDate',label:'วันเริ่มต้น',type:'date',required:true },{ key:'endDate',label:'วันสิ้นสุด',type:'date',required:true },
    { key:'participants',label:'ผู้ร่วมเดินทาง (หนึ่งคนต่อบรรทัด)',type:'list' },{ key:'vehicleType',label:'การเดินทาง',required:true,options:[['school_vehicle','รถโรงเรียน'],['personal_car','รถส่วนตัว'],['public_transport','ขนส่งสาธารณะ']] },
    { key:'supervisorName',label:'ผู้ควบคุมรถ' },{ key:'personalLicensePlate',label:'ทะเบียนรถส่วนตัว' },{ key:'budgetType',label:'แหล่งงบประมาณ',required:true,options:[['school_budget','งบประมาณโรงเรียน'],['organizer_budget','งบหน่วยงานผู้จัด'],['none','ไม่เบิกค่าใช้จ่าย']] },
    { key:'budgetAmount',label:'จำนวนเงินงบประมาณ',type:'number' },{ key:'budgetCustomText',label:'รายละเอียดแหล่งงบประมาณ' },
  ],
  room: [
    { key:'title',label:'กิจกรรม / เรื่อง',required:true },{ key:'attendeeCount',label:'จำนวนผู้เข้าร่วม',type:'number',required:true },{ key:'date',label:'วันที่ใช้ห้อง',type:'date',required:true },{ key:'startTime',label:'เวลาเริ่มต้น',type:'time',required:true },{ key:'endTime',label:'เวลาสิ้นสุด',type:'time',required:true },
    { key:'layoutStyle',label:'รูปแบบจัดห้อง',options:[['classroom','แบบห้องเรียน'],['theater','แบบโรงภาพยนตร์'],['u_shape','รูปตัวยู'],['boardroom','แบบห้องประชุม']] },{ key:'equipmentRequired',label:'อุปกรณ์ที่ต้องการ (หนึ่งรายการต่อบรรทัด)',type:'list' },{ key:'snackRequired',label:'ต้องการอาหารว่าง',type:'checkbox' },{ key:'snackDetails',label:'รายละเอียดอาหารว่าง',type:'textarea' },
  ],
  repair: [
    { key:'category',label:'ประเภทงานซ่อม',options:[['audio_visual','โสตทัศนูปกรณ์ / ไอที'],['computer_network','คอมพิวเตอร์ / เครือข่าย'],['building','อาคารสถานที่']] },{ key:'location',label:'ห้อง / สถานที่',required:true },{ key:'description',label:'อาการ / รายละเอียดที่ชำรุด',type:'textarea',required:true },
    { key:'urgency',label:'ความเร่งด่วน',options:[['low','ต่ำ'],['medium','ปานกลาง'],['high','สูง'],['critical','เร่งด่วนมาก']] },
  ],
  substitute: [
    { key:'date',label:'วันที่สอนแทน',type:'date',required:true },{ key:'period',label:'คาบเรียน (1–8)',type:'number',required:true },{ key:'time',label:'เวลาเรียน' },{ key:'gradeLevel',label:'ชั้น / ห้อง',required:true },{ key:'subjectCode',label:'รหัสวิชา',required:true },{ key:'subjectName',label:'ชื่อวิชา',required:true },{ key:'assignedWork',label:'งานที่มอบหมาย',type:'textarea' },{ key:'leaveReason',label:'เหตุผลที่ต้องจัดสอนแทน',type:'textarea' },
  ],
};
const names: Record<PendingRequestModule,string>={ leave:'ใบลา',official_duty:'คำขอไปราชการ',room:'คำขอใช้อาคารสถานที่',repair:'รายการแจ้งซ่อม',substitute:'รายการสอนแทน' };
export function PendingRequestEditButton({ module, item }: { module: PendingRequestModule; item: EditableRequest }) {
  const { currentUser, users, rooms, vehicles, pipelinesConfig, editPendingRequest, addToast } = useApp();
  const [open,setOpen]=useState(false);
  const [draft,setDraft]=useState<Record<string,unknown>>({});
  const [busy,setBusy]=useState(false);
  const [signatureOpen,setSignatureOpen]=useState(false);
  const [editingVersion,setEditingVersion]=useState(1);
  const retry=useRef({ hash:'',id:'' });
  const owner='userId' in item ? item.userId : item.createdBy ?? getPipelineAssignee(pipelinesConfig,'pipe-substitute',1,'MMV90');
  if(owner!==currentUser.id || item.canEditRequest!==true)return null;
  const change=(key:string,value:unknown)=>setDraft(previous=>({...previous,[key]:value}));
  const begin=()=>{setDraft({...item} as unknown as Record<string,unknown>);setEditingVersion(item.requestVersion??1);retry.current={hash:'',id:''};setOpen(true);};
  const attachments=Array.isArray(draft.attachments) ? draft.attachments as Array<{type:string;name:string;dataUrl:string}> : [];
  const addFile=async(event:React.ChangeEvent<HTMLInputElement>,photo=false)=>{
    const files=Array.from(event.target.files??[]);event.target.value='';
    try {
      const added=await Promise.all(files.map(file=>new Promise<{type:string;name:string;dataUrl:string}>((resolve,reject)=>{
        if(file.size>10*1024*1024||!(file.type==='application/pdf'||['image/png','image/jpeg','image/webp'].includes(file.type))||(photo&&!file.type.startsWith('image/'))){reject(new Error('เลือก PDF หรือรูปภาพ ขนาดไม่เกิน 10 MB ต่อไฟล์'));return;}
        const reader=new FileReader();reader.onerror=()=>reject(new Error('อ่านไฟล์ไม่สำเร็จ'));reader.onload=()=>resolve({type:'attachment',name:file.name,dataUrl:String(reader.result)});reader.readAsDataURL(file);
      })));
      if(photo)change('photoUrl',added[0]?.dataUrl??'');else change('attachments',[...attachments,...added]);
    }catch(error){addToast(error instanceof Error?error.message:'แนบไฟล์ไม่สำเร็จ','error');}
  };
  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();if(busy)return;
    const data={...draft};if(module==='repair')data.title=String(data.description??'').trim().slice(0,255);
    const hash=JSON.stringify(data);if(retry.current.hash!==hash)retry.current={hash,id:crypto.randomUUID()};
    setBusy(true);
    try {if(await editPendingRequest(module,item.id,editingVersion,data,retry.current.id))setOpen(false);}finally{setBusy(false);}
  };
  return <>
    <button type="button" onClick={begin} className="inline-flex rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50">แก้ไขข้อมูล</button>
    {open&&createPortal(<div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-3" role="dialog" aria-modal="true" aria-label={`แก้ไข${names[module]}`}>
      <form onSubmit={event=>void submit(event)} className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-5 space-y-4 text-sm">
        <div className="flex justify-between items-start gap-3"><div><h2 className="text-lg font-bold">แก้ไข{names[module]}</h2><p className="text-xs text-slate-500">{item.id} · ฉบับข้อมูล {editingVersion}</p></div><button type="button" disabled={busy} onClick={()=>setOpen(false)} aria-label="ปิดหน้าต่างแก้ไข" className="rounded-lg border px-3 py-1">×</button></div>
        <p className="rounded-xl bg-blue-50 p-3 text-blue-900">แก้ไขได้ก่อนผู้รับผิดชอบเริ่มดำเนินการ เก็บเลขรายการและวันส่งเดิม พร้อมแจ้งผู้รับผิดชอบให้ตรวจข้อมูลล่าสุด</p>
        <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2 disabled:opacity-60">
          {(module==='room'||module==='official_duty'&&draft.vehicleType==='school_vehicle')&&<label className="font-semibold">{module==='room'?'ห้อง / อาคาร':'รถโรงเรียน'}<select required value={String(draft[module==='room'?'roomId':'vehicleId']??'')} onChange={event=>change(module==='room'?'roomId':'vehicleId',event.target.value)} className="mt-1 w-full rounded-xl border p-2"><option value="">เลือก</option>{module==='room'?rooms.map(room=><option key={room.id} value={room.id}>{room.name}</option>):vehicles.map(vehicle=><option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>)}</select></label>}
          {module==='substitute'&&(['originalTeacherId','substituteTeacherId'] as const).map(key=><div key={key}><label className="font-semibold">{key==='originalTeacherId'?'ครูประจำวิชา':'ครูสอนแทน'}</label><SearchableTeacherSelect users={users} value={String(draft[key]??'')} onChange={value=>change(key,value)} /></div>)}
          {fields[module].map(field=><label key={field.key} className={`font-semibold ${['textarea','list'].includes(field.type??'')?'sm:col-span-2':''}`}>{field.label}
            {field.options?<select required={field.required} value={String(draft[field.key]??'')} onChange={event=>change(field.key,event.target.value)} className="mt-1 w-full rounded-xl border p-2">{field.options.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
              :field.type==='checkbox'?<input type="checkbox" checked={!!draft[field.key]} onChange={event=>change(field.key,event.target.checked)} className="ml-2"/>
              :field.type==='textarea'||field.type==='list'?<textarea rows={3} required={field.required} value={field.type==='list'?(Array.isArray(draft[field.key])?(draft[field.key] as string[]).join('\n'):''):String(draft[field.key]??'')} onChange={event=>change(field.key,field.type==='list'?event.target.value.split('\n'):event.target.value)} className="mt-1 w-full rounded-xl border p-2 font-normal"/>
              :<input required={field.required} type={field.type??'text'} min={field.type==='number'?field.key==='budgetAmount'?0:1:undefined} value={String(draft[field.key]??'')} onChange={event=>change(field.key,field.type==='number'?Number(event.target.value):event.target.value)} className="mt-1 w-full rounded-xl border p-2 font-normal"/>}
          </label>)}
        </fieldset>
        {(module==='leave'||module==='official_duty')&&<div className="rounded-xl border p-3 space-y-2"><p className="font-semibold">ลายมือชื่อผู้ยื่นและเอกสารแนบ</p><button type="button" disabled={busy} onClick={()=>setSignatureOpen(true)} className="rounded-lg border px-3 py-2">เลือก / เปลี่ยนลายเซ็น</button><p className="text-xs text-slate-500">{draft.signatureUrl?'มีลายเซ็นผู้ยื่นแล้ว':'ยังไม่มีลายเซ็นผู้ยื่น'}</p><label className="block">เพิ่มเอกสารแนบ<input type="file" multiple accept="application/pdf,image/png,image/jpeg,image/webp" disabled={busy} onChange={event=>void addFile(event)} className="mt-1 block w-full"/></label>{attachments.map((attachment,index)=><div key={index} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-2"><span className="break-all">{attachment.name}</span><button type="button" disabled={busy} onClick={()=>change('attachments',attachments.filter((_,i)=>i!==index))} className="shrink-0 text-rose-700">นำออก</button></div>)}</div>}
        {module==='repair'&&<label className="block font-semibold">รูปภาพประกอบ (ไม่เลือกไฟล์ใหม่จะเก็บรูปเดิม)<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={event=>void addFile(event,true)} className="mt-1 block w-full"/>{!!draft.photoUrl&&<button type="button" disabled={busy} onClick={()=>change('photoUrl','')} className="mt-2 text-rose-700">นำรูปประกอบออก</button>}</label>}
        <div className="flex justify-end gap-2 border-t pt-3"><button type="button" disabled={busy} onClick={()=>setOpen(false)} className="rounded-xl border px-4 py-2">ยกเลิก</button><button disabled={busy} className="rounded-xl bg-blue-700 px-4 py-2 font-bold text-white disabled:opacity-50">{busy?'กำลังบันทึก…':'บันทึกการแก้ไขและแจ้งผู้รับผิดชอบ'}</button></div>
      </form>
      <SignaturePadModal isOpen={signatureOpen} onClose={()=>setSignatureOpen(false)} onSave={value=>{change('signatureUrl',value);setSignatureOpen(false);}} initialSignature={String(draft.signatureUrl??'')} title="ลายมือชื่อผู้ยื่น"/>
    </div>,document.body)}
  </>;
}
