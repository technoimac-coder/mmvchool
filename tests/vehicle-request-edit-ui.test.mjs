import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const source = fs.readFileSync(new URL('../src/components/modules/VehicleModule.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
const base = { id: 'VB-test', userId: 'teacher', userName: 'Teacher', department: 'Science', purpose: 'Study', destination: 'School',
  startDate: '2099-11-10', startTime: '08:00', endDate: '2099-11-10', endTime: '17:00', passengerCount: 1, status: 'pending', bookingStage: 'admin_review', canEditRequest: true };
function render(booking) {
  const mod = { exports: {} };
  const context = { currentUser: { id: 'teacher', name: 'Teacher', position: 'Teacher', department: 'Science' },
    vehicles: [], vehicleBookings: [booking], users: [], pipelinesConfig: [], markRelatedNotificationsAsRead() {} };
  const stubRequire = name => name.includes('context/AppContext') ? { useApp: () => context }
    : name.includes('AcademicPeriodFilter') ? { useAcademicPeriodRecords: records => ({ records }), AcademicPeriodFilterBar: () => null }
    : name.includes('config/approvalWorkflow') ? { getPipelineAssignee: (_, __, ___, fallback) => fallback }
    : require(name);
  new Function('require', 'module', 'exports', compiled)(stubRequire, mod, mod.exports);
  return renderToStaticMarkup(React.createElement(mod.exports.VehicleModule));
}
test('owner sees edit only before the first action', () => {
  assert.match(render(base), /aria-label="แก้ไขคำขอ VB-test"/);
  for (const [status, bookingStage] of [['pending','deputy_budget_allocation'], ['approved','driver_ack'], ['approved','completed'], ['rejected','rejected']]) {
    assert.doesNotMatch(render({ ...base, status, bookingStage }), /aria-label="แก้ไขคำขอ VB-test"/);
  }
  assert.doesNotMatch(render({ ...base, canEditRequest:false }), /aria-label="แก้ไขคำขอ VB-test"/);
});
test('another owner and already departed trips do not show edit action', () => {
  assert.doesNotMatch(render({ ...base, userId: 'someone-else' }), /aria-label="แก้ไขคำขอ/);
  assert.doesNotMatch(render({ ...base, startDate: '2000-01-01' }), /aria-label="แก้ไขคำขอ/);
});
