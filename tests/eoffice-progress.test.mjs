import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const compiled = ts.transpileModule(readFileSync(new URL('../src/lib/eoffice-progress.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = vm.createContext({ exports: {} });
vm.runInContext(compiled, context);
const { eofficeProgress: progress, eofficeDate } = context.exports;
const book = { stage: 'registered' };
const task = (status, user_name = 'ครูตัวอย่าง') => ({ status, user_name });

test('registration, return for correction and completed signing remain distinct steps', () => {
  assert.equal(progress(book).step, 1);
  assert.equal(progress({ stage: 'routing', signing_status: 'rejected' }).label, 'ส่งกลับแก้ไข');
  const signed = progress({ stage: 'routing', signing_status: 'completed' });
  assert.equal(signed.step, 2);
  assert.match(signed.label, /รอส่งต่อ/);
});

test('current signer is shown instead of a previous responsible officer', () => {
  const doc = { status: 'in_review', currentStep: 2, signers: [
    { step: 1, status: 'signed', userName: 'ผู้ลงนามคนก่อน' },
    { step: 2, status: 'pending', userName: 'ผู้ลงนามปัจจุบัน' },
    { step: 3, status: 'pending', userName: 'ผู้ลงนามถัดไป' },
  ] };
  const result = progress({ stage: 'routing', responsible_name: 'ผู้ลงนามคนก่อน' }, doc);
  assert.equal(result.detail, 'รอ: ผู้ลงนามปัจจุบัน');
  assert.match(progress({ workflow_id: 'EO-test' }, doc).label, /รอเกษียน/);
});

test('completed signatures do not imply recipients have acknowledged', () => {
  const result = progress({ stage: 'distributed', signing_status: 'completed', tasks: [task('acknowledged'), task('pending', 'คนที่ยังไม่รับทราบ')] });
  assert.equal(result.step, 3);
  assert.equal(result.label, 'รอผู้ปฏิบัติรับทราบ');
  assert.equal(result.detail, 'รับทราบ 1/2 คน');
  assert.equal(result.pendingNames.join(','), 'คนที่ยังไม่รับทราบ');
});

test('acknowledgement is complete only with recipients, and archive takes precedence', () => {
  const acknowledged = progress({ stage: 'distributed', tasks: [task('acknowledged'), task('completed')] });
  assert.equal(acknowledged.label, 'รับทราบครบแล้ว');
  assert.equal(acknowledged.step, 3);
  assert.notEqual(progress({ stage: 'distributed', tasks: [] }).label, 'รับทราบครบแล้ว');
  assert.equal(progress({ stage: 'archived', signing_status: 'completed', tasks: [task('pending')] }).step, 4);
});

test('Thai dates are stable without timezone conversions', () => {
  assert.equal(eofficeDate('2026-10-27'), '27/10/2569');
  assert.equal(eofficeDate('2026-10-27 00:00:00'), '27/10/2569');
  assert.equal(eofficeDate(''), '—');
});
