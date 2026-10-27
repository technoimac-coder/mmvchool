import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function loadTs(path, globals = {}) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { fileName: path, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const context = vm.createContext({ exports: {}, Error, ...globals });
  vm.runInContext(code, context);
  return context.exports;
}
const { documentFileError, submitDocumentFiles, MAX_DOCUMENT_BYTES } = loadTs('../src/lib/document-upload.ts');
const entry = index => ({ requestId: `request-${index}`, title: `แผนที่ ${index}`, file: new File(['%PDF-1.7\n'], `แผน${index}.pdf`, { type: 'application/pdf' }), status: 'ready' });

test('twenty PDFs each receive an independent workflow with the same selected period and signer order', async () => {
  const requests = [];
  let active = 0;
  let maximum = 0;
  const { documentWorkflowsApi } = loadTs('../src/lib/api.ts', { Headers, FormData, fetch: async (path, init) => {
    active++; maximum = Math.max(maximum, active);
    await new Promise(resolve => setTimeout(resolve, 1));
    requests.push({ path, body: init.body, credentials: init.credentials });
    active--;
    return new Response(JSON.stringify({ status: 'success', data: { id: `DOC-${requests.length}` } }), { status: 201 });
  } });
  const entries = Array.from({ length: 20 }, (_, index) => entry(index + 1));
  const received = [];
  const result = await submitDocumentFiles(entries, item => documentWorkflowsApi.create(item.title, 'lesson_plan_before', 'หน่วยการเรียนรู้', ['head', 'director'], item.file, '2569', '2', item.requestId), (id, change, workflow) => { if (workflow) received.push(workflow); });
  assert.equal(result.succeeded, 20);
  assert.equal(result.failed, 0);
  assert.equal(maximum, 1);
  assert.equal(new Set(received.map(item => item.id)).size, 20);
  requests.forEach(({ path, body, credentials }, index) => {
    assert.equal(path, '/api/document_workflows.php');
    assert.equal(credentials, 'same-origin');
    assert.equal(body.get('document').name, entries[index].file.name);
    assert.equal(body.get('title'), entries[index].title);
    assert.equal(body.get('academicYear'), '2569');
    assert.equal(body.get('semester'), '2');
    assert.deepEqual(body.getAll('signerIds[]'), ['head', 'director']);
    assert.equal(body.get('clientRequestId'), entries[index].requestId);
    assert.equal(body.has('createdBy'), false);
  });
});

test('partial failure preserves successes and retries only the failed file with its original request ID', async () => {
  let entries = [entry(1), entry(2), entry(3)];
  const calls = [];
  const update = (id, change) => { entries = entries.map(item => item.requestId === id ? { ...item, ...change } : item); };
  const first = await submitDocumentFiles(entries, async item => { calls.push(item.requestId); if (item.requestId === 'request-2') throw new Error('connection lost'); return { id: item.requestId }; }, update);
  assert.equal(first.succeeded, 2);
  assert.equal(first.failed, 1);
  assert.equal(entries[1].error, 'connection lost');
  const second = await submitDocumentFiles(entries, async item => { calls.push(item.requestId); return { id: item.requestId }; }, update);
  assert.equal(second.succeeded, 3);
  assert.equal(second.failed, 0);
  assert.deepEqual(calls, ['request-1', 'request-2', 'request-3', 'request-2']);
  assert.ok(entries.every(item => item.status === 'success'));
});

test('empty, oversized and non-PDF files cannot be sent; 1,240 KB and the exact 15 MB limit are valid', async () => {
  assert.equal(documentFileError({ name: 'plan.PDF', size: 1240 * 1024 }), undefined);
  assert.equal(documentFileError({ name: 'plan.pdf', size: MAX_DOCUMENT_BYTES }), undefined);
  assert.match(documentFileError({ name: 'plan.pdf', size: MAX_DOCUMENT_BYTES + 1 }), /15 MB/);
  assert.ok(documentFileError({ name: 'plan.docx', size: 123 }));
  assert.ok(documentFileError({ name: 'plan.pdf', size: 0 }));
  let calls = 0;
  const result = await submitDocumentFiles([{ ...entry(1), title: ' ' }, { ...entry(2), file: { name: 'plan.docx', size: 123 } }], async () => { calls++; }, () => {});
  assert.equal(calls, 0);
  assert.equal(result.failed, 2);
});

test('server upload rejection shows a readable size-limit error even for an HTML 413 response', async () => {
  const { documentWorkflowsApi } = loadTs('../src/lib/api.ts', { Headers, FormData, fetch: async () => new Response('<h1>413 Request Entity Too Large</h1>', { status: 413 }) });
  await assert.rejects(documentWorkflowsApi.create('แผน', 'lesson_plan', '', ['director'], entry(1).file), error => error.status === 413 && error.code === 'upload_limit_exceeded' && /ขนาดไฟล์/.test(error.message));
});

test('submission dialog accepts twenty named plans and shares one signer selection without sending twice on a double click', async () => {
  const React = await import('react');
  const slots = [];
  let cursor = 0;
  const hooks = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial; return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
    useRef(initial) { const index = cursor++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index]; },
  };
  const sent = [];
  const notifications = [];
  const created = [];
  let closed = false;
  let finish;
  const finished = new Promise(resolve => { finish = resolve; });
  const jsx = await import('react/jsx-runtime');
  const { DocumentSubmissionModal } = loadTs('../src/components/DocumentSubmissionModal.tsx', {
    crypto, require: name => {
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return jsx;
      if (name === 'lucide-react') return new Proxy({}, { get: () => () => null });
      if (name.endsWith('/document-upload')) return { documentFileError, submitDocumentFiles, MAX_DOCUMENT_FILES: 50 };
      if (name.endsWith('/lessonPlanTopicLabel')) return { lessonPlanTopicLabel: (_, label) => label };
      if (name.endsWith('/api')) return { documentWorkflowsApi: { create: async (...args) => { sent.push(args); await new Promise(resolve => setTimeout(resolve, 1)); return { id: args[7], createdBy: 'teacher' }; } } };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  const props = { users: [{ id: 'teacher', name: 'ครูทดสอบ', status: 'active' }, { id: 'director', name: 'ผู้อำนวยการ', position: 'ผู้บริหาร', status: 'active' }], currentUser: { id: 'teacher', name: 'ครูทดสอบ' }, academicYear: '2569', semester: '2', topics: [['lesson_plan_before', 'แผนการสอน']], onClose: () => { closed = true; finish(); }, onCreated: item => created.push(item), notify: (...args) => notifications.push(args) };
  function render() { cursor = 0; return DocumentSubmissionModal(props); }
  function nodes(root) { if (!React.isValidElement(root)) return []; return [root, ...React.Children.toArray(root.props.children).flatMap(nodes)]; }
  const find = predicate => nodes(render()).find(predicate);
  const picker = find(node => node.type === 'input' && node.props.type === 'file');
  assert.equal(picker.props.multiple, true);
  const files = Array.from({ length: 20 }, (_, index) => entry(index + 1).file);
  picker.props.onChange({ target: { files, value: 'selected' } });
  assert.equal(nodes(render()).filter(node => node.type === 'input' && node.props['aria-label']?.startsWith('ชื่อเรื่องไฟล์ที่')).length, 20);
  find(node => node.type === 'input' && node.props.placeholder?.includes('ค้นหาชื่อ')).props.onChange({ target: { value: 'ผู้อำนวยการ' } });
  find(node => node.type === 'button' && React.Children.toArray(node.props.children).includes('ผู้อำนวยการ')).props.onClick();
  const button = find(node => node.type === 'button' && node.props.className?.includes('bg-indigo-600'));
  const first = button.props.onClick();
  const double = button.props.onClick();
  assert.equal(find(node => node.type === 'fieldset').props.disabled, true);
  await Promise.all([first, double]);
  await Promise.race([finished, new Promise((_, reject) => setTimeout(() => reject(new Error('Submission did not complete')), 2000))]);
  assert.equal(sent.length, 20);
  assert.equal(created.length, 20);
  assert.equal(new Set(sent.map(args => args[7])).size, 20);
  sent.forEach((args, index) => { assert.equal(args[0], `แผน${index + 1}`); assert.equal(args[3][0], 'director'); assert.equal(args[5], '2569'); assert.equal(args[6], '2'); });
  assert.equal(notifications[0][1], 'success');
  assert.equal(closed, true);
});
