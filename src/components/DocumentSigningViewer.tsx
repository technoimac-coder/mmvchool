'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Download } from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { DocumentWorkflow, DocumentWorkflowSigner } from '../types';
import { documentWorkflowsApi } from '../lib/api';

type Placement = NonNullable<DocumentWorkflowSigner['placement']>;
type AnnotationPlacement = NonNullable<DocumentWorkflowSigner['commentPlacement']>;

function decodeBase64DataUrl(dataUrl: string): Uint8Array {
  const encoded = dataUrl.split(',')[1] || '';
  const binary = atob(encoded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function buildImagePdf(images: Array<{ bytes: Uint8Array; width: number; height: number }>): Uint8Array {
  const objects: Array<Uint8Array | string> = [];
  const offsets: number[] = [0];
  const encoder = new TextEncoder();
  const add = (value: Uint8Array | string) => objects.push(typeof value === 'string' ? encoder.encode(value) : value);
  add('<< /Type /Catalog /Pages 2 0 R >>');
  add('');
  const pageIds: number[] = [];
  images.forEach((image, index) => {
    const pageId = 3 + index * 3;
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    pageIds.push(pageId);
    add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${image.width} ${image.height}] /Resources << /XObject << /Im${index + 1} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    const imageHeader = encoder.encode(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`);
    const imageFooter = encoder.encode('\nendstream');
    const imageObject = new Uint8Array(imageHeader.length + image.bytes.length + imageFooter.length);
    imageObject.set(imageHeader, 0); imageObject.set(image.bytes, imageHeader.length); imageObject.set(imageFooter, imageHeader.length + image.bytes.length);
    add(imageObject);
    add(`<< /Length ${`q ${image.width} 0 0 ${image.height} 0 0 cm /Im${index + 1} Do Q\n`.length} >>\nstream\nq ${image.width} 0 0 ${image.height} 0 0 cm /Im${index + 1} Do Q\nendstream`);
  });
  const pages = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  objects[1] = encoder.encode(pages);
  const chunks: Uint8Array[] = [encoder.encode('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n')];
  let position = chunks[0].length;
  objects.forEach((object, index) => {
    offsets[index + 1] = position;
    const header = encoder.encode(`${index + 1} 0 obj\n`);
    const body = typeof object === 'string' ? encoder.encode(object) : object;
    const footer = encoder.encode('\nendobj\n');
    chunks.push(header, body, footer);
    position += header.length + body.length + footer.length;
  });
  const xref = position;
  const xrefLines = [`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`, ...offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`)];
  chunks.push(encoder.encode(xrefLines.join('')));
  chunks.push(encoder.encode(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`));
  const result = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let cursor = 0;
  chunks.forEach(chunk => { result.set(chunk, cursor); cursor += chunk.length; });
  return result;
}

function PdfPage({ pdf, page, marks, draft, image, draftComment, draftCheckmarks, draftCommentPlacement, draftCheckmarksPlacement, placementMode, onPlace, onPlaceAnnotation, onMoveAnnotation }: {
  pdf: PDFDocumentProxy; page: number; marks: DocumentWorkflowSigner[];
  draft: Placement | null; image: string; draftComment?: string; draftCheckmarks?: { noted?: boolean; approved?: boolean }; draftCommentPlacement?: AnnotationPlacement | null; draftCheckmarksPlacement?: AnnotationPlacement | null; placementMode?: 'comment' | 'checkmarks'; onPlace?: (p: Placement) => void; onPlaceAnnotation?: (kind: 'comment' | 'checkmarks', p: AnnotationPlacement) => void; onMoveAnnotation?: (kind: 'comment' | 'checkmarks', p: AnnotationPlacement) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(0.707);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    let task: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | undefined;
    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      try {
        const p = await pdf.getPage(page);
        if (cancelled || !canvas.current) return;
        const viewport = p.getViewport({ scale: 1.5 });
        setRatio(viewport.width / viewport.height);
        canvas.current.width = viewport.width;
        canvas.current.height = viewport.height;
        task = p.render({ canvas: canvas.current, viewport });
        await task.promise;
        if (!cancelled) setReady(true);
      } catch { if (!cancelled) setError('แสดงหน้านี้ไม่สำเร็จ กรุณาปิดแล้วเปิดเอกสารใหม่'); }
    }, { rootMargin: '400px' });
    if (host.current) observer.observe(host.current);
    return () => { cancelled = true; observer.disconnect(); task?.cancel(); };
  }, [pdf, page]);
  const overlays = marks.filter(s => s.placement?.page === page && s.signatureData?.startsWith('data:image/png;base64,'))
    .map(s => ({ p: s.placement!, src: s.signatureData!, name: s.userName, comment: s.comment, checkmarks: s.checkmarks, cp: s.commentPlacement, mp: s.checkmarksPlacement, draft: false }));
  if (draft?.page === page && image) overlays.push({ p: draft, src: image, name: 'ตำแหน่งลายเซ็นของคุณ (ยังไม่บันทึก)', comment: draftComment, checkmarks: draftCheckmarks, cp: draftCommentPlacement || undefined, mp: draftCheckmarksPlacement || undefined, draft: true });
  const updateAnnotation = (kind: 'comment' | 'checkmarks', e: ReactPointerEvent<HTMLDivElement>) => {
    if (!onMoveAnnotation || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const r = host.current?.getBoundingClientRect();
    const current = kind === 'comment' ? draftCommentPlacement : draftCheckmarksPlacement;
    if (!r || !current) return;
    onMoveAnnotation(kind, { ...current, x: Math.max(0, Math.min(1 - current.width, (e.clientX - r.left) / r.width - current.width / 2)), y: Math.max(0, Math.min(1 - current.height, (e.clientY - r.top) / r.height - current.height / 2)) });
  };
  return <section className="mb-5"><p className="mb-2 text-center text-xs text-slate-600">หน้า {page} / {pdf.numPages}</p>
    <div ref={host} className="relative mx-auto bg-white shadow" style={{ aspectRatio: ratio }}
      onClick={e => {
        if (!ready || (!onPlace && !onPlaceAnnotation)) return;
        const r = e.currentTarget.getBoundingClientRect();
        if (onPlaceAnnotation) {
          const current = placementMode === 'comment' ? draftCommentPlacement : draftCheckmarksPlacement;
          const width = current?.width ?? (placementMode === 'comment' ? 0.52 : 0.42);
          const height = current?.height ?? (placementMode === 'comment' ? 0.075 : 0.07);
          onPlaceAnnotation(placementMode || 'comment', { page, width, height, x: Math.max(0, Math.min(1 - width, (e.clientX - r.left) / r.width - width / 2)), y: Math.max(0, Math.min(1 - height, (e.clientY - r.top) / r.height - height / 2)) });
          return;
        }
        if (!onPlace) return;
        const width = draft?.width ?? 0.25;
        const height = width * ratio / 3;
        onPlace({ page, width, height, x: Math.max(0, Math.min(1 - width, (e.clientX - r.left) / r.width - width / 2)), y: Math.max(0, Math.min(1 - height, (e.clientY - r.top) / r.height - height / 2)) });
      }}>
      <canvas ref={canvas} className="block h-full w-full" aria-label={`เอกสารหน้า ${page}`} />
      {!ready && <p role="status" className="absolute inset-0 flex items-center justify-center p-5 text-sm">{error || 'กำลังแสดงหน้าเอกสาร…'}</p>}
      {overlays.map((s, i) => <div key={i}>
        <div className="pointer-events-none absolute" style={{ left: `${s.p.x * 100}%`, top: `${s.p.y * 100}%`, width: `${s.p.width * 100}%` }}><img src={s.src} alt={`ลายเซ็น ${s.name}`} draggable={false} className="block h-auto w-full" /></div>
        {s.comment && s.cp?.page === page && <div className={`absolute z-20 px-1 text-[10px] leading-tight text-slate-700 ${s.draft ? 'pointer-events-auto cursor-move' : 'pointer-events-none'}`} style={{ left: `${s.cp.x * 100}%`, top: `${s.cp.y * 100}%`, width: `${s.cp.width * 100}%`, minHeight: `${s.cp.height * 100}%` }} onPointerDown={e => { if (s.draft) { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); } }} onPointerMove={e => s.draft && updateAnnotation('comment', e)}>{s.comment}</div>}
        {s.comment && !s.cp && <div className="pointer-events-none absolute px-1 text-[10px] leading-tight text-slate-700" style={{ left: `${s.p.x * 100}%`, top: `${Math.max(0, s.p.y - 0.08) * 100}%` }}>{s.comment}</div>}
        {(s.checkmarks?.noted || s.checkmarks?.approved) && s.mp?.page === page && <div className={`absolute z-20 px-1 text-lg leading-none text-slate-900 ${s.draft ? 'pointer-events-auto cursor-move' : 'pointer-events-none'}`} style={{ left: `${s.mp.x * 100}%`, top: `${s.mp.y * 100}%`, width: `${s.mp.width * 100}%`, minHeight: `${s.mp.height * 100}%` }} onPointerDown={e => { if (s.draft) { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); } }} onPointerMove={e => s.draft && updateAnnotation('checkmarks', e)}>✔</div>}
        {(s.checkmarks?.noted || s.checkmarks?.approved) && !s.mp && <div className="pointer-events-none absolute px-1 text-lg leading-none text-slate-900" style={{ left: `${s.p.x * 100}%`, top: `${(s.p.y + s.p.height + 0.01) * 100}%` }}>✔</div>}
      </div>)}
    </div></section>;
}

export function DocumentSigningViewer({ item, userId, onClose, onSaved }: {
  item: DocumentWorkflow; userId: string; onClose: () => void; onSaved: (item: DocumentWorkflow) => void;
}) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState('');
  const [draft, setDraft] = useState<Placement | null>(null);
  const [commentPlacement, setCommentPlacement] = useState<AnnotationPlacement | null>(null);
  const [checkmarksPlacement, setCheckmarksPlacement] = useState<AnnotationPlacement | null>(null);
  const [placementMode, setPlacementMode] = useState<'comment' | 'checkmarks' | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [comment, setComment] = useState('');
  const [checkmarks, setCheckmarks] = useState({ noted: false, approved: false });
  const pad = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const ink = useRef(false);
  const canSign = ['pending', 'in_review'].includes(item.status) && item.signers.some(s => s.userId === userId && s.step === item.currentStep && s.status === 'pending');
  const placeDraft = (placement: Placement) => {
    setDraft(placement);
    setCommentPlacement(previous => previous?.page === placement.page ? previous : {
      page: placement.page, x: Math.max(0, Math.min(1 - 0.52, placement.x)), y: Math.max(0, placement.y - 0.09), width: 0.52, height: 0.075,
    });
    setCheckmarksPlacement(previous => previous?.page === placement.page ? previous : {
      page: placement.page, x: Math.max(0, Math.min(1 - 0.42, placement.x)), y: Math.min(1 - 0.07, placement.y + placement.height + 0.01), width: 0.42, height: 0.07,
    });
    setConfirmed(false);
  };
  const placeAnnotation = (kind: 'comment' | 'checkmarks', placement: AnnotationPlacement) => {
    if (kind === 'comment') setCommentPlacement(placement);
    else setCheckmarksPlacement(placement);
    setPlacementMode(null);
    setConfirmed(false);
  };
  const downloadSignedPdf = async () => {
    if (!pdf) throw new Error('กำลังเตรียมเอกสาร กรุณารอสักครู่');
    const pages: Array<{ bytes: Uint8Array; width: number; height: number }> = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('สร้างไฟล์ PDF ไม่สำเร็จ');
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      for (const signer of item.signers.filter(s => s.placement?.page === pageNumber && s.signatureData?.startsWith('data:image/png;base64,'))) {
        const signature = new Image();
        await new Promise<void>((resolve, reject) => { signature.onload = () => resolve(); signature.onerror = () => reject(new Error('อ่านลายเซ็นไม่สำเร็จ')); signature.src = signer.signatureData!; });
        const placement = signer.placement!;
        context.drawImage(signature, placement.x * canvas.width, placement.y * canvas.height, placement.width * canvas.width, placement.height * canvas.height);
        const x = placement.x * canvas.width;
        const y = placement.y * canvas.height;
        const width = placement.width * canvas.width;
        const fontSize = Math.max(12, Math.round(canvas.width * 0.014));
        context.font = `${fontSize}px Arial, sans-serif`;
        context.fillStyle = '#263238';
        if (signer.comment) {
          const cp = signer.commentPlacement?.page === pageNumber ? signer.commentPlacement : { ...placement, y: Math.max(0, placement.y - 0.07), height: 0.06 };
          context.fillText(signer.comment.slice(0, 120), cp.x * canvas.width, Math.min(canvas.height - fontSize, cp.y * canvas.height + fontSize));
        }
        const labels = (signer.checkmarks?.noted || signer.checkmarks?.approved) ? ['✔'] : [];
        const mp = signer.checkmarksPlacement?.page === pageNumber ? signer.checkmarksPlacement : { ...placement, y: Math.min(1 - 0.07, placement.y + placement.height + 0.01), width: 0.42, height: 0.07 };
        labels.forEach(() => { const bx = mp.x * canvas.width; const by = Math.min(canvas.height - fontSize, mp.y * canvas.height + fontSize); context.fillText('✔', bx, by); });
      }
      const jpeg = canvas.toDataURL('image/jpeg', 0.92);
      pages.push({ bytes: decodeBase64DataUrl(jpeg), width: canvas.width, height: canvas.height });
    }
    return buildImagePdf(pages);
  };
  const downloadDocument = async () => {
    try {
      let blob: Blob;
      if (item.signers.some(s => s.status === 'signed' && s.placement && s.signatureData)) {
        const bytes = await downloadSignedPdf();
        const pdfBuffer = new ArrayBuffer(bytes.byteLength);
        new Uint8Array(pdfBuffer).set(bytes);
        blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      } else {
        const response = await fetch(`/api/document_workflows.php?download=${encodeURIComponent(item.id)}`, { credentials: 'same-origin' });
        if (!response.ok) throw new Error('ดาวน์โหลดเอกสารไม่สำเร็จ');
        blob = await response.blob();
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = item.fileName || `${item.title}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e) { setError(e instanceof Error ? e.message : 'ดาวน์โหลดเอกสารไม่สำเร็จ'); }
  };
  useEffect(() => {
    let cancelled = false;
    let task: ReturnType<typeof import('pdfjs-dist')['getDocument']> | undefined;
    const controller = new AbortController();
    void (async () => {
      try {
        if (!/\.pdf$/i.test(item.fileName)) throw new Error('การเลื่อนดูและลงนามบนหน้าเอกสารรองรับ PDF กรุณาส่งเอกสารนี้ใหม่เป็น PDF');
        const response = await fetch(`/api/document_workflows.php?download=${encodeURIComponent(item.id)}`, { credentials: 'same-origin', signal: controller.signal });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.message || 'เปิดเอกสารไม่สำเร็จ กรุณาตรวจสอบสิทธิ์หรือเข้าสู่ระบบใหม่');
        }
        const data = new Uint8Array(await response.arrayBuffer());
        const library = await import('pdfjs-dist');
        // Plesk extracts deployment archives into /httpdocs and removes a
        // single archive root folder, so the PDF.js runtime is served from
        // these public root paths in production.
        library.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        if (cancelled) return;
        task = library.getDocument({ data, isEvalSupported: false, cMapUrl: '/cmaps/', cMapPacked: true, standardFontDataUrl: '/standard_fonts/', wasmUrl: '/wasm/' });
        const document = await task.promise;
        if (!cancelled) setPdf(document);
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : 'เปิด PDF ไม่สำเร็จ'); }
    })();
    return () => { cancelled = true; controller.abort(); void task?.destroy(); };
  }, [item.id, item.fileName]);
  const submit = async (action: 'sign' | 'reject') => {
    if (busy) return;
    if (action === 'sign' && (!pdf || !image || !draft || !confirmed)) return;
    if (action === 'reject' && !comment.trim()) { setError('กรุณาระบุเหตุผลที่ส่งกลับ'); return; }
    setBusy(true); setError('');
    try {
      const placement = draft ? { ...draft, commentPlacement: comment.trim() ? commentPlacement || undefined : undefined, checkmarksPlacement: (checkmarks.noted || checkmarks.approved) ? checkmarksPlacement || undefined : undefined } : draft;
      const updated = action === 'sign' ? await documentWorkflowsApi.sign(item.id, image, placement!, comment, checkmarks) : await documentWorkflowsApi.reject(item.id, comment);
      setDraft(null); setCommentPlacement(null); setCheckmarksPlacement(null); setImage(''); setConfirmed(false); setComment(''); setCheckmarks({ noted: false, approved: false });
      onSaved(updated);
    } catch (e) { setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ ตำแหน่งลายเซ็นยังอยู่ กรุณาลองอีกครั้ง'); }
    finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-2 sm:p-4" role="dialog" aria-modal="true" aria-label="อ่านและลงนามเอกสารออนไลน์">
    <div className="flex h-[96vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      <header className="flex items-center justify-between gap-3 border-b p-4"><div><h2 className="font-bold">{item.title}</h2><p className="text-xs text-slate-500">เลื่อนอ่านเอกสาร • วาดลายเซ็น • แตะตำแหน่ง • ยืนยันส่งต่อ</p></div><div className="flex shrink-0 items-center gap-2"><button type="button" onClick={() => void downloadDocument()} className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"><Download className="h-4 w-4" />ดาวน์โหลด PDF</button><button disabled={busy} onClick={onClose} aria-label="ปิดเอกสาร" className="rounded-lg border px-3 py-2">ปิด</button></div></header>
      {error && <p role="alert" className="bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(180px,0.65fr)] lg:grid-cols-[1fr_320px] lg:grid-rows-1">
        <div className="min-h-0 overflow-auto bg-slate-200 p-3" aria-label="พื้นที่เลื่อนอ่านเอกสาร">
          {!pdf && !error && <p role="status">กำลังเปิดเอกสารในระบบ…</p>}
          {pdf && Array.from({ length: pdf.numPages }, (_, i) => <PdfPage key={i} pdf={pdf} page={i + 1} marks={item.signers} draft={draft} image={image} draftComment={comment} draftCheckmarks={checkmarks} draftCommentPlacement={commentPlacement} draftCheckmarksPlacement={checkmarksPlacement} placementMode={placementMode || undefined} onPlace={canSign && image && !placementMode ? placeDraft : undefined} onPlaceAnnotation={canSign && image && placementMode ? placeAnnotation : undefined} onMoveAnnotation={(kind, p) => { if (kind === 'comment') setCommentPlacement(p); else setCheckmarksPlacement(p); setConfirmed(false); }} />)}
        </div>
        <aside className="space-y-4 overflow-auto border-l p-4">
          <h3 className="font-bold">ลำดับผู้ลงนาม</h3>
          <div className="space-y-2">{item.signers.map(s => <div key={s.step} className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-sm"><div>{s.step}. {s.userName}</div><span className="block text-xs text-indigo-600">{s.status === 'signed' ? `ลงนามแล้ว ${s.signedAt || ''}` : s.status === 'rejected' ? 'ส่งกลับ' : s.step === item.currentStep ? 'รอลงนาม' : 'รอคิว'}</span>{s.comment && <span className="mt-1 block text-xs text-slate-500">หมายเหตุ: {s.comment}</span>}</div>)}</div>
          {canSign && pdf && <>
            <h3 className="font-bold text-indigo-700">1. วาดลายเซ็นของคุณ</h3>
            <canvas ref={pad} width={600} height={200} aria-label="กระดานวาดลายเซ็น" className="w-full touch-none rounded-xl border-2 border-indigo-200 bg-white" style={{ aspectRatio: 3 }}
              onPointerDown={e => {
                const c = e.currentTarget; c.setPointerCapture(e.pointerId); drawing.current = true;
                const r = c.getBoundingClientRect(); const ctx = c.getContext('2d')!;
                ctx.strokeStyle = '#0038a8'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                ctx.beginPath(); ctx.moveTo((e.clientX - r.left) * 600 / r.width, (e.clientY - r.top) * 200 / r.height);
              }}
              onPointerMove={e => { if (!drawing.current) return; const c = e.currentTarget; const r = c.getBoundingClientRect(); const ctx = c.getContext('2d')!; ctx.lineTo((e.clientX - r.left) * 600 / r.width, (e.clientY - r.top) * 200 / r.height); ctx.stroke(); ink.current = true; }}
              onPointerUp={e => { drawing.current = false; if (ink.current) setImage(e.currentTarget.toDataURL('image/png')); setConfirmed(false); }}
              onPointerCancel={() => { drawing.current = false; }} />
            <button className="text-sm text-rose-600" onClick={() => { pad.current?.getContext('2d')?.clearRect(0, 0, 600, 200); ink.current = false; setImage(''); setDraft(null); setCommentPlacement(null); setCheckmarksPlacement(null); setConfirmed(false); }}>ล้างลายเซ็น</button>
            <h3 className="font-bold text-indigo-700">2. แตะตำแหน่งบนเอกสาร</h3>
            <p className="text-xs text-slate-600">เลื่อนไปหน้าที่ต้องการ แล้วแตะตรงช่องลงนาม แตะใหม่เพื่อย้ายตำแหน่งก่อนยืนยัน</p>
            {draft && <p className="rounded-lg bg-indigo-50 p-2 text-sm">เลือกตำแหน่งหน้า {draft.page} แล้ว</p>}
            <label className="block text-sm">ขนาดลายเซ็น<input aria-label="ขนาดลายเซ็น" type="range" min="0.1" max="0.45" step="0.01" value={draft?.width ?? 0.25} disabled={!draft} onChange={e => { const width = Number(e.target.value); setDraft(p => p ? { ...p, width, height: p.height * width / p.width, x: Math.min(p.x, 1 - width), y: Math.min(p.y, 1 - p.height * width / p.width) } : p); setConfirmed(false); }} className="w-full" /></label>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm">
              <div className="mb-1 font-semibold text-slate-700">ช่องข้อความกำกับ</div>
              <textarea aria-label="ข้อความกำกับหรือเหตุผลส่งกลับ" value={comment} onChange={e => { setComment(e.target.value); setConfirmed(false); }} placeholder="ข้อความกำกับ / ความเห็น / เหตุผลส่งกลับ (ถ้ามี)" className="w-full rounded-lg border p-2 text-sm" />
              <button type="button" disabled={!comment.trim() || !draft} onClick={() => setPlacementMode('comment')} className="mt-2 w-full rounded-lg border border-indigo-200 bg-white px-2 py-1.5 text-xs font-semibold text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{placementMode === 'comment' ? 'คลิกบนเอกสารเพื่อวางช่องความคิดเห็น' : 'เลือกตำแหน่งช่องความคิดเห็น'}</button>
              {commentPlacement && <div className="mt-1 text-[11px] text-slate-500">ลากกรอบความคิดเห็นบนเอกสารเพื่อย้ายตำแหน่งได้</div>}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm"><div className="mb-1 font-semibold text-slate-700">เครื่องหมายกำกับในเอกสาร (แยกตำแหน่งได้)</div><div className="flex flex-wrap gap-3"><label className="flex items-center gap-2"><input type="checkbox" checked={checkmarks.noted} onChange={e => { setCheckmarks(p => ({ ...p, noted: e.target.checked })); setConfirmed(false); }} />Noted / รับทราบ</label><label className="flex items-center gap-2"><input type="checkbox" checked={checkmarks.approved} onChange={e => { setCheckmarks(p => ({ ...p, approved: e.target.checked })); setConfirmed(false); }} />Approved / อนุมัติ</label></div><button type="button" disabled={!(checkmarks.noted || checkmarks.approved) || !draft} onClick={() => setPlacementMode('checkmarks')} className="mt-2 w-full rounded-lg border border-indigo-200 bg-white px-2 py-1.5 text-xs font-semibold text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{placementMode === 'checkmarks' ? 'คลิกบนเอกสารเพื่อวางช่องติ๊ก' : 'เลือกตำแหน่งช่องติ๊ก'}</button>{checkmarksPlacement && <div className="mt-1 text-[11px] text-slate-500">ลากกรอบช่องติ๊กบนเอกสารเพื่อย้ายตำแหน่งได้</div>}</div>
            <label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={!draft || !image} />ฉันตรวจเอกสารและยืนยันลงนาม ณ ตำแหน่งนี้</label>
            <button disabled={busy || !confirmed || !draft || !image} onClick={() => void submit('sign')} className="w-full rounded-xl bg-indigo-600 p-3 font-bold text-white disabled:opacity-40">{busy ? 'กำลังบันทึก…' : 'บันทึกลายเซ็นและดำเนินการต่อ'}</button>
            <button disabled={busy} onClick={() => void submit('reject')} className="w-full rounded-xl border border-rose-200 p-2 text-rose-600">ส่งกลับให้แก้ไข</button>
          </>}
        </aside>
      </div>
    </div>
  </div>;
}
