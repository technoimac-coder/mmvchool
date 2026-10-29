import type { DocumentWorkflow, DocumentWorkflowRevision } from '../types';

export type DocumentRevisionEntry = {
  document: DocumentWorkflow;
  version: number;
  submittedAt: string;
  current: boolean;
  supersededBy?: number;
};

/** Bangkok database datetimes have no offset; do not reinterpret them in an overseas browser timezone. */
export function documentSubmissionTime(value?: string | null): string {
  if (!value) return '—';
  const normalized = value.replace(' ', 'T');
  const date = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized) ? normalized : normalized + '+07:00');
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** One entry per saved file version; original submission metadata and document totals stay unchanged. */
export function documentRevisionTimeline(item: DocumentWorkflow, history: DocumentWorkflowRevision[]): DocumentRevisionEntry[] {
  const version = item.fileVersion ?? 1;
  const ordered = [...history].filter(revision => revision.version < version).sort((a, b) => a.version - b.version);
  const submissionFor = (document: DocumentWorkflow, fileVersion: number) =>
    fileVersion === 1 ? document.createdAt : document.resubmittedAt || ordered.find(revision => revision.version === fileVersion - 1)?.replacedAt || '';
  return [
    ...ordered.map(revision => ({
      document: revision.document,
      version: revision.version,
      submittedAt: submissionFor(revision.document, revision.version),
      current: false,
      supersededBy: revision.version + 1,
    })),
    { document: item, version, submittedAt: submissionFor(item, version), current: true },
  ];
}

type Translate = (thai: string, english?: string) => string;
const escapeReportValue = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

/** One submission group, with aligned rows for each saved file/version. */
export function documentRevisionReportRows(batches: Array<{ items: DocumentWorkflow[] }>, histories: Map<string, DocumentWorkflowRevision[]>, options: { t: Translate; topicLabel: (item: DocumentWorkflow) => string; statusLabel: (item: DocumentWorkflow) => string }): string {
  const { t, topicLabel, statusLabel } = options;
  const e = escapeReportValue;
  return batches.map((batch, batchIndex) => {
    const first = batch.items[0];
    if (!first) return '';
    const entries = batch.items.flatMap(item => documentRevisionTimeline(item, histories.get(item.id) || []));
    return entries.map((entry, index) => {
      const item = entry.document;
      const versionLabel = entry.current && entry.version === 1 ? '' : entry.current ? t('ฉบับแก้ไขที่ ' + entry.version, 'Revised version ' + entry.version) : t('ฉบับเดิมที่ ' + entry.version, 'Previous version ' + entry.version);
      const status = entry.current ? statusLabel(item) : t('แก้ไขแล้ว — มีฉบับที่ ' + entry.supersededBy + ' แทน', 'Replaced by version ' + entry.supersededBy);
      const previousStatus = entry.current ? '' : '<div class="revision-note">' + e(t('สถานะเดิม: ', 'Previous status: ') + statusLabel(item)) + '</div>';
      const dateCell = '<td class="date-cell">' + e(documentSubmissionTime(entry.submittedAt)) + (versionLabel ? '<div class="revision-note">' + e(versionLabel) + '</div>' : '') + '</td>';
      const groupCells = index === 0 ? '<td class="number-cell" rowspan="' + entries.length + '">' + (batchIndex + 1) + '</td>' + dateCell + '<td rowspan="' + entries.length + '">' + e(first.createdByName) + '</td><td rowspan="' + entries.length + '">' + e(topicLabel(first)) + '</td>' : dateCell;
      return '<tr class="' + (entry.current ? 'current-version' : 'previous-version') + '">' + groupCells + '<td class="file-cell">' + e(item.fileName) + (versionLabel ? '<div class="revision-note">' + e(versionLabel) + '</div>' : '') + '</td><td class="status-cell">' + e(status) + previousStatus + '</td><td class="count-cell">' + item.signers.filter(signer => signer.status === 'signed').length + ' / ' + item.signers.length + '</td></tr>';
    }).join('');
  }).join('');
}
