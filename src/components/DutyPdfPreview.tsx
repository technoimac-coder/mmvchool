'use client';
import React, { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

export function DutyPdfPreview({ dataUrl, name }: { dataUrl: string; name: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    let task: ReturnType<typeof import('pdfjs-dist')['getDocument']> | undefined;
    void (async () => {
      try {
        const response = await fetch(dataUrl);
        if (!response.ok) throw new Error('Cannot read attachment');
        const data = new Uint8Array(await response.arrayBuffer());
        const library = await import('pdfjs-dist');
        library.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        task = library.getDocument({ data, isEvalSupported: false, cMapUrl: '/cmaps/', cMapPacked: true, standardFontDataUrl: '/standard_fonts/', wasmUrl: '/wasm/' });
        const document = await task.promise;
        if (!cancelled) setPdf(document);
      } catch { if (!cancelled) setError('ไม่สามารถแสดง PDF ได้ ลองดาวน์โหลดไฟล์เพื่อตรวจสอบ'); }
    })();
    return () => { cancelled = true; void task?.destroy(); };
  }, [dataUrl]);
  useEffect(() => {
    if (!pdf || !canvas.current) return;
    let cancelled = false;
    let renderTask: { cancel: () => void } | undefined;
    void (async () => {
      try {
        const pdfPage = await pdf.getPage(page);
        if (cancelled || !canvas.current) return;
        const viewport = pdfPage.getViewport({ scale: 1.5 });
        const element = canvas.current;
        element.width = viewport.width; element.height = viewport.height;
        const context = element.getContext('2d');
        if (!context) throw new Error('Cannot render page');
        const task = pdfPage.render({ canvas: element, canvasContext: context, viewport });
        renderTask = task;
        await task.promise;
      } catch { if (!cancelled) setError('ไม่สามารถแสดงหน้านี้ได้ ลองดาวน์โหลดไฟล์เพื่อตรวจสอบ'); }
    })();
    return () => { cancelled = true; renderTask?.cancel(); };
  }, [pdf, page]);
  return <div className="flex h-full w-full flex-col gap-2">
    <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
      <button type="button" disabled={!pdf || page <= 1} onClick={() => setPage(value => value - 1)} className="rounded-lg border px-3 py-1 disabled:opacity-40">หน้าก่อน</button>
      <span>{pdf ? `หน้า ${page} / ${pdf.numPages}` : error ? 'เปิดเอกสารไม่สำเร็จ' : 'กำลังเปิดเอกสาร…'}</span>
      <button type="button" disabled={!pdf || page >= pdf.numPages} onClick={() => setPage(value => value + 1)} className="rounded-lg border px-3 py-1 disabled:opacity-40">หน้าถัดไป</button>
      <a href={dataUrl} download={name} className="rounded-lg bg-indigo-700 px-3 py-1 text-white">ดาวน์โหลด PDF</a>
    </div>
    {error && <p role="alert" className="text-center text-sm text-rose-700">{error}</p>}
    <div className="min-h-0 flex-1 overflow-auto"><canvas ref={canvas} aria-label={`เอกสาร ${name} หน้า ${page}`} className="mx-auto block h-auto max-w-full bg-white shadow" /></div>
  </div>;
}
