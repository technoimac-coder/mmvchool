import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const React = require('react');
function load(path, globals={}) {
  const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const context=vm.createContext({exports:{},require,Error,...globals});vm.runInContext(code,context);return context.exports;
}
const uploadLib=load('../src/lib/document-upload.ts');
const returned={id:'DOC-1',createdBy:'owner',status:'rejected',fileName:'old.pdf',fileVersion:1};
function panelHarness(item=returned,api={}) {
  const slots=[];let cursor=0,busy=false;
  const saved=[],errors=[],opened=[];
  const hooks={...React,useState(initial){const index=cursor++;if(!(index in slots))slots[index]=initial;return [slots[index],value=>{slots[index]=typeof value==='function'?value(slots[index]):value;}];},useRef(initial){const index=cursor++;if(!(index in slots))slots[index]={current:initial};return slots[index];}};
  const {DocumentRevisionPanel}=load('../src/components/DocumentRevisionPanel.tsx',{crypto:{randomUUID:()=> 'bdab1000-8326-4ac6-92d2-d77ec0001111'},require:name=>name==='react'?hooks:name==='../lib/api'?{documentWorkflowsApi:api}:name==='../lib/document-upload'?uploadLib:name==='../lib/document-correction'?load('../src/lib/document-correction.ts'):name==='../lib/document-revision-report'?load('../src/lib/document-revision-report.ts'):require(name)});
  const nodes=root=>React.isValidElement(root)?[root,...React.Children.toArray(root.props.children).flatMap(nodes)]:[];
  const text=node=>React.isValidElement(node)?React.Children.toArray(node.props.children).map(text).join(''):String(node??'');
  const render=()=>{cursor=0;return DocumentRevisionPanel({item,userId:'owner',busy,onBusyChange:value=>{busy=value;},onSaved:value=>saved.push(value),onError:value=>errors.push(value),onOpenRevision:value=>opened.push(value)});};
  const find=predicate=>nodes(render()).find(predicate);
  const pick=file=>find(node=>node.type==='input').props.onChange({currentTarget:{files:[file],value:'selected'}});
  return {find,pick,saved,errors,opened,text};
}
test('only owner of a returned submission can select a replacement, with no upload for pending/completed/e-Office',()=>{
  for(const item of [{...returned,createdBy:'other'},{...returned,status:'pending'},{...returned,status:'completed'},{...returned,id:'EO-1'}]) assert.equal(panelHarness(item).find(node=>node.type==='input'),undefined);
  const panel=panelHarness();assert.ok(panel.find(node=>node.type==='input'));
  panel.pick(new File(['bad'],'bad.docx'));assert.equal(panel.errors.at(-1),uploadLib.documentFileError({name:'bad.docx',size:3}));
});
test('retry after network failure reuses request key and upload version; double click cannot submit twice',async()=>{
  const calls=[];let fail=true;
  const api={async resubmit(...args){calls.push(args);if(fail)throw new Error('network interrupted');return {...returned,status:'pending',fileVersion:2};}};
  const panel=panelHarness(returned,api);
  panel.pick(new File(['%PDF-1.7\n'],'fixed.pdf',{type:'application/pdf'}));
  const button=()=>panel.find(node=>node.type==='button'&&panel.text(node)==='อัปโหลดและส่งลงนามใหม่');
  const first=button().props.onClick();
  // onClick starts an async task; drain its microtasks before retrying.
  await first;await new Promise(resolve=>setImmediate(resolve));
  assert.equal(panel.saved.length,0);assert.equal(panel.errors.at(-1),'network interrupted');
  fail=false;
  const click=button().props.onClick;click();click();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls.length,2);assert.equal(calls[0][3],calls[1][3]);assert.equal(calls[1][2],1);
  assert.equal(panel.saved[0].fileVersion,2);
});
test('previous versions load separately and open their archived document without changing the current submission',async()=>{
  const old={...returned,fileUrl:'/api/document_workflows.php?download=DOC-1&version=1'};
  let requested='';
  const panel=panelHarness({...returned,fileVersion:2,status:'pending'},{async history(id){requested=id;return [{version:1,replacedAt:'2026-10-29',document:old}];}});
  panel.find(node=>node.type==='button'&&panel.text(node)==='ดูประวัติฉบับก่อนแก้ไข').props.onClick();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(requested,'DOC-1');
  panel.find(node=>node.type==='button'&&panel.text(node).includes('เปิดฉบับที่ 1')).props.onClick();
  assert.equal(panel.opened[0].fileUrl,old.fileUrl);assert.equal(panel.saved.length,0);
});
test('API uploads original ID and expected version and adds version to sign/reject requests',async()=>{
  const calls=[];
  const {documentWorkflowsApi}=load('../src/lib/api.ts',{Headers,FormData,fetch:async(path,init)=>{calls.push({path,init});return new Response(JSON.stringify({status:'success',data:{id:'DOC-1'}}));}});
  const file=new File(['%PDF-1.7\n'],'fixed.pdf');
  await documentWorkflowsApi.resubmit('DOC-1',file,2,'retry-key');
  const form=calls[0].init.body;
  assert.equal(form.get('action'),'resubmit');assert.equal(form.get('id'),'DOC-1');assert.equal(form.get('fileVersion'),'2');
  assert.equal(form.get('academicYear'),null);assert.equal(form.get('createdBy'),null);
  await documentWorkflowsApi.sign('DOC-1','signature',{page:1,x:0,y:0,width:.2,height:.1},'',{},'',[],[],undefined,2);
  await documentWorkflowsApi.reject('DOC-1','reason','',2);
  for(const call of calls.slice(1))assert.equal(JSON.parse(call.init.body).fileVersion,2);
});
