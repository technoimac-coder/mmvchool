import type { IncomingBook } from './api';
import type { DocumentWorkflow } from '../types';

type Attachment = NonNullable<IncomingBook['attachments']>[number];

/** Present an authorized original or attachment in the reader without a signing workflow. */
export function originalBookDocument(book: IncomingBook, attachment?: Attachment): DocumentWorkflow {
  const url = `/api/eoffice.php?download=${encodeURIComponent(book.id)}${attachment ? `&attachment=${encodeURIComponent(attachment.id)}` : ''}`;
  return {
    id: `EO-ORIGINAL-${book.id}${attachment ? `-${attachment.id}` : ''}`,
    title: attachment ? attachment.file_name : book.title,
    topic: 'other',
    fileUrl: url,
    fileName: attachment?.file_name || book.file_name,
    createdBy: '',
    createdByName: book.created_by_name,
    status: 'completed',
    currentStep: 0,
    academicYear: book.academic_year,
    signers: [],
    createdAt: book.created_at || book.received_date,
  };
}

export function documentZoom(current: number, direction: -1 | 1): number {
  return Math.max(1, Math.min(3, Math.round((current + direction * 0.25) * 100) / 100));
}

/** Safari needs an attached link and time to consume the object URL after a tap. */
export function saveDocumentBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}