import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function selectionHarness() {
  let stored;
  const code = ts.transpileModule(readFileSync(new URL('../src/lib/useAcademicPeriodSelection.ts', import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const context = vm.createContext({ exports: {}, require: name => {
    assert.equal(name, 'react');
    return { useState: initial => {
      stored ??= initial;
      return [stored, update => { stored = typeof update === 'function' ? update(stored) : update; }];
    } };
  } });
  vm.runInContext(code, context);
  return context.exports.useAcademicPeriodSelection;
}
const current = { academicYear: '2569', semester: '2' };

test('late school settings replace the initial calendar year and semester in the same mounted view', () => {
  const render = selectionHarness();
  let state = render({ academicYear: '2568', semester: '1' });
  assert.equal(state.academicYear, '2568');
  state = render(current);
  assert.equal(state.academicYear, '2569');
  assert.equal(state.semester, '2');
});

test('history is selectable until a configured year or semester rollover restores the school default', () => {
  const render = selectionHarness();
  let state = render(current);
  state.setAcademicYear('2568');
  state.setSemester('all');
  state = render(current);
  assert.equal(state.academicYear, '2568');
  assert.equal(state.semester, 'all');
  state = render({ academicYear: '2570', semester: '1' });
  assert.equal(state.academicYear, '2570');
  assert.equal(state.semester, '1');
  state.setSemester('2');
  state = render({ academicYear: '2570', semester: '1' });
  assert.equal(state.academicYear, '2570');
  assert.equal(state.semester, '2');
  state = render({ academicYear: '2570', semester: '2' });
  assert.equal(state.academicYear, '2570');
  assert.equal(state.semester, '2');
});

test('all-year history selection is also reset when configured school settings change', () => {
  const render = selectionHarness();
  let state = render(current);
  state.setAcademicYear('all');
  state = render(current);
  assert.equal(state.academicYear, 'all');
  state = render({ academicYear: '2570', semester: '1' });
  assert.equal(state.academicYear, '2570');
  assert.equal(state.semester, '1');
});

test('returning to a previously configured period does not revive an older history filter', () => {
  const render = selectionHarness();
  let state = render(current);
  state.setAcademicYear('2568');
  state.setSemester('all');
  render({ academicYear: '2570', semester: '1' });
  state = render(current);
  assert.equal(state.academicYear, '2569');
  assert.equal(state.semester, '2');
});
