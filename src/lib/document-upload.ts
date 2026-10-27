export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;
export const MAX_DOCUMENT_FILES = 50;

export type DocumentUpload = {
  requestId: string;
  file: File;
  title: string;
  status: 'ready' | 'uploading' | 'success' | 'error';
  error?: string;
};

export function documentFileError(file: Pick<File, 'name' | 'size'>): string | undefined {
  if (!/\.pdf$/i.test(file.name)) return 'รองรับไฟล์ PDF เท่านั้น กรุณาแปลงเอกสารเป็น PDF ก่อน';
  if (file.size === 0) return 'ไฟล์ว่าง กรุณาเลือกไฟล์ใหม่';
  if (file.size > MAX_DOCUMENT_BYTES) return 'ไฟล์ต้องมีขนาดไม่เกิน 15 MB';
}

// One request per file keeps upload limits and signing histories independent.
// Retrying retains the same request ID, including after a lost server response.
export async function submitDocumentFiles<T>(
  entries: DocumentUpload[],
  submit: (entry: DocumentUpload) => Promise<T>,
  update: (requestId: string, change: Partial<DocumentUpload>, result?: T) => void,
): Promise<{ succeeded: number; failed: number }> {
  let succeeded = entries.filter(entry => entry.status === 'success').length;
  let failed = 0;
  for (const entry of entries) {
    if (entry.status === 'success') continue;
    const error = documentFileError(entry.file) || (!entry.title.trim() ? 'กรุณากรอกชื่อเรื่องเอกสาร' : undefined);
    if (error) {
      update(entry.requestId, { status: 'error', error });
      failed++;
      continue;
    }
    update(entry.requestId, { status: 'uploading', error: undefined });
    try {
      const result = await submit(entry);
      update(entry.requestId, { status: 'success', error: undefined }, result);
      succeeded++;
    } catch (error) {
      update(entry.requestId, { status: 'error', error: error instanceof Error ? error.message : 'ส่งไฟล์ไม่สำเร็จ กรุณาลองใหม่' });
      failed++;
    }
  }
  return { succeeded, failed };
}
