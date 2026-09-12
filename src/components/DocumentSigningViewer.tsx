'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Download } from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { DocumentWorkflow, DocumentWorkflowSigner } from '../types';
import { documentWorkflowsApi } from '../lib/api';

const PEN_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath d='M3 29l2.2-7.1L23.8 3.3a2.8 2.8 0 014 4L9.2 25.9z' fill='%23fff' stroke='%231e293b' stroke-width='1.6' stroke-linejoin='round'/%3E%3Cpath d='M5.2 21.9l4 4M21.6 5.5l4 4M3 29l6.2-3.1-4-4z' fill='%234f46e5' stroke='%231e293b' stroke-width='1.2'/%3E%3C/svg%3E") 3 29, crosshair`;
const ERASER_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cg transform='rotate(-42 16 16)'%3E%3Crect x='6' y='10' width='20' height='13' rx='3' fill='%23f9a8d4' stroke='%231e293b' stroke-width='1.6'/%3E%3Cpath d='M18 10v13' stroke='%231e293b' stroke-width='1.4'/%3E%3Cpath d='M18 11h5a2 2 0 012 2v7a2 2 0 01-2 2h-5z' fill='%23fff'/%3E%3C/g%3E%3C/svg%3E") 16 16, cell`;

type Placement = NonNullable<DocumentWorkflowSigner['placement']>;
type AnnotationPlacement = NonNullable<DocumentWorkflowSigner['commentPlacement']> & { fontSize?: number };

function estimateTextWidth(text: string, fontSize = 16) {
  const longestLine = Math.max(1, ...text.split(/\r?\n/).map(line => Array.from(line).length));
  return Math.max(0.06, Math.min(0.92, longestLine * fontSize * 0.0009 + 0.025));
}

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

function PdfPage({ pdf, page, marks, draft, image, draftComment, draftCommentImage, draftCheckmarks, draftCommentPlacement, draftTextPlacement, draftCheckmarksPlacement, placementMode, drawMode, inkTool = 'pen', penSize = 2, onDraw, onPlace, onPlaceAnnotation, onMoveAnnotation, onMoveSignature }: {
  pdf: PDFDocumentProxy; page: number; marks: DocumentWorkflowSigner[];
  draft: Placement | null; image: string; draftComment?: string; draftCommentImage?: string; draftCheckmarks?: { noted?: boolean; approved?: boolean }; draftCommentPlacement?: AnnotationPlacement | null; draftTextPlacement?: AnnotationPlacement | null; draftCheckmarksPlacement?: AnnotationPlacement | null; placementMode?: 'text' | 'checkmarks'; drawMode?: boolean; inkTool?: 'pen' | 'eraser'; penSize?: number; onDraw?: (page: number, image: string) => void; onPlace?: (p: Placement) => void; onPlaceAnnotation?: (kind: 'text' | 'checkmarks', p: AnnotationPlacement) => void; onMoveAnnotation?: (kind: 'text' | 'checkmarks', p: AnnotationPlacement) => void; onMoveSignature?: (p: Placement) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const inkCanvas = useRef<HTMLCanvasElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(0.707);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const drawing = useRef(false);
  const drag = useRef<{ kind: 'signature' | 'text' | 'checkmarks'; offsetX: number; offsetY: number } | null>(null);
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
        if (inkCanvas.current) { inkCanvas.current.width = Math.ceil(viewport.width); inkCanvas.current.height = Math.ceil(viewport.height); }
        task = p.render({ canvas: canvas.current, viewport });
        await task.promise;
        if (!cancelled) setReady(true);
      } catch { if (!cancelled) setError('แสดงหน้านี้ไม่สำเร็จ กรุณาปิดแล้วเปิดเอกสารใหม่'); }
    }, { rootMargin: '400px' });
    if (host.current) observer.observe(host.current);
    return () => { cancelled = true; observer.disconnect(); task?.cancel(); };
  }, [pdf, page]);
  const overlays = marks.filter(s => s.placement?.page === page && s.signatureData?.startsWith('data:image/png;base64,'))
    .map(s => ({ p: s.placement!, src: s.signatureData!, name: s.userName, comment: s.comment, commentImage: s.commentImage, checkmarks: s.checkmarks, cp: s.commentPlacement, tp: s.textPlacement, mp: s.checkmarksPlacement, draft: false }));
  if (draft?.page === page && image) overlays.push({ p: draft, src: image, name: 'ตำแหน่งลายเซ็นของคุณ (ยังไม่บันทึก)', comment: undefined, commentImage: draftCommentImage && draftCommentPlacement?.page === page ? draftCommentImage : undefined, checkmarks: draftCheckmarks, cp: draftCommentPlacement?.page === page ? draftCommentPlacement : undefined, tp: undefined, mp: draftCheckmarksPlacement?.page === page ? draftCheckmarksPlacement : undefined, draft: true });
  const savedTexts = marks.flatMap(s => {
    if (!s.comment) return [];
    const placement = s.textPlacement || (!s.commentImage ? s.commentPlacement : undefined) || (s.placement ? { ...s.placement, y: Math.max(0, s.placement.y - 0.07), height: 0.06, fontSize: 16 } : undefined);
    return placement?.page === page ? [{ text: s.comment, placement }] : [];
  });
  const updateAnnotation = (kind: 'text' | 'checkmarks', e: ReactPointerEvent<HTMLDivElement>) => {
    if (!onMoveAnnotation || drag.current?.kind !== kind) return;
    const r = host.current?.getBoundingClientRect();
    const current = kind === 'text' ? draftTextPlacement : draftCheckmarksPlacement;
    if (!r || !current) return;
    const { offsetX, offsetY } = drag.current;
    onMoveAnnotation(kind, { ...current, x: Math.max(0, Math.min(1 - current.width, (e.clientX - r.left) / r.width - offsetX)), y: Math.max(0, Math.min(1 - current.height, (e.clientY - r.top) / r.height - offsetY)) });
  };
  const updateSignature = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!onMoveSignature || !draft || drag.current?.kind !== 'signature') return;
    const r = host.current?.getBoundingClientRect(); if (!r) return;
    const { offsetX, offsetY } = drag.current;
    onMoveSignature({ ...draft, x: Math.max(0, Math.min(1 - draft.width, (e.clientX - r.left) / r.width - offsetX)), y: Math.max(0, Math.min(1 - draft.height, (e.clientY - r.top) / r.height - offsetY)) });
  };
  return <section className="mb-5"><p className="mb-2 text-center text-xs text-slate-600">หน้า {page} / {pdf.numPages}</p>
    <div ref={host} className="relative mx-auto bg-white shadow" style={{ aspectRatio: ratio }}
      onClick={e => {
        if (!ready || (!onPlace && !onPlaceAnnotation)) return;
        const r = e.currentTarget.getBoundingClientRect();
        if (onPlaceAnnotation && placementMode) {
          const current = placementMode === 'text' ? draftTextPlacement : draftCheckmarksPlacement;
          const width = placementMode === 'text' ? estimateTextWidth(draftComment || '', current?.fontSize ?? 16) : (current?.width ?? 0.05);
          const height = current?.height ?? (placementMode === 'text' ? 0.075 : 0.05);
          onPlaceAnnotation(placementMode || 'text', { page, width, height, x: Math.max(0, Math.min(1 - width, (e.clientX - r.left) / r.width - width / 2)), y: Math.max(0, Math.min(1 - height, (e.clientY - r.top) / r.height - height / 2)), ...(placementMode === 'text' ? { fontSize: draftTextPlacement?.fontSize ?? 16 } : {}) });
          return;
        }
        if (!onPlace) return;
        const width = draft?.width ?? 0.25;
        const height = width * ratio / 3;
        onPlace({ page, width, height, x: Math.max(0, Math.min(1 - width, (e.clientX - r.left) / r.width - width / 2)), y: Math.max(0, Math.min(1 - height, (e.clientY - r.top) / r.height - height / 2)) });
      }}>
      <canvas ref={canvas} className="block h-full w-full" aria-label={`เอกสารหน้า ${page}`} />
      <canvas ref={inkCanvas} aria-label={`เขียนลงเอกสารหน้า ${page}`} className={`absolute inset-0 z-30 h-full w-full select-none ${drawMode ? 'touch-none' : 'pointer-events-none'}`} style={{ background: 'transparent', cursor: drawMode ? (inkTool === 'eraser' ? ERASER_CURSOR : PEN_CURSOR) : 'default', touchAction: 'none' }}
        onPointerDown={e => { e.stopPropagation(); const c = e.currentTarget; c.setPointerCapture(e.pointerId); drawing.current = true; const r = c.getBoundingClientRect(); const ctx = c.getContext('2d')!; ctx.globalCompositeOperation = inkTool === 'eraser' ? 'destination-out' : 'source-over'; ctx.strokeStyle = '#173b9c'; ctx.lineWidth = Math.max(1, c.width / 900 * penSize * (inkTool === 'eraser' ? 4 : 1)); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo((e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height); }}
        onPointerMove={e => { e.stopPropagation(); if (!drawing.current) return; const c = e.currentTarget; const r = c.getBoundingClientRect(); const ctx = c.getContext('2d')!; ctx.lineTo((e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height); ctx.stroke(); }}
        onPointerUp={e => { e.stopPropagation(); drawing.current = false; if (onDraw) onDraw(page, e.currentTarget.toDataURL('image/png')); }} onPointerCancel={() => { drawing.current = false; }} />
      {!ready && <p role="status" className="absolute inset-0 flex items-center justify-center p-5 text-sm">{error || 'กำลังแสดงหน้าเอกสาร…'}</p>}
      {overlays.map((s, i) => <div key={i}>
        <div className={`absolute ${s.draft ? 'pointer-events-auto cursor-move touch-none select-none' : 'pointer-events-none'}`} style={{ left: `${s.p.x * 100}%`, top: `${s.p.y * 100}%`, width: `${s.p.width * 100}%`, touchAction: 'none' }} onClick={e => e.stopPropagation()} onPointerDown={e => { if (s.draft) { e.stopPropagation(); const r = host.current?.getBoundingClientRect(); if (r) drag.current = { kind: 'signature', offsetX: (e.clientX - r.left) / r.width - s.p.x, offsetY: (e.clientY - r.top) / r.height - s.p.y }; e.currentTarget.setPointerCapture(e.pointerId); } }} onPointerMove={e => s.draft && updateSignature(e)} onPointerUp={e => { drag.current = null; if (s.draft && e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}><img src={s.src} alt={`ลายเซ็น ${s.name}`} draggable={false} className="block h-auto w-full" /></div>
        {s.commentImage && s.cp?.page === page && !(s.draft && s.commentImage) && <div className="pointer-events-none absolute z-20" style={{ left: `${s.cp.x * 100}%`, top: `${s.cp.y * 100}%`, width: `${s.cp.width * 100}%`, minHeight: `${s.cp.height * 100}%` }}><img src={s.commentImage} alt="ลายมือบนเอกสาร" draggable={false} className="block h-auto w-full" /></div>}
        {(s.checkmarks?.noted || s.checkmarks?.approved) && s.mp?.page === page && <div className={`absolute z-20 px-1 text-lg leading-none text-slate-900 ${s.draft ? 'pointer-events-auto cursor-move touch-none select-none' : 'pointer-events-none'}`} style={{ left: `${s.mp.x * 100}%`, top: `${s.mp.y * 100}%`, width: `${s.mp.width * 100}%`, minHeight: `${s.mp.height * 100}%`, touchAction: 'none' }} onClick={e => e.stopPropagation()} onPointerDown={e => { if (s.draft) { e.stopPropagation(); const r = host.current?.getBoundingClientRect(); if (r) drag.current = { kind: 'checkmarks', offsetX: (e.clientX - r.left) / r.width - s.mp!.x, offsetY: (e.clientY - r.top) / r.height - s.mp!.y }; e.currentTarget.setPointerCapture(e.pointerId); } }} onPointerMove={e => s.draft && updateAnnotation('checkmarks', e)} onPointerUp={e => { drag.current = null; if (s.draft && e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}>✔</div>}
        {(s.checkmarks?.noted || s.checkmarks?.approved) && !s.mp && <div className="pointer-events-none absolute px-1 text-lg leading-none text-slate-900" style={{ left: `${s.p.x * 100}%`, top: `${(s.p.y + s.p.height + 0.01) * 100}%` }}>✔</div>}
      </div>)}
      {savedTexts.map((saved, index) => <div key={`text-${index}`} className="pointer-events-none absolute z-20 whitespace-pre-wrap px-1 leading-tight text-slate-700" style={{ left: `${saved.placement.x * 100}%`, top: `${saved.placement.y * 100}%`, width: `${saved.placement.width * 100}%`, minHeight: `${saved.placement.height * 100}%`, fontFamily: "'TH SarabunPSK', 'Sarabun', sans-serif", fontSize: `${saved.placement.fontSize ?? 16}pt` }}>{saved.text}</div>)}
      {draftComment && draftTextPlacement?.page === page && <div className="absolute z-20 whitespace-pre-wrap px-1 leading-tight text-slate-700 pointer-events-auto cursor-move touch-none select-none" style={{ left: `${draftTextPlacement.x * 100}%`, top: `${draftTextPlacement.y * 100}%`, width: `${draftTextPlacement.width * 100}%`, minHeight: `${draftTextPlacement.height * 100}%`, fontFamily: "'TH SarabunPSK', 'Sarabun', sans-serif", fontSize: `${draftTextPlacement.fontSize ?? 16}pt`, touchAction: 'none' }} onClick={e => e.stopPropagation()} onPointerDown={e => { e.stopPropagation(); const r = host.current?.getBoundingClientRect(); if (r) drag.current = { kind: 'text', offsetX: (e.clientX - r.left) / r.width - draftTextPlacement.x, offsetY: (e.clientY - r.top) / r.height - draftTextPlacement.y }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => updateAnnotation('text', e)} onPointerUp={e => { drag.current = null; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}>{draftComment}</div>}
    </div></section>;
}

export function DocumentSigningViewer({ item, userId, onClose, onSaved }: {
  item: DocumentWorkflow; userId: string; onClose: () => void; onSaved: (item: DocumentWorkflow) => void;
}) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState('');
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [draft, setDraft] = useState<Placement | null>(null);
  const [commentPlacement, setCommentPlacement] = useState<AnnotationPlacement | null>(null);
  const [textPlacement, setTextPlacement] = useState<AnnotationPlacement | null>(null);
  const [checkmarksPlacement, setCheckmarksPlacement] = useState<AnnotationPlacement | null>(null);
  const [placementMode, setPlacementMode] = useState<'signature' | 'text' | 'checkmarks' | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [comment, setComment] = useState('');
  const [commentImage, setCommentImage] = useState('');
  const [commentPage, setCommentPage] = useState<number | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [inkTool, setInkTool] = useState<'pen' | 'eraser'>('pen');
  const [penSize, setPenSize] = useState(2);
  const [commentFontSize, setCommentFontSize] = useState(16);
  const [checkmarks, setCheckmarks] = useState({ noted: false, approved: false });
  const pad = useRef<HTMLCanvasElement>(null);
  const commentPad = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const ink = useRef(false);
  const commentDrawing = useRef(false);
  const commentInk = useRef(false);
  const canSign = ['pending', 'in_review'].includes(item.status) && item.signers.some(s => s.userId === userId && s.step === item.currentStep && s.status === 'pending');
  const placeDraft = (placement: Placement) => {
    setDraft(placement);
    setCommentPlacement(previous => previous?.page === placement.page ? previous : null);
    setCheckmarksPlacement(previous => previous?.page === placement.page ? previous : {
      page: placement.page, x: Math.max(0, Math.min(1 - 0.05, placement.x)), y: Math.min(1 - 0.05, placement.y + placement.height + 0.01), width: 0.05, height: 0.05,
    });
    setConfirmed(false);
  };
  const placeAnnotation = (kind: 'text' | 'checkmarks', placement: AnnotationPlacement) => {
    if (kind === 'text') setTextPlacement({ ...placement, fontSize: commentFontSize });
    else setCheckmarksPlacement(placement);
    setPlacementMode(null);
    setConfirmed(false);
  };
  const uploadSignature = async (file: File) => {
    setError('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('กรุณาเลือกรูปลายเซ็น PNG, JPG หรือ WebP'); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('กรุณาเลือกรูปขนาดไม่เกิน 10 MB'); return;
    }
    setUploadingSignature(true);
    const url = URL.createObjectURL(file);
    try {
      const source = new Image();
      await new Promise<void>((resolve, reject) => {
        source.onload = () => resolve();
        source.onerror = () => reject(new Error('อ่านรูปไม่สำเร็จ กรุณาเลือกรูปใหม่'));
        source.src = url;
      });
      const normalized = document.createElement('canvas');
      normalized.width = 600; normalized.height = 200;
      const context = normalized.getContext('2d');
      if (!context || !source.naturalWidth || !source.naturalHeight) throw new Error('ไม่สามารถเตรียมรูปลายเซ็นได้');
      // Match the API dimensions without stretching the uploaded image.
      const scale = Math.min(600 / source.naturalWidth, 200 / source.naturalHeight);
      const width = source.naturalWidth * scale, height = source.naturalHeight * scale;
      context.drawImage(source, (600 - width) / 2, (200 - height) / 2, width, height);
      const data = normalized.toDataURL('image/png');
      if (data.length > 200000) throw new Error('รูปมีรายละเอียดมากเกินไป กรุณาครอบรูปให้เหลือเฉพาะลายเซ็นแล้วเลือกใหม่');
      if (!pad.current) return;
      const preview = pad.current.getContext('2d');
      preview?.clearRect(0, 0, 600, 200);
      preview?.drawImage(normalized, 0, 0);
      ink.current = true;
      setImage(data);
      setDrawMode(false);
      setPlacementMode('signature');
      setConfirmed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'อัปโหลดรูปลายเซ็นไม่สำเร็จ');
    } finally {
      URL.revokeObjectURL(url);
      setUploadingSignature(false);
    }
  };
  const downloadSignedPdf = async () => {
    if (!pdf) throw new Error('กำลังเตรียมเอกสาร กรุณารอสักครู่');
    await document.fonts.load('16pt "TH SarabunPSK"');
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
        if (signer.commentImage) {
          const commentSignature = new Image();
          await new Promise<void>((resolve, reject) => { commentSignature.onload = () => resolve(); commentSignature.onerror = () => reject(new Error('อ่านลายมือไม่สำเร็จ')); commentSignature.src = signer.commentImage!; });
          const cp = signer.commentPlacement?.page === pageNumber ? signer.commentPlacement : { ...placement, y: Math.max(0, placement.y - 0.07), height: 0.06, width: 0.52 };
          context.drawImage(commentSignature, cp.x * canvas.width, cp.y * canvas.height, cp.width * canvas.width, cp.height * canvas.height);
        }
        const labels = (signer.checkmarks?.noted || signer.checkmarks?.approved) ? ['✔'] : [];
        const mp = signer.checkmarksPlacement?.page === pageNumber ? signer.checkmarksPlacement : { ...placement, y: Math.min(1 - 0.05, placement.y + placement.height + 0.01), width: 0.05, height: 0.05 };
        labels.forEach(() => { const bx = mp.x * canvas.width; const by = Math.min(canvas.height - fontSize, mp.y * canvas.height + fontSize); context.fillText('✔', bx, by); });
      }
      for (const signer of item.signers.filter(s => !!s.comment)) {
        const tp = signer.textPlacement || (!signer.commentImage ? signer.commentPlacement : undefined) || (signer.placement ? { ...signer.placement, y: Math.max(0, signer.placement.y - 0.07), height: 0.06, fontSize: 16 } : undefined);
        if (!tp || tp.page !== pageNumber) continue;
        const commentSize = Math.max(8, Math.min(32, tp.fontSize ?? 16));
        context.font = `${commentSize}pt "TH SarabunPSK", "Sarabun", sans-serif`;
        context.fillStyle = '#263238';
        context.fillText(signer.comment!.slice(0, 120), tp.x * canvas.width, Math.min(canvas.height - commentSize, tp.y * canvas.height + commentSize * 1.35));
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
    if (action === 'sign' && comment.trim() && !textPlacement) { setError('กรุณาเลือกตำแหน่งข้อความบน PDF'); return; }
    if (action === 'reject' && !comment.trim() && !commentImage) { setError('กรุณาเขียนเหตุผลที่ส่งกลับ'); return; }
    setBusy(true); setError('');
    try {
      const placement = draft ? { ...draft, commentPlacement: commentImage ? commentPlacement || undefined : undefined, textPlacement: comment.trim() ? textPlacement || undefined : undefined, checkmarksPlacement: (checkmarks.noted || checkmarks.approved) ? checkmarksPlacement || undefined : undefined } : draft;
      const updated = action === 'sign' ? await documentWorkflowsApi.sign(item.id, image, placement!, comment, checkmarks, commentImage) : await documentWorkflowsApi.reject(item.id, comment, commentImage);
      setDraft(null); setCommentPlacement(null); setTextPlacement(null); setCheckmarksPlacement(null); setImage(''); setConfirmed(false); setComment(''); setCommentImage(''); setCheckmarks({ noted: false, approved: false });
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
          {pdf && Array.from({ length: pdf.numPages }, (_, i) => <PdfPage key={i} pdf={pdf} page={i + 1} marks={item.signers} draft={draft} image={image} draftComment={comment} draftCommentImage={commentImage} draftCheckmarks={checkmarks} draftCommentPlacement={commentPlacement} draftTextPlacement={textPlacement} draftCheckmarksPlacement={checkmarksPlacement} placementMode={placementMode === 'signature' ? undefined : placementMode || undefined} drawMode={canSign && drawMode} inkTool={inkTool} penSize={penSize} onDraw={(page, data) => { setCommentPage(page); setCommentImage(data); setCommentPlacement({ page, x: 0, y: 0, width: 1, height: 1 }); setConfirmed(false); }} onPlace={canSign && image && placementMode === 'signature' ? p => { placeDraft(p); setPlacementMode(null); } : undefined} onPlaceAnnotation={canSign && ((placementMode === 'text' && !!comment.trim()) || placementMode === 'checkmarks') ? placeAnnotation : undefined} onMoveSignature={p => { setDraft(p); setConfirmed(false); }} onMoveAnnotation={(kind, p) => { if (kind === 'text') setTextPlacement(p); else setCheckmarksPlacement(p); setConfirmed(false); }} />)}
        </div>
        <aside className="space-y-4 overflow-auto border-l p-4">
          <h3 className="font-bold">ลำดับผู้ลงนาม</h3>
          <div className="space-y-2">{item.signers.map(s => <div key={s.step} className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-sm"><div>{s.step}. {s.userName}</div><span className="block text-xs text-indigo-600">{s.status === 'signed' ? `ลงนามแล้ว ${s.signedAt || ''}` : s.status === 'rejected' ? 'ส่งกลับ' : s.step === item.currentStep ? 'รอลงนาม' : 'รอคิว'}</span>{s.comment && <span className="mt-1 block text-xs text-slate-500">หมายเหตุ: {s.comment}</span>}</div>)}</div>
          {canSign && pdf && <>
            <h3 className="font-bold text-indigo-700">1. วาดหรืออัปโหลดรูปลายเซ็น</h3>
            <label className="block rounded-lg border border-indigo-200 p-3 text-sm text-indigo-700">
              <span className="font-semibold">{uploadingSignature ? 'กำลังเตรียมรูปลายเซ็น…' : 'อัปโหลดรูปลายเซ็น'}</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" aria-label="อัปโหลดรูปลายเซ็น" disabled={busy || uploadingSignature} className="mt-2 block w-full text-xs" onChange={e => { const file = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (file) void uploadSignature(file); }} />
              <span className="mt-2 block text-xs text-slate-500">PNG, JPG หรือ WebP ไม่เกิน 10 MB แนะนำครอบภาพเฉพาะลายเซ็น หรือใช้ PNG พื้นหลังโปร่งใส เลือกรูปแล้วแตะตำแหน่งบน PDF จากนั้นลากและปรับขนาดได้</span>
            </label>
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
            <label className="block text-sm">ขนาดลายเซ็น<input aria-label="ขนาดลายเซ็น" type="range" min="0.1" max="0.45" step="0.01" value={draft?.width ?? 0.25} disabled={!draft} onChange={e => { const width = Number(e.target.value); setDraft(p => p ? { ...p, width, height: p.height * width / p.width, x: Math.min(p.x, 1 - width), y: Math.min(p.y, 1 - p.height * width / p.width) } : p); setConfirmed(false); }} className="w-full" /></label>
            <button className="text-sm text-rose-600" onClick={() => { pad.current?.getContext('2d')?.clearRect(0, 0, 600, 200); ink.current = false; setImage(''); setDraft(null); setCommentPlacement(null); setCheckmarksPlacement(null); setConfirmed(false); }}>ล้างลายเซ็น</button>
            <h3 className="font-bold text-indigo-700">2. วางลายเซ็นหรือเขียนบนเอกสาร</h3>
            <p className="text-xs text-slate-600">เลือกลายเซ็นเพื่อวางตำแหน่ง หรือเปิดปากกาแล้วเขียนและติ๊กลงบนหน้า PDF ได้โดยตรง</p>
            <div>
              <button type="button" disabled={!image} onClick={() => setPlacementMode('signature')} className={`rounded-lg border px-2 py-1.5 text-xs font-semibold ${placementMode === 'signature' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-indigo-200 text-indigo-700'}`}>เซ็น</button>
            </div>
            <button type="button" onClick={() => { setDrawMode(previous => !previous); setPlacementMode(null); }} className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold ${drawMode ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-indigo-200 text-indigo-700'}`}>{drawMode ? 'ปิดปากกา' : 'เปิดปากกาเขียนตรงบน PDF'}</button>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setInkTool('pen'); setDrawMode(true); setPlacementMode(null); }} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${drawMode && inkTool === 'pen' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-indigo-200 text-indigo-700'}`}>ปากกา</button>
              <button type="button" onClick={() => { setInkTool('eraser'); setDrawMode(true); setPlacementMode(null); }} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${drawMode && inkTool === 'eraser' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-indigo-200 text-indigo-700'}`}>ยางลบ</button>
            </div>
            <label className="block text-sm">ความหนาของลายมือ<input aria-label="ความหนาของลายมือ" type="range" min="1" max="8" step="1" value={penSize} onChange={e => setPenSize(Number(e.target.value))} className="w-full" /></label>
            <div className="space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
              <label className="block text-sm font-semibold text-slate-700">ข้อความบนเอกสาร<textarea value={comment} onChange={e => { const text = e.target.value; setComment(text); setTextPlacement(previous => { if (!previous) return previous; const width = estimateTextWidth(text, previous.fontSize ?? commentFontSize); return { ...previous, width, x: Math.min(previous.x, 1 - width) }; }); setConfirmed(false); }} placeholder="พิมพ์ข้อความที่ต้องการวางบนกระดาษ" rows={3} className="mt-1 w-full rounded-lg border border-indigo-200 bg-white p-2 font-['TH_SarabunPSK','Sarabun',sans-serif] text-[16pt] font-normal outline-none focus:border-indigo-500" /></label>
              <label className="block text-sm">ขนาดตัวอักษร ({commentFontSize} pt)<input aria-label="ขนาดตัวอักษร" type="range" min="8" max="32" step="1" value={commentFontSize} onChange={e => { const fontSize = Number(e.target.value); setCommentFontSize(fontSize); setTextPlacement(previous => { if (!previous) return previous; const width = estimateTextWidth(comment, fontSize); return { ...previous, fontSize, width, x: Math.min(previous.x, 1 - width) }; }); setConfirmed(false); }} className="w-full" /></label>
              <button type="button" disabled={!comment.trim()} onClick={() => { setDrawMode(false); setPlacementMode('text'); }} className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-40 ${placementMode === 'text' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-indigo-200 bg-white text-indigo-700'}`}>เลือกตำแหน่งข้อความบน PDF</button>
              <p className="text-xs text-slate-500">พิมพ์ข้อความ แล้วกดปุ่มนี้และแตะตำแหน่งใดก็ได้บน PDF จากนั้นลากได้ทั่วหน้า รวมถึงชิดขวา โดยไม่กระทบลายเซ็น</p>
            </div>
            {draft && <p className="rounded-lg bg-indigo-50 p-2 text-sm">เลือกตำแหน่งหน้า {draft.page} แล้ว</p>}
            <label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={!draft || !image} />ฉันตรวจเอกสารและยืนยันลงนาม ณ ตำแหน่งนี้</label>
            <button disabled={busy || !confirmed || !draft || !image} onClick={() => void submit('sign')} className="w-full rounded-xl bg-indigo-600 p-3 font-bold text-white disabled:opacity-40">{busy ? 'กำลังบันทึก…' : 'บันทึกลายเซ็นและดำเนินการต่อ'}</button>
            <button disabled={busy} onClick={() => void submit('reject')} className="w-full rounded-xl border border-rose-200 p-2 text-rose-600">ส่งกลับให้แก้ไข</button>
          </>}
        </aside>
      </div>
    </div>
  </div>;
}
