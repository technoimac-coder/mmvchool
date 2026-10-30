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
const policy=load('../src/lib/document-correction.ts'), upload=load('../src/lib/document-upload.ts'), labels=load('../src/lib/lessonPlanTopicLabel.ts');
const item={id:'DOC-original',createdBy:'owner',title:'Plan',description:'Details',topic:'lesson_plan_before',fileName:'wrong.pdf',fileVersion:1,status:'pending',currentStep:1,academicYear:'2569',semester:'2',signers:[{userId:'first',step:1,status:'pending'},{userId:'second',step:2,status:'pending'}]};
function harness(record=item,api={}) {
  const slots=[];let cursor=0,busy=false;const saved=[],errors=[];
  const hooks={...React,useState: initial=>{const index=cursor++;if(!(index in slots))slots[index]=initial;return[slots[index],v=>{slots[index]=typeof v==='function'?v(slots[index]):v;}];},useRef:initial=>{const index=cursor++;return slots[index]??=( {current:initial});}};
  const {DocumentCorrectionPanel}=load('../src/components/DocumentCorrectionPanel.tsx',{crypto:{randomUUID:()=> '11111111-1111-4111-8111-111111111111'},require:name=>name==='react'?hooks:name==='../lib/api'?{documentWorkflowsApi:api}:name==='../lib/document-correction'?policy:name==='../lib/document-upload'?upload:name==='../lib/lessonPlanTopicLabel'?labels:require(name)});
  const render=()=>{cursor=0;return DocumentCorrectionPanel({item:record,userId:'owner',busy,onBusyChange:value=>{busy=value;},onSaved:value=>saved.push(value),onError:value=>errors.push(value)});};
  const nodes=root=>React.isValidElement(root)?[root,...React.Children.toArray(root.props.children).flatMap(nodes)]:[];
  const text=node=>React.isValidElement(node)?React.Children.toArray(node.props.children).map(text).join(''):String(node??'');
  const find=predicate=>nodes(render()).find(predicate);
  return{render,find,text,saved,errors};
}
test('sender correction is hidden as soon as any signer acted, and for other owners/e-Office/closed records',()=>{
  assert.equal(policy.canCorrectDocument(item,'owner'),true);
  assert.equal(policy.canCorrectDocument({...item,status:'rejected',signers:[{...item.signers[0],status:'rejected'},item.signers[1]]},'owner'),true);
  for(const blocked of [{...item,createdBy:'other'},{...item,id:'EO-one'},{...item,status:'completed'},{...item,currentStep:2},
    {...item,signers:[{...item.signers[0],status:'signed'}]}, {...item,signers:[{...item.signers[0],signedAt:'2026-10-30'}]}, {...item,signers:[{...item.signers[0],signatureData:'data:image/png;base64,signature'}]}]) {
    assert.equal(policy.canCorrectDocument(blocked,'owner'),false);assert.equal(harness(blocked).render(),null);
  }
});
test('wrong category can be corrected without re-uploading; file/id/version and retry token are sent together',async()=>{
  const calls=[];const view=harness(item,{correctSubmission:async(...args)=>{calls.push(args);return {...item,topic:args[1].topic,fileVersion:2};}});
  view.find(node=>node.type==='button').props.onClick();
  const category=view.find(node=>node.type==='select');category.props.onChange({target:{value:'course_plan'}});
  await view.find(node=>node.type==='form').props.onSubmit({preventDefault(){}});
  assert.equal(calls.length,1);assert.equal(calls[0][0],item.id);assert.equal(calls[0][1].topic,'course_plan');assert.equal(calls[0][2],null);assert.equal(calls[0][3],1);assert.ok(calls[0][4]);assert.equal(view.saved.length,1);
});
test('replacement validates the PDF; a signature race rejection keeps the form open and does not report success',async()=>{
  const view=harness(item,{correctSubmission:async()=>{throw new Error('มีผู้ลงนามแล้ว');}});
  view.find(node=>node.type==='button').props.onClick();
  const select=file=>view.find(node=>node.props['aria-label']==='เปลี่ยนไฟล์ก่อนลงนาม').props.onChange({currentTarget:{files:[file],value:'chosen'}});
  select(new File(['bad'],'bad.docx'));assert.match(view.errors.at(-1),/PDF/);
  select(new File(['%PDF-1.7'],'correct.pdf'));await view.find(node=>node.type==='form').props.onSubmit({preventDefault(){}});
  assert.equal(view.saved.length,0);assert.match(view.errors.at(-1),/ลงนามแล้ว/);assert.ok(view.find(node=>node.type==='form'));
});
test('API posts optional replacement, corrected category, original ID and expected version with session credentials',async()=>{
  const calls=[];
  const {documentWorkflowsApi}=load('../src/lib/api.ts',{Headers,FormData,fetch:async(path,init)=>{calls.push({path,init});return new Response(JSON.stringify({status:'success',data:item}));}});
  const metadata={title:'Course',topic:'course_plan',description:'Fixed'};
  await documentWorkflowsApi.correctSubmission(item.id,metadata,null,2,'retry');
  const first=calls[0].init.body;
  assert.equal(first.get('topic'),'course_plan');assert.equal(first.get('id'),item.id);assert.equal(first.get('fileVersion'),'2');assert.equal(first.get('document'),null);
  assert.equal(first.get('createdBy'),null);assert.equal(first.get('academicYear'),null);assert.equal(calls[0].init.credentials,'same-origin');
  await documentWorkflowsApi.correctSubmission(item.id,metadata,new File(['%PDF-1.7'],'fixed.pdf'),2,'retry2');
  assert.equal(calls[1].init.body.get('document').name,'fixed.pdf');
});
