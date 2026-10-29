import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function loadTs(path, globals = {}) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    fileName: path, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const context = vm.createContext({ exports: {}, require, ...globals });
  vm.runInContext(code, context);
  return context.exports;
}

const fixtures = [
  { id: 'own', createdBy: 'teacher', createdByName: 'Teacher', title: 'Own completed plan', fileName: 'own.pdf', topic: 'lesson_plan_before', academicYear: '2569', semester: '2', createdAt: '2026-10-28T10:00:00Z', currentStep: 1, status: 'completed', signers: [] },
  { id: 'assigned', createdBy: 'sender', createdByName: 'Sender', title: 'Assigned plan', fileName: 'assigned.pdf', topic: 'lesson_plan_before', academicYear: '2569', semester: '2', createdAt: '2026-10-28T10:00:00Z', currentStep: 1, status: 'pending', signers: [{ userId: 'teacher', step: 1, status: 'pending' }] },
  { id: 'unrelated', createdBy: 'stranger', createdByName: 'PRIVATE SENDER', title: 'PRIVATE DOCUMENT', fileName: 'private.pdf', topic: 'id_plan', academicYear: '2569', semester: '2', createdAt: '2026-10-28T10:00:00Z', currentStep: 1, status: 'rejected', signers: [] },
  { id: 'old-unrelated', createdBy: 'stranger', createdByName: 'PRIVATE SENDER', title: 'PRIVATE OLD', fileName: 'private-old.pdf', topic: 'id_plan', academicYear: '2568', semester: '2', createdAt: '2025-10-28T10:00:00Z', currentStep: 1, status: 'pending', signers: [] },
];
function renderPersonalPage(userId, role, records = fixtures) {
  let stateIndex = 0;
  const hooks = {
    ...React,
    useState: initial => [stateIndex++ === 0 ? records : (typeof initial === 'function' ? initial() : initial), () => {}],
    useMemo: compute => compute(),
    useEffect: () => {},
  };
  const { lessonPlanTopicLabel } = loadTs('../src/lib/lessonPlanTopicLabel.ts');
  const { DocumentWorkflowModule } = loadTs('../src/components/modules/DocumentWorkflowModule.tsx', {
    require: name => {
      if (name === 'react') return hooks;
      if (name === 'lucide-react') return new Proxy({}, { get: () => () => null });
      if (name === '../../context/AppContext') return { useApp: () => ({ users: [], currentUser: { id: userId, role }, academicPeriod: { academicYear: '2569', semester: '2' }, addToast: () => {} }) };
      if (name === '../../lib/api') return { documentWorkflowsApi: {} };
      if (name === '../../lib/lessonPlanTopicLabel') return { lessonPlanTopicLabel };
      if (name === '../../lib/useAcademicPeriodSelection') return loadTs('../src/lib/useAcademicPeriodSelection.ts', { require: name => name === 'react' ? hooks : require(name) });
      if (name === '../DocumentSigningViewer') return { DocumentSigningViewer: () => null };
      if (name === '../DocumentSubmissionModal') return { DocumentSubmissionModal: () => null };
      return require(name);
    },
  });
  return renderToStaticMarkup(React.createElement(DocumentWorkflowModule));
}
test('unrelated reviewer and executive accounts see zero personal totals, categories and type counts', () => {
  for (const role of ['admin', 'director', 'academic_affairs']) {
    const html = renderPersonalPage('unrelated-reviewer', role);
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    assert.match(text, /เอกสารในรอบที่เลือก\s*0 รายการ/);
    assert.match(text, /เอกสารที่ฉันส่ง\s*0 รายการ/);
    assert.match(text, /เอกสารทั้งหมด\s*0/);
    assert.match(text, /ทุกชนิด \(0\)/);
    assert.doesNotMatch(html, /PRIVATE|ปีการศึกษา 2568/);
  }
});
test('personal counters and folders retain only own documents and assigned signing work', () => {
  const html = renderPersonalPage('teacher', 'teacher');
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  assert.match(text, /เอกสารในรอบที่เลือก\s*2 รายการ/);
  assert.match(text, /รอฉันตรวจและลงนาม\s*1 รายการ/);
  assert.match(text, /เอกสารที่ฉันส่ง\s*1 รายการ/);
  assert.match(text, /เสร็จสิ้น\s*1/);
  assert.match(text, /ส่งกลับแก้ไข\s*0/);
  assert.match(html, /Own completed plan/);
  assert.match(html, /Assigned plan/);
  assert.doesNotMatch(html, /PRIVATE|ปีการศึกษา 2568/);
});
test('personal list requests its own API scope without changing document review or e-Office requests', async () => {
  const paths = [];
  const { documentWorkflowsApi } = loadTs('../src/lib/api.ts', {
    Headers, FormData, fetch: async path => {
      paths.push(path);
      return new Response(JSON.stringify({ status: 'success', data: [] }), { status: 200 });
    },
  });
  await documentWorkflowsApi.list('personal');
  await documentWorkflowsApi.list();
  await documentWorkflowsApi.list('eoffice');
  assert.deepEqual(paths, ['/api/document_workflows.php?scope=personal', '/api/document_workflows.php', '/api/document_workflows.php?source=eoffice']);
});
test('historical research folders keep separate fiscal years based on submission dates', () => {
  const records = [
    { ...fixtures[0], id: 'september', topic: 'classroom_research', title: 'September research', createdAt: '2026-09-30 23:59:59' },
    { ...fixtures[0], id: 'october', topic: 'classroom_research', title: 'October research', createdAt: '2026-10-01 00:00:00' },
  ];
  const html = renderPersonalPage('teacher', 'teacher', records);
  assert.match(html, /วิจัยในชั้นเรียน ปีงบประมาณ 2569/);
  assert.match(html, /วิจัยในชั้นเรียน ปีงบประมาณ 2570/);
  assert.match(html, /September research/);
  assert.match(html, /October research/);
});
