import type { DocumentWorkflow, DocumentWorkflowTopic } from '../types';

export const documentTopics: Array<[DocumentWorkflowTopic, string]> = [
  ['lesson_plan_before', 'แผนการสอน (ก่อนบันทึกหลังแผน)'],
  ['lesson_plan', 'แผนการสอน (หลังบันทึกหลังแผน)'],
  ['learner_quality', 'รายงานพัฒนาคุณภาพผู้เรียน'],
  ['course_plan', 'โครงการสอน'],
  ['classroom_research', 'วิจัยในชั้นเรียน'],
  ['plc_setup', 'บันทึกจัดตั้งกลุ่ม PLC'],
  ['plc', 'รายงานกิจกรรมชุมนุมการเรียนรู้ทางวิชาชีพ PLC'],
  ['substitute_report', 'รายงานการจัดสอนแทน'],
  ['innovation_report', 'รายงานนวัตกรรม'], ['id_plan', 'ID PLAN'], ['sar', 'SAR รายบุคคล'], ['other', 'อื่น ๆ'],
];

export function canCorrectDocument(item: DocumentWorkflow, userId: string): boolean {
  return !item.deletedAt && item.createdBy === userId && !item.id.startsWith('EO-')
    && ['pending', 'in_review', 'rejected'].includes(item.status) && item.currentStep === 1 && item.signers.length > 0
    && item.signers.every(signer => ['pending', 'rejected'].includes(signer.status) && !signer.signedAt && !signer.signatureData && !signer.placements?.length);
}
