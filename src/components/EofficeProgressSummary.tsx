import type { IncomingBook } from '../lib/api';
import type { DocumentWorkflow } from '../types';
import { eofficeDate, eofficeProgress } from '../lib/eoffice-progress';

const tones = {
  blue: 'border-blue-200 bg-blue-50 text-blue-800',
  violet: 'border-violet-200 bg-violet-50 text-violet-800',
  amber: 'border-amber-200 bg-amber-50 text-amber-900',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  rose: 'border-rose-200 bg-rose-50 text-rose-800',
  slate: 'border-slate-200 bg-slate-100 text-slate-700',
};

export const eofficeSteps = [
  { key: 'registered', title: 'ลงทะเบียนแล้ว', detail: 'รอเสนอหรือส่งต่อ', color: tones.blue },
  { key: 'routing', title: 'เสนอ / เกษียน', detail: 'ลงนามและเลือกผู้รับถัดไป', color: tones.violet },
  { key: 'distributed', title: 'ส่งถึงผู้ปฏิบัติ', detail: 'ติดตามการรับทราบรายบุคคล', color: tones.amber },
  { key: 'archived', title: 'แฟ้มจัดเก็บ', detail: 'ค้นดูเอกสารย้อนหลัง', color: tones.slate },
];

export function EofficeProgressSummary({ book, doc }: { book: IncomingBook; doc?: DocumentWorkflow }) {
  const progress = eofficeProgress(book, doc);
  return <div className="space-y-1.5" aria-label={`ขั้นตอนที่ ${progress.step}: ${progress.label}`}>
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-bold ${tones[progress.tone]}`}>
      <span className="opacity-70">{progress.step}.</span>{progress.label}
    </span>
    <p className="text-xs leading-relaxed text-slate-600">{progress.detail}</p>
    {progress.pendingNames && progress.pendingNames.length > 0 && <p className="text-xs leading-relaxed text-slate-500">
      รอ: {progress.pendingNames.slice(0, 2).join(', ')}{progress.pendingNames.length > 2 ? ` และอีก ${progress.pendingNames.length - 2} คน` : ''}
    </p>}
    {book.follow_date && book.stage !== 'archived' && <p className="text-xs font-semibold text-amber-800">นัดติดตาม {eofficeDate(book.follow_date)}</p>}
  </div>;
}
