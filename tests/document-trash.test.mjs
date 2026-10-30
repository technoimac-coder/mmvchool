import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const require=createRequire(import.meta.url), React=require('react');
function load(path, globals={}) {
  const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const context=vm.createContext({exports:{},require,Error,...globals});vm.runInContext(code,context);return context.exports;
}
const policy=load('../src/lib/document-correction.ts');
const item={id:'DOC-owned',createdBy:'owner',title:'Own plan',fileName:'original.pdf',fileVersion:3,lifecycleVersion:2,status:'pending',currentStep:1,signers:[{userId:'first',step:1,status:'pending'}]};
function harness(component,props,api) {
  const slots=[];let cursor=0;const saved=[],errors=[];
  const hooks={...React,useState:initial=>{const index=cursor++;if(!(index in slots))slots[index]=typeof initial==='function'?initial():initial;return[slots[index],value=>{slots[index]=typeof value==='function'?value(slots[index]):value;}];},useRef:initial=>{const index=cursor++;return slots[index]??={current:initial};}};
  const Component=load('../src/components/'+component+'.tsx',{require:name=>name==='react'?hooks:name==='../lib/api'?{documentWorkflowsApi:api}:name==='../lib/document-correction'?policy:require(name)})[component];
  const callbacks={onSaved:updated=>saved.push(updated),onRestored:updated=>saved.push(updated),onError:error=>errors.push(error),onBusyChange:busy=>{props.busy=busy;}};
  const render=()=>{cursor=0;return Component({...props,...callbacks});};
  const nodes=root=>React.isValidElement(root)?[root,...React.Children.toArray(root.props.children).flatMap(nodes)]:[];
  const text=node=>React.isValidElement(node)?React.Children.toArray(node.props.children).map(text).join(''):String(node??'');
  const find=predicate=>nodes(render()).find(predicate);
  return {render,find,text,saved,errors};
}
test('delete control is owner-only and hidden for signed, deleted and e-Office records',()=>{
  for(const record of [{...item,createdBy:'other'},{...item,deletedAt:'2026-10-30'},{...item,id:'EO-book'},{...item,status:'completed'},{...item,signers:[{...item.signers[0],status:'signed',signatureData:'signed'}]}]) {
    assert.equal(harness('DocumentDeletePanel',{item:record,userId:'owner',busy:false},{}).render(),null);
  }
});
test('delete requires explicit title confirmation, supports cancellation and submits exact document/version/generation',async()=>{
  const calls=[];const view=harness('DocumentDeletePanel',{item,userId:'owner',busy:false},{setDeleted:async(...args)=>{calls.push(args);return {...item,deletedAt:'now'};}});
  view.find(node=>node.type==='button').props.onClick(); assert.equal(calls.length,0);
  assert.match(view.text(view.render()),/Own plan/);
  view.find(node=>node.type==='button'&&view.text(node)==='ยกเลิก').props.onClick();assert.equal(calls.length,0);
  view.find(node=>node.type==='button').props.onClick();
  await view.find(node=>node.type==='button'&&view.text(node)==='ยืนยันลบ').props.onClick();
  assert.deepEqual(calls,[[item.id,true,3,2]]);assert.equal(view.saved.length,1);
});
test('a signer race rejection keeps confirmation visible and never removes the item from the page',async()=>{
  const view=harness('DocumentDeletePanel',{item,userId:'owner',busy:false},{setDeleted:async()=>{throw new Error('มีผู้ลงนามแล้ว');}});
  view.find(node=>node.type==='button').props.onClick();
  await view.find(node=>node.type==='button'&&view.text(node)==='ยืนยันลบ').props.onClick();
  assert.equal(view.saved.length,0);assert.match(view.errors.at(-1),/ลงนามแล้ว/);assert.ok(view.find(node=>node.props['aria-label']==='ยืนยันลบเอกสาร'));
});
test('personal trash hides other senders and restores a single selected record',async()=>{
  const calls=[];const view=harness('DocumentTrashPanel',{userId:'owner'},{trash:async()=>[{...item,deletedAt:'now'},{...item,id:'other',createdBy:'other',title:'PRIVATE'}],setDeleted:async(...args)=>{calls.push(args);return item;}});
  await view.find(node=>node.type==='button').props.onClick();
  assert.doesNotMatch(view.text(view.render()),/PRIVATE/);
  await view.find(node=>node.type==='button'&&view.text(node)==='นำกลับคืน').props.onClick();
  assert.deepEqual(calls,[[item.id,false,3,2]]);assert.equal(view.saved[0].id,item.id);
  assert.match(view.text(view.render()),/ไม่มีเอกสารที่ลบ/);
});
test('API actions use session credentials, original ID, file version and lifecycle generation',async()=>{
  const calls=[];
  const {documentWorkflowsApi}=load('../src/lib/api.ts',{Headers,FormData,fetch:async(path,init={})=>{calls.push({path,init});return new Response(JSON.stringify({status:'success',data:item}));}});
  await documentWorkflowsApi.setDeleted(item.id,true,3,2);await documentWorkflowsApi.setDeleted(item.id,false,3,3);await documentWorkflowsApi.trash();
  assert.deepEqual(JSON.parse(calls[0].init.body),{action:'delete_submission',id:item.id,fileVersion:3,lifecycleVersion:2});
  assert.equal(JSON.parse(calls[1].init.body).action,'restore_submission');assert.equal(calls[0].init.credentials,'same-origin');
  assert.equal(calls[2].path,'/api/document_workflows.php?trash=1');
});
