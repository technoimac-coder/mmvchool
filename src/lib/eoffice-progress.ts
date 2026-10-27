import type { IncomingBook } from './api';
import type { DocumentWorkflow } from '../types';

export function eofficeProgress(book: IncomingBook, doc?: DocumentWorkflow) {
  const stage = book.stage || 'registered';
  const status = doc?.status || book.signing_status;
  const recipients = book.tasks || [];
  const acknowledged = recipients.filter(task => task.status === 'acknowledged' || task.status === 'completed').length;
  const pendingNames = recipients.filter(task => task.status === 'pending').map(task => task.user_name);
  if (stage === 'archived') return { step: 4, label: 'จัดเก็บแล้ว', detail: 'ค้นดูเอกสารและประวัติย้อนหลังได้', tone: 'slate' as const };
  if (stage === 'distributed') return {
    step: 3,
    label: recipients.length > 0 && acknowledged === recipients.length ? 'รับทราบครบแล้ว' : 'รอผู้ปฏิบัติรับทราบ',
    detail: recipients.length ? `รับทราบ ${acknowledged}/${recipients.length} คน` : 'ยังไม่มีรายชื่อผู้รับ',
    pendingNames,
    tone: acknowledged === recipients.length && recipients.length > 0 ? 'emerald' as const : 'amber' as const,
  };
  if (stage === 'routing' || book.workflow_id) {
    if (status === 'rejected') return { step: 2, label: 'ส่งกลับแก้ไข', detail: 'เจ้าหน้าที่ตรวจสอบและเสนอใหม่', tone: 'rose' as const };
    if (status === 'completed') return { step: 2, label: 'ลงนามครบ · รอส่งต่อ', detail: 'เลือกผู้เกษียนถัดไปหรือส่งถึงผู้ปฏิบัติ', tone: 'emerald' as const };
    const signer = doc?.signers.find(person => person.step === doc.currentStep && person.status === 'pending');
    return { step: 2, label: 'รอเกษียน / ลงนาม', detail: signer ? `รอ: ${signer.userName}` : !doc && book.responsible_name ? `ผู้รับ: ${book.responsible_name}` : 'ตรวจสอบลำดับผู้ลงนามในรายละเอียด', tone: 'violet' as const };
  }
  return { step: 1, label: 'ลงทะเบียนแล้ว', detail: 'รอเสนอเกษียนหรือส่งถึงผู้ปฏิบัติ', tone: 'blue' as const };
}

export function eofficeDate(value?: string) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${Number(match[3])}/${Number(match[2])}/${Number(match[1]) + 543}` : value || '—';
}
