import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { PDFDocument, PDFName, StandardFonts, degrees, rgb } from 'pdf-lib';
import { createCanvas, DOMMatrix, ImageData, Path2D, GlobalFonts, Image } from '@napi-rs/canvas';

const require = createRequire(import.meta.url);
const code = ts.transpileModule(readFileSync(new URL('../src/lib/document-pdf-export.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const context = vm.createContext({ exports: {}, require, Uint8Array, Number, Error });
vm.runInContext(code, context);
const { overlayOriginalPdf } = context.exports;
globalThis.DOMMatrix ??= DOMMatrix;
globalThis.ImageData ??= ImageData;
globalThis.Path2D ??= Path2D;
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

async function fixture() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const imageCanvas = createCanvas(500, 500), imageContext = imageCanvas.getContext('2d');
  imageContext.fillStyle = 'white'; imageContext.fillRect(0, 0, 500, 500);
  imageContext.fillStyle = 'black';
  for (let x = 0; x < 500; x += 2) imageContext.fillRect(x, 0, 1, 500);
  const image = await doc.embedPng(imageCanvas.toBuffer('image/png'));
  for (const rotation of [0, 90, 180, 270, 0]) {
    const page = doc.addPage([240, 360]);
    page.setCropBox(20, 30, 200, 300);
    page.setRotation(degrees(rotation));
    page.drawText('Original fine print 8pt', { x: 30, y: 300, size: 8, font });
    page.drawImage(image, { x: 50, y: 180, width: 50, height: 50 });
    page.drawLine({ start: { x: 25, y: 170 }, end: { x: 210, y: 170 }, thickness: 0.1, color: rgb(0, 0, 0) });
  }
  const field = doc.getForm().createTextField('original-form');
  field.setText('Keep this value');
  field.addToPage(doc.getPage(4), { x: 30, y: 80, width: 150, height: 20 });
  return doc.save();
}

async function readPdf(bytes) {
  return pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, standardFontDataUrl: fileURLToPath(new URL('../node_modules/pdfjs-dist/standard_fonts/', import.meta.url)) + '/' }).promise;
}
async function pixels(page) {
  const viewport = page.getViewport({ scale: 2 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  await page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport }).promise;
  return { canvas, data: canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data };
}

test('signed exports retain original text, fine scan pixels, forms, page boxes and all rotations', async () => {
  const original = await fixture();
  const source = await readPdf(original);
  const overlayCanvas = createCanvas(800, 1200);
  const overlayContext = overlayCanvas.getContext('2d');
  overlayContext.fillStyle = '#173b9c';
  overlayContext.fillRect(80, 720, 200, 180);
  const output = await overlayOriginalPdf(original, async pageNumber => {
    if (pageNumber === 5) return null;
    const viewport = (await source.getPage(pageNumber)).getViewport({ scale: 1 });
    return { png: overlayCanvas.toBuffer('image/png'), viewBox: viewport.viewBox, rotation: viewport.rotation };
  });
  const signed = await readPdf(output);
  const originalDoc = await PDFDocument.load(original), outputDoc = await PDFDocument.load(output);
  assert.equal(outputDoc.getPageCount(), 5);
  assert.equal(outputDoc.getForm().getTextField('original-form').getText(), 'Keep this value');
  for (let index = 0; index < 5; index += 1) {
    const oldPage = originalDoc.getPage(index), newPage = outputDoc.getPage(index);
    assert.deepEqual(newPage.getCropBox(), oldPage.getCropBox());
    assert.deepEqual(newPage.getMediaBox(), oldPage.getMediaBox());
    assert.deepEqual(newPage.getRotation(), oldPage.getRotation());
    // Existing content streams and embedded source images must be byte-identical.
    for (const ref of oldPage.node.Contents().asArray()) {
      assert.deepEqual(outputDoc.context.lookup(ref).getContents(), originalDoc.context.lookup(ref).getContents());
    }
    const oldImages = oldPage.node.Resources().lookup(PDFName.of('XObject'));
    for (const [, ref] of oldImages.entries()) {
      assert.deepEqual(outputDoc.context.lookup(ref).getContents(), originalDoc.context.lookup(ref).getContents());
    }
    const beforePage = await source.getPage(index + 1), afterPage = await signed.getPage(index + 1);
    const beforeText = (await beforePage.getTextContent()).items.map(item => item.str);
    assert.deepEqual((await afterPage.getTextContent()).items.map(item => item.str), beforeText);
    const before = await pixels(beforePage), after = await pixels(afterPage);
    assert.equal(before.data.length, after.data.length);
    let bluePixels = 0;
    for (let y = 0; y < before.canvas.height; y += 1) {
      for (let x = 0; x < before.canvas.width; x += 1) {
        const offset = (y * before.canvas.width + x) * 4;
        const insideMark = index < 4 && x >= before.canvas.width * .1 - 2 && x <= before.canvas.width * .35 + 2 && y >= before.canvas.height * .6 - 2 && y <= before.canvas.height * .75 + 2;
        if (insideMark) {
          if (after.data[offset + 2] > after.data[offset] + 50) bluePixels += 1;
        } else {
          assert.deepEqual(after.data.slice(offset, offset + 4), before.data.slice(offset, offset + 4), `Original content changed on page ${index + 1} at ${x},${y}`);
        }
      }
    }
    if (index < 4) assert.ok(bluePixels > 100, `Missing/misaligned mark at rotation ${index * 90}`);
    if (process.env.PDF_EXPORT_QA_DIR) {
      mkdirSync(process.env.PDF_EXPORT_QA_DIR, { recursive: true });
      writeFileSync(`${process.env.PDF_EXPORT_QA_DIR}/rotation-${index * 90}.png`, after.canvas.toBuffer('image/png'));
    }
  }
  if (process.env.PDF_EXPORT_QA_DIR) {
    writeFileSync(`${process.env.PDF_EXPORT_QA_DIR}/original.pdf`, original);
    writeFileSync(`${process.env.PDF_EXPORT_QA_DIR}/signed.pdf`, output);
  }
  await source.destroy(); await signed.destroy();
});

test('no marks returns the exact original bytes; invalid geometry fails without a raster fallback', async () => {
  const original = await fixture();
  assert.strictEqual(await overlayOriginalPdf(original, async () => null), original);
  await assert.rejects(overlayOriginalPdf(original, async () => ({ png: new Uint8Array(), viewBox: [0, 0, 10, 10], rotation: 45 })), /ตำแหน่งหน้าต้นฉบับ/);
});

test('the actual download renderer preserves original pages and exports Thai receipt, signature and identity on separate pages', async () => {
  assert.ok(GlobalFonts.registerFromPath(fileURLToPath(new URL('../public/fonts/th-sarabun-psk-regular.ttf', import.meta.url)), 'TH SarabunPSK'));
  assert.ok(GlobalFonts.registerFromPath(fileURLToPath(new URL('../public/fonts/th-sarabun-psk-bold.ttf', import.meta.url)), 'TH SarabunPSK'));
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let index = 0; index < 2; index += 1) {
    const page = doc.addPage([595.28, 841.89]);
    page.drawText('MMV - Original PDF, sharp at every zoom', { x: 40, y: 650, font, size: 16 });
    page.drawText('Small original text - 8 pt', { x: 40, y: 625, font, size: 8 });
    for (let y = 400; y <= 590; y += 38) page.drawLine({ start: { x: 40, y }, end: { x: 550, y }, thickness: .3 });
  }
  const original = await doc.save(), pdf = await readPdf(original);
  const signature = createCanvas(600, 200), signatureContext = signature.getContext('2d');
  signatureContext.strokeStyle = '#173b9c'; signatureContext.lineWidth = 6;
  signatureContext.beginPath(); signatureContext.moveTo(150, 145); signatureContext.bezierCurveTo(220, 0, 290, 200, 390, 65); signatureContext.stroke();
  const placement = { page: 2, x: .6, y: .63, width: .2, height: .05 };
  const item = {
    id: 'EO-quality', receiptStamp: { receiptNo: '2210', date: '2026-10-26', time: '11:11' },
    signers: [{ status: 'signed', signatureData: signature.toDataURL('image/png'), placement,
      textAnnotations: [
        { text: '- รับทราบ\n- แจ้งกลุ่มบริหารวิชาการ', placement: { ...placement, y: .57, width: .3, fontSize: 14 } },
        { text: '(นางสาวมณฑาทิพย์ เสาวคนธ์)\nผู้อำนวยการ โรงเรียนมกุฎเมืองราชวิทยาลัย\n๒๖ ตุลาคม ๒๕๖๙', placement: { ...placement, x: .48, y: .68, width: .42, fontSize: 14, textAlign: 'center' } },
      ] }],
  };
  const viewer = readFileSync(new URL('../src/components/DocumentSigningViewer.tsx', import.meta.url), 'utf8');
  const functions = viewer.slice(viewer.indexOf('function paintReceipt('), viewer.indexOf('function PdfPage('));
  const download = viewer.slice(viewer.indexOf('  const downloadSignedPdf ='), viewer.indexOf('  const downloadDocument ='));
  const rendererContext = vm.createContext({ exports: {}, pdf, item, isEoffice: true, Image, Uint8Array,
    atob: value => Buffer.from(value, 'base64').toString('binary'),
    require: name => name === '../lib/document-pdf-export' ? { overlayOriginalPdf } : require(name),
    document: { fonts: { load: async () => [] }, createElement: () => createCanvas(1, 1) },
  });
  vm.runInContext(ts.transpile(`${functions}\n${download}\nexports.download = downloadSignedPdf;`, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }), rendererContext);
  const output = await rendererContext.exports.download();
  const signed = await readPdf(output);
  for (let index = 1; index <= 2; index += 1) {
    const page = await signed.getPage(index);
    assert.match((await page.getTextContent()).items.map(item => item.str).join(' '), /Small original text/);
    const result = await pixels(page);
    const yStart = index === 1 ? 0 : Math.floor(result.canvas.height * .57);
    const yEnd = index === 1 ? Math.floor(result.canvas.height * .13) : Math.floor(result.canvas.height * .8);
    let blue = 0;
    for (let y = yStart; y < yEnd; y += 1) for (let x = 0; x < result.canvas.width; x += 1) {
      const offset = (y * result.canvas.width + x) * 4;
      if (result.data[offset + 2] > result.data[offset] + 50) blue += 1;
    }
    assert.ok(blue > 500, `Receipt/signing text missing on page ${index}`);
    if (process.env.PDF_EXPORT_QA_DIR) writeFileSync(`${process.env.PDF_EXPORT_QA_DIR}/thai-signed-${index}.png`, result.canvas.toBuffer('image/png'));
  }
  if (process.env.PDF_EXPORT_QA_DIR) writeFileSync(`${process.env.PDF_EXPORT_QA_DIR}/thai-signed.pdf`, output);
  await signed.destroy(); await pdf.destroy();
});
