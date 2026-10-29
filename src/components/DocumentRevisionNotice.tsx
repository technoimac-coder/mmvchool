'use client';
import type { DocumentWorkflow } from '../types';
import { documentSubmissionTime } from '../lib/document-revision-report';

export function DocumentRevisionNotice({ item }: { item: DocumentWorkflow }) {
  if ((item.fileVersion ?? 1) <= 1) return null;
  return <div className="mt-1 space-y-1 text-[11px]">
    <span className="inline-block rounded-md bg-blue-50 px-2 py-1 font-bold text-blue-700">ฉบับแก้ไขที่ {item.fileVersion}</span>
    {item.resubmittedAt && <span className="block font-medium text-slate-500">ส่งฉบับแก้ไข: {documentSubmissionTime(item.resubmittedAt)}</span>}
  </div>;
}
