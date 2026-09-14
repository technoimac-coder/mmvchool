'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Download } from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { DocumentWorkflow, DocumentWorkflowSigner } from '../types';
import { documentWorkflowsApi } from '../lib/api';

const PEN_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath d='M3 29l2.2-7.1L23.8 3.3a2.8 2.8 0 014 4L9.2 25.9z' fill='%23fff' stroke='%231e293b' stroke-width='1.6' stroke-linejoin='round'/%3E%3Cpath d='M5.2 21.9l4 4M21.6 5.5l4 4M3 29l6.2-3.1-4-4z' fill='%234f46e5' stroke='%231e293b' stroke-width='1.2'/%3E%3C/svg%3E") 3 29, crosshair`;
const ERASER_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cg transform='rotate(-42 16 16)'%3E%3Crect x='6' y='10' width='20' height='13' rx='3' fill='%23f9a8d4' stroke='%231e293b' stroke-width='1.6'/%3E%3Cpath d='M18 10v13' stroke='%231e293b' stroke-width='1.4'/%3E%3Cpath d='M18 11h5a2 2 0 012 2v7a2 2 0 01-2 2h-5z' fill='%23fff'/%3E%3C/g%3E%3C/svg%3E") 16 16, cell`;

type Placement = NonNullable<DocumentWorkflowSigner['placement']>;
type TextAlign = 'left' | 'center' | 'right';
type AnnotationPlacement = NonNullable<DocumentWorkflowSigner['commentPlacement']> & { fontSize?: number; textAlign?: TextAlign };
type TextAnnotation = { text: string; placement: AnnotationPlacement };

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

function PdfPage({ pdf, page, marks, draftSignatures, image, draftTextAnnotations, draftCommentImage, draftCheckmarks, draftCommentPlacement, draftCheckmarksPlacement, placementMode, drawMode, inkTool = 'pen', penSize = 2, defaultSignatureWidth = 0.25, defaultTextWidth = 0.42, defaultTextAlign = 'left', defaultTextFontSize = 16, onDraw, onPlace, onPlaceAnnotation, onMoveAnnotation, onMoveSignature }: {
  pdf: PDFDocumentProxy; page: number; marks: DocumentWorkflowSigner[];
  draftSignatures: Placement[]; image: string; draftTextAnnotations: TextAnnotation[]; draftCommentImage?: string; draftCheckmarks?: { noted?: boolean; approved?: boolean }; draftCommentPlacement?: AnnotationPlacement | null; draftCheckmarksPlacement?: AnnotationPlacement | null; placementMode?: 'text' | 'checkmarks'; drawMode?: boolean; inkTool?: 'pen' | 'eraser'; penSize?: number; defaultSignatureWidth?: number; defaultTextWidth?: number; defaultTextAlign?: TextAlign; defaultTextFontSize?: number; onDraw?: (page: number, image: string) => void; onPlace?: (p: Placement) => void; onPlaceAnnotation?: (kind: 'text' | 'checkmarks', p: AnnotationPlacement) => void; onMoveAnnotation?: (kind: 'text' | 'checkmarks', index: number, p: AnnotationPlacement) => void; onMoveSignature?: (index: number, p: Placement) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const inkCanvas = useRef<HTMLCanvasElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(0.707);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const drawing = useRef(false);
  const drag = useRef<{ kind: 'signature' | 'text' | 'checkmarks'; index: number; offsetX: number; offsetY: number } | null>(null);
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
  const overlays = marks.flatMap(s => {
    if (!s.signatureData?.startsWith('data:image/png;base64,')) return [];
    const placements = s.placements?.length ? s.placements : s.placement ? [s.placement] : [];
    return placements.filter(p => p.page === page).map((p, index) => ({ p, src: s.signatureData!, name: s.userName, commentImage: index === 0 ? s.commentImage : undefined, checkmarks: index === 0 ? s.checkmarks : undefined, cp: index === 0 ? s.commentPlacement : undefined, mp: index === 0 ? s.checkmarksPlacement : undefined, draft: false, index }));
  });
  draftSignatures.forEach((p, index) => { if (p.page === page && image) overlays.push({ p, src: image, name: 'ตำแหน่งลายเซ็นของคุณ (ยังไม่บันทึก)', commentImage: index === 0 && draftCommentPlacement?.page === page ? draftCommentImage : undefined, checkmarks: index === 0 ? draftCheckmarks : undefined, cp: index === 0 && draftCommentPlacement?.page === page ? draftCommentPlacement : undefined, mp: index === 0 && draftCheckmarksPlacement?.page === page ? draftCheckmarksPlacement : undefined, draft: true, index }); });
  const savedTexts = marks.flatMap(s => {
    if (s.textAnnotations?.length) return s.textAnnotations.filter(annotation => annotation.placement.page === page);
    if (!s.comment) return [];
    const placement: AnnotationPlacement | undefined = s.textPlacement || (!s.commentImage ? s.commentPlacement : undefined) || (s.placement ? { ...s.placement, y: Math.max(0, s.placement.y - 0.07), height: 0.06, fontSize: 16 } : undefined);
    return placement?.page === page ? [{ text: s.comment, placement }] : [];
  });
  const updateAnnotation = (kind: 'text' | 'checkmarks', index: number, current: AnnotationPlacement, e: ReactPointerEvent<HTMLDivElement>) => {
    if (!onMoveAnnotation || drag.current?.kind !== kind) return;
    const r = host.current?.getBoundingClientRect();
    if (!r || !current) return;
    const { offsetX, offsetY } = drag.current;
    onMoveAnnotation(kind, index, { ...current, x: Math.max(0, Math.min(1 - current.width, (e.clientX - r.left) / r.width - offsetX)), y: Math.max(0, Math.min(1 - current.height, (e.clientY - r.top) / r.height - offsetY)) });
  };
  const updateSignature = (index: number, current: Placement, e: ReactPointerEvent<HTMLDivElement>) => {
    if (!onMoveSignature || drag.current?.kind !== 'signature') return;
    const r = host.current?.getBoundingClientRect(); if (!r) return;
    const { offsetX, offsetY } = drag.current;
    onMoveSignature(index, { ...current, x: Math.max(0, Math.min(1 - current.width, (e.clientX - r.left) / r.width - offsetX)), y: Math.max(0, Math.min(1 - current.height, (e.clientY - r.top) / r.height - offsetY)) });
  };
  return <section className="mb-5"><p className="mb-2 text-center text-xs text-slate-600">หน้า {page} / {pdf.numPages}</p>
    <div ref={host} className="relative mx-auto bg-white shadow" style={{ aspectRatio: ratio }}
      onClick={e => {
        if (!ready || (!onPlace && !onPlaceAnnotation)) return;
        const r = e.currentTarget.getBoundingClientRect();
        if (onPlaceAnnotation && placementMode) {
          const current = placementMode === 'checkmarks' ? draftCheckmarksPlacement : null;
          const width = placementMode === 'text' ? defaultTextWidth : (current?.width ?? 0.05);
          const height = current?.height ?? (placementMode === 'text' ? 0.075 : 0.05);
          onPlaceAnnotation(placementMode, { page, width, height, x: Math.max(0, Math.min(1 - width, (e.clientX - r.left) / r.width - width / 2)), y: Math.max(0, Math.min(1 - height, (e.clientY - r.top) / r.height - height / 2)), ...(placementMode === 'text' ? { fontSize: defaultTextFontSize, textAlign: defaultTextAlign } : {}) });
          return;
        }
        if (!onPlace) return;
        const width = defaultSignatureWidth;
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
        <div className={`absolute ${s.draft ? 'pointer-events-auto cursor-move touch-none select-none' : 'pointer-events-none'}`} style={{ left: `${s.p.x * 100}%`, top: `${s.p.y * 100}%`, width: `${s.p.width * 100}%`, touchAction: 'none' }} onClick={e => e.stopPropagation()} onPointerDown={e => { if (s.draft) { e.stopPropagation(); const r = host.current?.getBoundingClientRect(); if (r) drag.current = { kind: 'signature', index: s.index, offsetX: (e.clientX - r.left) / r.width - s.p.x, offsetY: (e.clientY - r.top) / r.height - s.p.y }; e.currentTarget.setPointerCapture(e.pointerId); } }} onPointerMove={e => s.draft && updateSignature(s.index, s.p, e)} onPointerUp={e => { drag.current = null; if (s.draft && e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}><img src={s.src} alt={`ลายเซ็น ${s.name}`} draggable={false} className="block h-auto w-full" /></div>
        {s.commentImage && s.cp?.page === page && !(s.draft && s.commentImage) && <div className="pointer-events-none absolute z-20" style={{ left: `${s.cp.x * 100}%`, top: `${s.cp.y * 100}%`, width: `${s.cp.width * 100}%`, minHeight: `${s.cp.height * 100}%` }}><img src={s.commentImage} alt="ลายมือบนเอกสาร" draggable={false} className="block h-auto w-full" /></div>}
        {(s.checkmarks?.noted || s.checkmarks?.approved) && s.mp?.page === page && <div className={`absolute z-20 px-1 text-lg leading-none text-slate-900 ${s.draft ? 'pointer-events-auto cursor-move touch-none select-none' : 'pointer-events-none'}`} style={{ left: `${s.mp.x * 100}%`, top: `${s.mp.y * 100}%`, width: `${s.mp.width * 100}%`, minHeight: `${s.mp.height * 100}%`, touchAction: 'none' }} onClick={e => e.stopPropagation()} onPointerDown={e => { if (s.draft) { e.stopPropagation(); const r = host.current?.getBoundingClientRect(); if (r) drag.current = { kind: 'checkmarks', index: 0, offsetX: (e.clientX - r.left) / r.width - s.mp!.x, offsetY: (e.clientY - r.top) / r.height - s.mp!.y }; e.currentTarget.setPointerCapture(e.pointerId); } }} onPointerMove={e => s.draft && updateAnnotation('checkmarks', 0, s.mp!, e)} onPointerUp={e => { drag.current = null; if (s.draft && e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}>✔</div>}
        {(s.checkmarks?.noted || s.checkmarks?.approved) && !s.mp && <div className="pointer-events-none absolute px-1 text-lg leading-none text-slate-900" style={{ left: `${s.p.x * 100}%`, top: `${(s.p.y + s.p.height + 0.01) * 100}%` }}>✔</div>}
      </div>)}
      {savedTexts.map((saved, index) => <div key={`text-${index}`} className="pointer-events-none absolute z-20 whitespace-pre-wrap leading-tight text-slate-700" style={{ left: `${saved.placement.x * 100}%`, top: `${saved.placement.y * 100}%`, width: `${saved.placement.width * 100}%`, minHeight: `${saved.placement.height * 100}%`, fontFamily: "'TH SarabunPSK', 'Sarabun', sans-serif", fontSize: `${saved.placement.fontSize ?? 16}pt`, textAlign: saved.placement.textAlign ?? 'left' }}>{saved.text}</div>)}
      {draftTextAnnotations.map((annotation, index) => annotation.placement.page === page && <div key={`draft-text-${index}`} className="absolute z-20 whitespace-pre-wrap leading-tight text-slate-700 pointer-events-auto cursor-move touch-none select-none rounded border border-dashed border-indigo-400 bg-white/20" style={{ left: `${annotation.placement.x * 100}%`, top: `${annotation.placement.y * 100}%`, width: `${annotation.placement.width * 100}%`, minHeight: `${annotation.placement.height * 100}%`, fontFamily: "'TH SarabunPSK', 'Sarabun', sans-serif", fontSize: `${annotation.placement.fontSize ?? 16}pt`, textAlign: annotation.placement.textAlign ?? 'left', touchAction: 'none' }} onClick={e => e.stopPropagation()} onPointerDown={e => { e.stopPropagation(); const r = host.current?.getBoundingClientRect(); if (r) drag.current = { kind: 'text', index, offsetX: (e.clientX - r.left) / r.width - annotation.placement.x, offsetY: (e.clientY - r.top) / r.height - annotation.placement.y }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => updateAnnotation('text', index, annotation.placement, e)} onPointerUp={e => { drag.current = null; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}>{annotation.text}</div>)}
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
  const [draftSignatures, setDraftSignatures] = useState<Placement[]>([]);
  const [signatureSize, setSignatureSize] = useState(0.25);
  const [commentPlacement, setCommentPlacement] = useState<AnnotationPlacement | null>(null);
  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([]);
  const [selectedTextIndex, setSelectedTextIndex] = useState<number | null>(null);
  const [checkmarksPlacement, setCheckmarksPlacement] = useState<AnnotationPlacement | null>(null);
  const [placementMode, setPlacementMode] = useState<'signature' | 'text' | 'checkmarks' | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [comment, setComment] = useState('');
  const [commentImage, setCommentImage] = useState('');
  const [drawMode, setDrawMode] = useState(false);
  const [inkTool, setInkTool] = useState<'pen' | 'eraser'>('pen');
  const [penSize, setPenSize] = useState(2);
  const [commentFontSize, setCommentFontSize] = useState(16);
  const [commentBoxWidth, setCommentBoxWidth] = useState(0.42);
  const [commentTextAlign, setCommentTextAlign] = useState<TextAlign>('left');
  const [checkmarks, setCheckmarks] = useState({ noted: false, approved: false });
  const pad = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const ink = useRef(false);
  const canSign = ['pending', 'in_review'].includes(item.status) && item.signers.some(s => s.userId === userId && s.step === item.currentStep && s.status === 'pending');
  const placeDraft = (placement: Placement) => {
    setDraftSignatures(previous => [...previous, placement]);
    setCommentPlacement(previous => previous?.page === placement.page ? previous : null);
    setCheckmarksPlacement(previous => previous?.page === placement.page ? previous : {
      page: placement.page, x: Math.max(0, Math.min(1 - 0.05, placement.x)), y: Math.min(1 - 0.05, placement.y + placement.height + 0.01), width: 0.05, height: 0.05,
    });
    setConfirmed(false);
  };
  const placeAnnotation = (kind: 'text' | 'checkmarks', placement: AnnotationPlacement) => {
    if (kind === 'text') {
      const annotation = { text: comment.trim(), placement: { ...placement, fontSize: commentFontSize, textAlign: commentTextAlign } };
      setSelectedTextIndex(textAnnotations.length);
      setTextAnnotations(previous => [...previous, annotation]);
    } else setCheckmarksPlacement(placement);
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
      for (const signer of item.signers.filter(s => s.signatureData?.startsWith('data:image/png;base64,'))) {
        const signature = new Image();
        await new Promise<void>((resolve, reject) => { signature.onload = () => resolve(); signature.onerror = () => reject(new Error('อ่านลายเซ็นไม่สำเร็จ')); signature.src = signer.signatureData!; });
        const signaturePlacements = (signer.placements?.length ? signer.placements : signer.placement ? [signer.placement] : []).filter(placement => placement.page === pageNumber);
        for (const placement of signaturePlacements) context.drawImage(signature, placement.x * canvas.width, placement.y * canvas.height, placement.width * canvas.width, placement.height * canvas.height);
        const placement = signaturePlacements[0];
        if (!placement) continue;
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
      for (const signer of item.signers) {
        const annotations: TextAnnotation[] = signer.textAnnotations?.length ? signer.textAnnotations : signer.comment ? [{ text: signer.comment, placement: signer.textPlacement || (!signer.commentImage ? signer.commentPlacement : undefined) || (signer.placement ? { ...signer.placement, y: Math.max(0, signer.placement.y - 0.07), height: 0.06, fontSize: 16 } : { page: 0, x: 0, y: 0, width: 0, height: 0 }) }] : [];
        for (const annotation of annotations.filter(value => value.placement.page === pageNumber)) {
          const tp = annotation.placement;
          const commentSize = Math.max(8, Math.min(32, tp.fontSize ?? 16));
          context.font = `${commentSize}pt "TH SarabunPSK", "Sarabun", sans-serif`;
          context.fillStyle = '#263238';
          const textAlign = tp.textAlign ?? 'left';
          const textX = textAlign === 'right' ? (tp.x + tp.width) * canvas.width : textAlign === 'center' ? (tp.x + tp.width / 2) * canvas.width : tp.x * canvas.width;
          context.textAlign = textAlign;
          annotation.text.slice(0, 500).split(/\r?\n/).forEach((line, lineIndex) => context.fillText(line, textX, Math.min(canvas.height - commentSize, tp.y * canvas.height + commentSize * 1.35 + lineIndex * commentSize * 1.15)));
        }
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
    if (action === 'sign' && (!pdf || !image || draftSignatures.length === 0 || !confirmed)) return;
    if (action === 'sign' && textAnnotations.some(annotation => !annotation.text.trim())) { setError('กรุณากรอกข้อความให้ครบ หรือลบรายการข้อความที่ว่าง'); return; }
    if (action === 'reject' && !comment.trim() && !commentImage) { setError('กรุณาเขียนเหตุผลที่ส่งกลับ'); return; }
    setBusy(true); setError('');
    try {
      const primary = draftSignatures[0];
      const placement = primary ? { ...primary, commentPlacement: commentImage ? commentPlacement || undefined : undefined, textPlacement: textAnnotations[0]?.placement, checkmarksPlacement: (checkmarks.noted || checkmarks.approved) ? checkmarksPlacement || undefined : undefined } : primary;
      const legacyComment = textAnnotations[0]?.text ?? '';
      const updated = action === 'sign' ? await documentWorkflowsApi.sign(item.id, image, placement!, legacyComment, checkmarks, commentImage, draftSignatures, textAnnotations) : await documentWorkflowsApi.reject(item.id, comment, commentImage);
      setDraftSignatures([]); setCommentPlacement(null); setTextAnnotations([]); setSelectedTextIndex(null); setCheckmarksPlacement(null); setImage(''); setConfirmed(false); setComment(''); setCommentImage(''); setCheckmarks({ noted: false, approved: false });
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
          {pdf && Array.from({ length: pdf.numPages }, (_, i) => <PdfPage key={i} pdf={pdf} page={i + 1} marks={item.signers} draftSignatures={draftSignatures} image={image} draftTextAnnotations={textAnnotations} draftCommentImage={commentImage} draftCheckmarks={checkmarks} draftCommentPlacement={commentPlacement} draftCheckmarksPlacement={checkmarksPlacement} placementMode={placementMode === 'signature' ? undefined : placementMode || undefined} drawMode={canSign && drawMode} inkTool={inkTool} penSize={penSize} defaultSignatureWidth={signatureSize} defaultTextWidth={commentBoxWidth} defaultTextAlign={commentTextAlign} defaultTextFontSize={commentFontSize} onDraw={(page, data) => { setCommentImage(data); setCommentPlacement({ page, x: 0, y: 0, width: 1, height: 1 }); setConfirmed(false); }} onPlace={canSign && image && placementMode === 'signature' ? p => { placeDraft(p); setPlacementMode(null); } : undefined} onPlaceAnnotation={canSign && ((placementMode === 'text' && !!comment.trim()) || placementMode === 'checkmarks') ? placeAnnotation : undefined} onMoveSignature={(index, p) => { setDraftSignatures(previous => previous.map((value, currentIndex) => currentIndex === index ? p : value)); setConfirmed(false); }} onMoveAnnotation={(kind, index, p) => { if (kind === 'text') { setTextAnnotations(previous => previous.map((value, currentIndex) => currentIndex === index ? { ...value, placement: p } : value)); setSelectedTextIndex(index); } else setCheckmarksPlacement(p); setConfirmed(false); }} />)}
        </div>
        <aside className="space-y-4 overflow-auto border-l p-4">
          <h3 className="font-bold">ลำดับผู้ลงนาม</h3>
          <div className="space-y-2">{item.signers.map(s => <div key={s.step} className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-sm"><div>{s.step}. {s.userName}</div><span className="block text-xs text-indigo-600">{s.status === 'signed' ? `ลงนามแล้ว ${s.signedAt || ''}` : s.status === 'rejected' ? 'ส่งกลับ' : s.step === item.currentStep ? 'รอลงนาม' : 'รอคิว'}</span>{s.comment && <span className="mt-1 block text-xs text-slate-500">หมายเหตุ: {s.comment}</span>}</div>)}</div>
          {canSign && pdf && <>
            <h3 className="font-bold text-indigo-700">1. วาดหรืออัปโหลดรูปลายเซ็น</h3>
            <label className="block rounded-lg border border-indigo-200 p-3 text-sm text-indigo-700">
              <span className="font-semibold">{uploadingSignature ? 'กำลังเตรียมรูปลายเซ็น…' : 'อัปโหลดรูปลายเซ็น'}</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" aria-label="อัปโหลดรูปลายเซ็น" disabled={busy || uploadingSignature} className="mt-2 block w-full text-xs" onChange={e => { const file = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (file) void uploadSignature(file); }} />
              <span className="mt-2 block text-xs text-slate-500">PNG, JPG หรือ WebP ไม่เกิน 10 MB เลือกได้ทุกขนาด ระบบจะปรับเป็น 600 × 200 พิกเซลให้อัตโนมัติ หากชนิดหรือขนาดไฟล์ไม่ผ่าน ระบบจะไม่รับไฟล์และแจ้งเหตุผลทันที</span>
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
            <label className="block text-sm">ขนาดลายเซ็น ({Math.round(signatureSize * 100)}%)<input aria-label="ขนาดลายเซ็น" type="range" min="0.1" max="0.45" step="0.01" value={signatureSize} onChange={e => { setSignatureSize(Number(e.target.value)); setConfirmed(false); }} className="w-full" /></label>
            <button className="text-sm text-rose-600" onClick={() => { pad.current?.getContext('2d')?.clearRect(0, 0, 600, 200); ink.current = false; setImage(''); setDraftSignatures([]); setCommentPlacement(null); setCheckmarksPlacement(null); setConfirmed(false); }}>ล้างลายเซ็นและตำแหน่งทั้งหมด</button>
            <h3 className="font-bold text-indigo-700">2. วางลายเซ็นหรือเขียนบนเอกสาร</h3>
            <p className="text-xs text-slate-600">เลือกลายเซ็นเพื่อวางตำแหน่ง หรือเปิดปากกาแล้วเขียนและติ๊กลงบนหน้า PDF ได้โดยตรง</p>
            <div>
              <button type="button" disabled={!image || draftSignatures.length >= 50} onClick={() => setPlacementMode('signature')} className={`rounded-lg border px-2 py-1.5 text-xs font-semibold ${placementMode === 'signature' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-indigo-200 text-indigo-700'}`}>+ เพิ่มลายเซ็นในเอกสาร</button>
            </div>
            {draftSignatures.length > 0 && <div className="rounded-xl bg-indigo-50 p-2 text-xs text-indigo-800"><p className="font-semibold">วางลายเซ็นแล้ว {draftSignatures.length} ตำแหน่ง</p><div className="mt-1 flex flex-wrap gap-1">{draftSignatures.map((placement, index) => <button key={`${placement.page}-${index}`} type="button" onClick={() => { setDraftSignatures(previous => previous.filter((_, currentIndex) => currentIndex !== index)); setConfirmed(false); }} className="rounded-full border border-indigo-200 bg-white px-2 py-1">หน้า {placement.page} ×</button>)}</div></div>}
            <button type="button" onClick={() => { setDrawMode(previous => !previous); setPlacementMode(null); }} className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold ${drawMode ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-indigo-200 text-indigo-700'}`}>{drawMode ? 'ปิดปากกา' : 'เปิดปากกาเขียนตรงบน PDF'}</button>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setInkTool('pen'); setDrawMode(true); setPlacementMode(null); }} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${drawMode && inkTool === 'pen' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-indigo-200 text-indigo-700'}`}>ปากกา</button>
              <button type="button" onClick={() => { setInkTool('eraser'); setDrawMode(true); setPlacementMode(null); }} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${drawMode && inkTool === 'eraser' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-indigo-200 text-indigo-700'}`}>ยางลบ</button>
            </div>
            <label className="block text-sm">ความหนาของลายมือ<input aria-label="ความหนาของลายมือ" type="range" min="1" max="8" step="1" value={penSize} onChange={e => setPenSize(Number(e.target.value))} className="w-full" /></label>
            <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600">ลายมือที่เขียนบน PDF บันทึกเป็น PNG ตามขนาดหน้ากระดาษอัตโนมัติ รองรับด้านละ 100–4,096 พิกเซล และไม่เกิน 2 MB หากเกินกำหนดระบบจะไม่บันทึกและแจ้งให้เขียนใหม่</p>
            <div className="space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
              <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-slate-700">{selectedTextIndex === null ? 'ข้อความใหม่บนเอกสาร' : `แก้ไขข้อความรายการที่ ${selectedTextIndex + 1}`}</span>{selectedTextIndex !== null && <button type="button" onClick={() => { setSelectedTextIndex(null); setComment(''); }} className="text-xs font-semibold text-indigo-700">+ ข้อความใหม่</button>}</div>
              <textarea aria-label="ข้อความบนเอกสาร" value={comment} onChange={e => { const text = e.target.value; setComment(text); if (selectedTextIndex !== null) setTextAnnotations(previous => previous.map((annotation, index) => index === selectedTextIndex ? { ...annotation, text } : annotation)); setConfirmed(false); }} placeholder="พิมพ์ข้อความที่ต้องการวางบนกระดาษ" rows={3} className="w-full rounded-lg border border-indigo-200 bg-white p-2 font-['TH_SarabunPSK','Sarabun',sans-serif] text-[16pt] font-normal outline-none focus:border-indigo-500" />
              <label className="block text-sm">ขนาดตัวอักษร ({commentFontSize} pt)<input aria-label="ขนาดตัวอักษร" type="range" min="8" max="32" step="1" value={commentFontSize} onChange={e => { const fontSize = Number(e.target.value); setCommentFontSize(fontSize); if (selectedTextIndex !== null) setTextAnnotations(previous => previous.map((value, index) => index === selectedTextIndex ? { ...value, placement: { ...value.placement, fontSize } } : value)); setConfirmed(false); }} className="w-full" /></label>
              <label className="block text-sm">ความกว้างกล่องข้อความ ({Math.round(commentBoxWidth * 100)}%)<input aria-label="ความกว้างกล่องข้อความ" type="range" min="0.15" max="0.9" step="0.01" value={commentBoxWidth} onChange={e => { const width = Number(e.target.value); setCommentBoxWidth(width); if (selectedTextIndex !== null) setTextAnnotations(previous => previous.map((value, index) => index === selectedTextIndex ? { ...value, placement: { ...value.placement, width, x: Math.min(value.placement.x, 1 - width) } } : value)); setConfirmed(false); }} className="w-full" /></label>
              <div className="grid grid-cols-3 gap-1" aria-label="การจัดแนวข้อความ">{([['left', 'ชิดซ้าย'], ['center', 'กึ่งกลาง'], ['right', 'ชิดขวา']] as Array<[TextAlign, string]>).map(([value, label]) => <button key={value} type="button" onClick={() => { setCommentTextAlign(value); if (selectedTextIndex !== null) setTextAnnotations(previous => previous.map((annotation, index) => index === selectedTextIndex ? { ...annotation, placement: { ...annotation.placement, textAlign: value } } : annotation)); setConfirmed(false); }} className={`rounded-lg border px-2 py-1.5 text-xs font-semibold ${commentTextAlign === value ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-indigo-200 bg-white text-indigo-700'}`}>{label}</button>)}</div>
              <button type="button" disabled={!comment.trim() || textAnnotations.length >= 100} onClick={() => { setDrawMode(false); setPlacementMode('text'); }} className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-40 ${placementMode === 'text' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-indigo-200 bg-white text-indigo-700'}`}>+ เพิ่มข้อความในหน้าเอกสาร</button>
              <p className="text-xs text-slate-500">พิมพ์ข้อความ กดเพิ่ม แล้วแตะตำแหน่งบนหน้าใดก็ได้ ทำซ้ำเพื่อเพิ่มข้อความต่างกันในหลายหน้า จากนั้นลากกรอบแต่ละรายการได้อย่างอิสระ</p>
              {textAnnotations.length > 0 && <div className="space-y-1 rounded-lg bg-white p-2 text-xs"><p className="font-semibold text-indigo-700">เพิ่มข้อความแล้ว {textAnnotations.length} รายการ</p>{textAnnotations.map((annotation, index) => <div key={`${annotation.placement.page}-${index}`} className={`flex items-center justify-between gap-2 rounded px-2 py-1 ${selectedTextIndex === index ? 'bg-indigo-50' : 'bg-slate-50'}`}><button type="button" onClick={() => { setSelectedTextIndex(index); setComment(annotation.text); setCommentFontSize(annotation.placement.fontSize ?? 16); setCommentBoxWidth(annotation.placement.width); setCommentTextAlign(annotation.placement.textAlign ?? 'left'); }} className="min-w-0 flex-1 truncate text-left">หน้า {annotation.placement.page}: {annotation.text}</button><button type="button" aria-label={`ลบข้อความหน้า ${annotation.placement.page}`} onClick={() => { setTextAnnotations(previous => previous.filter((_, currentIndex) => currentIndex !== index)); setSelectedTextIndex(null); setConfirmed(false); }} className="text-rose-600">ลบ</button></div>)}</div>}
            </div>
            <label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={draftSignatures.length === 0 || !image} />ฉันตรวจเอกสารและยืนยันตำแหน่งทั้งหมดแล้ว</label>
            <button disabled={busy || !confirmed || draftSignatures.length === 0 || !image} onClick={() => void submit('sign')} className="w-full rounded-xl bg-indigo-600 p-3 font-bold text-white disabled:opacity-40">{busy ? 'กำลังบันทึก…' : `บันทึก ${draftSignatures.length} ลายเซ็น และ ${textAnnotations.length} ข้อความ`}</button>
            <button disabled={busy} onClick={() => void submit('reject')} className="w-full rounded-xl border border-rose-200 p-2 text-rose-600">ส่งกลับให้แก้ไข</button>
          </>}
        </aside>
      </div>
    </div>
  </div>;
}
