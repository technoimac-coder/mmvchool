import { ApprovalStage } from '../types';

export const LEAVE_APPROVER_BY_STAGE: Partial<Record<ApprovalStage, string>> = {
  admin_review: 'MMV14',
  deputy_approval: 'MMV04',
  director_approval: 'MMV01',
};

export const OFFICIAL_DUTY_APPROVER_BY_STAGE: Partial<Record<ApprovalStage, string>> = {
  deputy_approval: 'MMV04',
  director_approval: 'MMV01',
};

export const LEAVE_APPROVAL_STAGE_DETAILS = {
  admin_review: {
    rejectionStage: 'admin' as const,
    title: 'ตรวจสอบสถิติวันลาและข้อมูลคำขอ',
    commentLabel: 'ผลการตรวจสอบ',
    placeholder: 'เช่น ตรวจสอบสถิติวันลาและข้อมูลถูกต้อง',
    approveLabel: 'ลงนามตรวจสอบและส่งต่อ',
  },
  deputy_approval: {
    rejectionStage: 'deputy' as const,
    title: 'พิจารณาและให้ความเห็น',
    commentLabel: 'ความเห็นประกอบการพิจารณา',
    placeholder: 'เช่น เห็นควรอนุมัติ',
    approveLabel: 'ลงนามเห็นชอบและส่งต่อ',
  },
  director_approval: {
    rejectionStage: 'director' as const,
    title: 'พิจารณาอนุมัติขั้นสุดท้าย',
    commentLabel: 'คำสั่งการ',
    placeholder: 'เช่น อนุมัติตามเสนอ',
    approveLabel: 'ลงนามและอนุมัติ',
  },
};

export type LeaveApprovalActionStage = keyof typeof LEAVE_APPROVAL_STAGE_DETAILS;
