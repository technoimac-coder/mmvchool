import { PDFDocument, degrees } from 'pdf-lib';

export interface DocumentPageOverlay {
  png: Uint8Array;
  /** The visible PDF box and rotation used by PDF.js for this overlay. */
  viewBox: number[];
  rotation: number;
}

/** Keep original page streams, fonts, images and forms; add only transparent marks. */
export async function overlayOriginalPdf(
  original: Uint8Array,
  renderOverlay: (pageNumber: number) => Promise<DocumentPageOverlay | null>,
): Promise<Uint8Array> {
  const document = await PDFDocument.load(original, { updateMetadata: false });
  let changed = false;
  const pages = document.getPages();
  for (let index = 0; index < pages.length; index += 1) {
    const overlay = await renderOverlay(index + 1);
    if (!overlay) continue;
    const [left, bottom, right, top] = overlay.viewBox;
    const width = right - left, height = top - bottom;
    const rotation = ((overlay.rotation % 360) + 360) % 360;
    if (![left, bottom, right, top].every(Number.isFinite) || width <= 0 || height <= 0 || ![0, 90, 180, 270].includes(rotation)) {
      throw new Error('ไม่สามารถรักษาตำแหน่งหน้าต้นฉบับได้ กรุณาเปิดต้นฉบับแทน');
    }
    const image = await document.embedPng(overlay.png);
    const sideways = rotation === 90 || rotation === 270;
    pages[index].drawImage(image, {
      x: rotation === 90 || rotation === 180 ? right : left,
      y: rotation === 180 || rotation === 270 ? top : bottom,
      width: sideways ? height : width,
      height: sideways ? width : height,
      rotate: degrees(rotation),
    });
    changed = true;
  }
  // Never rasterize the source or silently fall back to a lower-quality PDF.
  return changed ? document.save({ updateFieldAppearances: false }) : original;
}
