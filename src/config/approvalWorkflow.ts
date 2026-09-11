import { ApprovalStage } from '../types';

export interface ApprovalPipelineConfig {
  id: string;
  steps: Array<{
    stepNumber: number;
    assignedUserId: string;
  }>;
}

export const LEAVE_APPROVER_BY_STAGE: Partial<Record<ApprovalStage, string>> = {
  admin_review: 'MMV14',
  deputy_approval: 'MMV04',
  director_approval: 'MMV01',
};

export const FOREIGN_LEAVE_REVIEWER_ID = 'MMV11';

export const isForeignLeaveRequester = (request?: { userName?: string; userId?: string }): boolean => {
  if (!request) return false;
  return /^(mr|mrs|ms|miss)\.?\s*/i.test((request.userName || '').trim());
};

export const OFFICIAL_DUTY_APPROVER_BY_STAGE: Partial<Record<ApprovalStage, string>> = {
  deputy_approval: 'MMV04',
  director_approval: 'MMV01',
};

export const SUBSTITUTE_MANAGER_IDS = ['MMV02', 'MMV90'] as const;

export const LEAVE_PIPELINE_STEP_BY_STAGE: Partial<Record<ApprovalStage, number>> = {
  admin_review: 2,
  deputy_approval: 3,
  director_approval: 4,
};

export const OFFICIAL_DUTY_PIPELINE_STEP_BY_STAGE: Partial<Record<ApprovalStage, number>> = {
  admin_review: 2,
  deputy_approval: 2,
  director_approval: 3,
};

export const getPipelineAssignee = (
  pipelines: ApprovalPipelineConfig[],
  pipelineId: string,
  stepNumber: number,
  fallback = '',
): string => {
  const assignedUserId = pipelines
    .find(pipeline => pipeline.id === pipelineId)
    ?.steps.find(step => step.stepNumber === stepNumber)
    ?.assignedUserId.trim();

  return assignedUserId || fallback;
};

export const getLeaveApprover = (
  pipelines: ApprovalPipelineConfig[],
  stage: ApprovalStage,
): string => {
  const stepNumber = LEAVE_PIPELINE_STEP_BY_STAGE[stage];
  if (!stepNumber) return '';
  return getPipelineAssignee(pipelines, 'pipe-leave', stepNumber, LEAVE_APPROVER_BY_STAGE[stage]);
};

export const getLeaveApproverForRequest = (
  pipelines: ApprovalPipelineConfig[],
  stage: ApprovalStage,
  request?: { userName?: string; userId?: string },
): string => {
  if (stage === 'admin_review' && isForeignLeaveRequester(request)) return FOREIGN_LEAVE_REVIEWER_ID;
  return getLeaveApprover(pipelines, stage);
};

export const getOfficialDutyApprover = (
  pipelines: ApprovalPipelineConfig[],
  stage: ApprovalStage,
): string => {
  const stepNumber = OFFICIAL_DUTY_PIPELINE_STEP_BY_STAGE[stage];
  if (!stepNumber) return '';
  const fallback = OFFICIAL_DUTY_APPROVER_BY_STAGE[stage]
    || OFFICIAL_DUTY_APPROVER_BY_STAGE.deputy_approval
    || '';
  return getPipelineAssignee(pipelines, 'pipe-duty', stepNumber, fallback);
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
