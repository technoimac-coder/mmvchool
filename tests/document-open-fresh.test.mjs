import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/components/modules/DocumentWorkflowModule.tsx', import.meta.url), 'utf8');
const start = source.indexOf('  const openCurrentDocument =');
const end = source.indexOf('  const personalItems =', start);
assert.ok(start >= 0 && end > start);
function setup(list) {
  const state = { selected: null, items: null, toasts: [], loading: [] };
  const context = vm.createContext({ openingId: null, documentWorkflowsApi: { list }, setOpeningId: value => state.loading.push(value), setItems: value => { state.items = value; }, setSelected: value => { state.selected = value; }, addToast: (...args) => state.toasts.push(args), exports: {} });
  vm.runInContext(ts.transpile(`${source.slice(start, end)}\nexports.open = openCurrentDocument;`, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }), context);
  return { state, open: context.exports.open };
}
test('opening an old list item loads the earlier signer’s latest saved signature', async () => {
  const stale = { id: 'doc', signers: [{ status: 'pending' }] };
  const fresh = { id: 'doc', signers: [{ status: 'signed', signatureData: 'data:image/png;base64,test', placement: { page: 1 } }] };
  const { state, open } = setup(async scope => { assert.equal(scope, 'personal'); return [fresh]; });
  await open(stale);
  assert.equal(state.selected, fresh);
  assert.equal(state.selected.signers[0].status, 'signed');
  assert.equal(state.selected.signers[0].signatureData, 'data:image/png;base64,test');
  assert.deepEqual(state.loading, ['doc', null]);
});
test('a failed refresh never opens an outdated signing document', async () => {
  const { state, open } = setup(async () => { throw new Error('offline'); });
  await open({ id: 'doc' });
  assert.equal(state.selected, null);
  assert.equal(state.toasts[0][1], 'error');
});
