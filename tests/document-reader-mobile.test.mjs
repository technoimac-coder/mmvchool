
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const React = require('react');
function loadTs(path, globals = {}) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const context = vm.createContext({ exports: {}, require, ...globals });
  vm.runInContext(code, context);
  return context.exports;
}
const reader = loadTs('../src/lib/document-reader.ts');
const book = { id: 'book/1', title: 'หนังสือทดสอบบนมือถือ', file_name: 'original.pdf', created_by_name: 'เจ้าหน้าที่', academic_year: '2569', received_date: '2026-10-28' };
const workflow = { id: 'DOC-test', title: 'แผนการสอน', topic: 'lesson_plan_before', fileName: 'plan.pdf', createdBy: 'sender', createdByName: 'Sender', status: 'pending', currentStep: 1, createdAt: '2026-10-28', signers: [{ userId: 'teacher', userName: 'Teacher', step: 1, status: 'pending' }] };

function viewerHarness(props) {
  const slots = [];
  let cursor = 0;
  const hooks = {
    ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = index === 0 ? { numPages: 2 } : (typeof initial === 'function' ? initial() : initial);
      return [slots[index], update => { slots[index] = typeof update === 'function' ? update(slots[index]) : update; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect: () => {},
  };
  const { DocumentSigningViewer } = loadTs('../src/components/DocumentSigningViewer.tsx', {
    require: name => {
      if (name === 'react') return hooks;
      if (name === 'lucide-react') return new Proxy({}, { get: () => () => null });
      if (name === '../lib/api') return { documentWorkflowsApi: {}, eofficeSignatureApi: {} };
      if (name === './EofficeEndorsementPanel') return { EofficeEndorsementPanel: () => null };
      if (name === '../lib/document-reader') return reader;
      return require(name);
    },
  });
  const nodes = root => React.isValidElement(root) ? [root, ...React.Children.toArray(root.props.children).flatMap(nodes)] : [];
  const render = () => { cursor = 0; return DocumentSigningViewer({ item: workflow, userId: 'teacher', onClose: () => {}, onSaved: () => {}, ...props }); };
  const find = predicate => nodes(render()).find(predicate);
  const text = node => React.isValidElement(node) ? React.Children.toArray(node.props.children).map(text).join('') : String(node ?? '');
  return { render, find, text, nodes };
}

test('original letters and attachments open through their authorized source without acquiring signing permissions', () => {
  const original = reader.originalBookDocument(book);
  assert.equal(original.fileUrl, '/api/eoffice.php?download=book%2F1');
  assert.equal(original.status, 'completed');
  assert.equal(original.signers.length, 0);
  assert.equal(original.receiptStamp, undefined);
  const attachment = reader.originalBookDocument(book, { id: 'a&b', file_name: 'attachment.pdf' });
  assert.equal(attachment.fileUrl, '/api/eoffice.php?download=book%2F1&attachment=a%26b');
  assert.equal(attachment.fileName, 'attachment.pdf');
  const view = viewerHarness({ item: { ...workflow, ...original, signers: workflow.signers }, readOnlyUrl: original.fileUrl });
  const details = view.find(node => node.props.role === 'tab' && view.text(node) === 'รายละเอียด');
  assert.ok(details);
  details.props.onClick();
  assert.ok(view.find(node => node.type === 'a' && node.props.href === original.fileUrl && node.props.target === '_blank'));
  assert.equal(view.find(node => node.type === 'button' && view.text(node).includes('บันทึก 0 ลายเซ็น')), undefined);
  assert.equal(view.find(node => node.type === 'button' && view.text(node).includes('แก้ไขชื่อเรื่อง')), undefined);
});

test('phone reader starts with the document visible, zooms, and opens signing tools without discarding drafts', () => {
  const view = viewerHarness();
  const readTab = view.find(node => node.props.role === 'tab' && view.text(node) === 'อ่านเอกสาร');
  assert.equal(readTab.props['aria-selected'], true);
  const tools = () => view.find(node => node.props.role === 'tab' && view.text(node) === 'ลงนาม / ส่งต่อ');
  tools().props.onClick();
  assert.equal(tools().props['aria-selected'], true);
  const pad = view.find(node => node.type === 'canvas' && node.props['aria-label'] === 'กระดานวาดลายเซ็น');
  const target = {
    setPointerCapture() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 100 }),
    getContext: () => ({ beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} }),
    toDataURL: () => 'data:image/png;base64,test',
  };
  const pointer = { currentTarget: target, clientX: 25, clientY: 25, pointerId: 1 };
  pad.props.onPointerDown(pointer);
  pad.props.onPointerMove(pointer);
  pad.props.onPointerUp(pointer);
  view.find(node => node.type === 'button' && view.text(node) === '+ เพิ่มลายเซ็นในเอกสาร').props.onClick();
  assert.equal(tools().props['aria-selected'], false);
  const firstPage = () => view.find(node => node.props.pdf && node.props.page === 1);
  const placement = { page: 1, x: 0.2, y: 0.6, width: 0.25, height: 0.05 };
  firstPage().props.onPlace(placement);
  view.find(node => node.props['aria-label'] === 'ขยายเอกสาร').props.onClick();
  assert.ok(view.find(node => node.type === 'button' && view.text(node) === 'พอดีจอ 125%'));
  assert.deepEqual(JSON.parse(JSON.stringify(firstPage().props.draftSignatures)), [placement]);
  tools().props.onClick();
  const confirmation = view.find(node => node.type === 'input' && node.props.type === 'checkbox');
  assert.equal(confirmation.props.disabled, false);
  view.find(node => node.props.role === 'tab' && view.text(node) === 'อ่านเอกสาร').props.onClick();
  assert.deepEqual(JSON.parse(JSON.stringify(firstPage().props.draftSignatures)), [placement]);
});

test('zoom remains between fit-to-width and 300 percent', () => {
  let zoom = 1;
  for (let i = 0; i < 20; i++) zoom = reader.documentZoom(zoom, 1);
  assert.equal(zoom, 3);
  for (let i = 0; i < 20; i++) zoom = reader.documentZoom(zoom, -1);
  assert.equal(zoom, 1);
});

test('mobile downloads attach their link before tapping and keep the blob available until the browser consumes it', () => {
  const calls = [];
  let delayed;
  const anchor = { click: () => calls.push('click'), remove: () => calls.push('remove') };
  const { saveDocumentBlob } = loadTs('../src/lib/document-reader.ts', {
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL: () => calls.push('revoke') },
    document: { createElement: () => anchor, body: { appendChild: () => calls.push('append') } },
    window: { setTimeout: (callback, delay) => { delayed = callback; assert.equal(delay, 60000); } },
  });
  saveDocumentBlob({}, 'แผนการสอน.pdf');
  assert.equal(anchor.download, 'แผนการสอน.pdf');
  assert.deepEqual(calls, ['append', 'click', 'remove']);
  delayed();
  assert.deepEqual(calls, ['append', 'click', 'remove', 'revoke']);
});
