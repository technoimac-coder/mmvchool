import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = readFileSync(new URL('../src/lib/leave-schedule.ts', import.meta.url), 'utf8');
const context = vm.createContext({ exports: {}, Date });
vm.runInContext(ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }), context);
const { leaveScheduleDates, leaveScheduleTotal } = context.exports;

test('Friday through Monday counts 1.5 when Friday is a half day', () => {
  const days = leaveScheduleDates('2026-11-13', '2026-11-16');
  assert.deepEqual(Array.from(days, day => day.period), ['full', 'none', 'none', 'full']);
  days[0].period = 'morning';
  assert.equal(leaveScheduleTotal(days), 1.5);
});
test('reject invalid, reversed and excessive ranges', () => {
  for (const [start, end] of [['2026-02-30', '2026-03-01'], ['2026-12-01', '2026-11-30'], ['2025-01-01', '2027-01-01']]) assert.equal(leaveScheduleDates(start, end).length, 0);
});
