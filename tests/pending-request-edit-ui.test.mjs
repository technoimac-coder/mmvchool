import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const compiled = ts.transpileModule(readFileSync(new URL('../src/components/PendingRequestEditButton.tsx', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
function editor(module, item) {
  const states = []; let cursor = 0; const saved = [];
  const context = { currentUser: { id:'owner' }, users:[], rooms:[], vehicles:[], pipelinesConfig:[], addToast(){}, editPendingRequest: async (...args) => { saved.push(args); return true; } };
  const hooks = {
    useState(initial) { const i=cursor++; if(!(i in states))states[i]=typeof initial==='function'?initial():initial; return [states[i],value=>{states[i]=typeof value==='function'?value(states[i]):value;}]; },
    useRef(initial) { const i=cursor++; if(!(i in states))states[i]={current:initial}; return states[i]; },
  };
  const stubRequire = name => name==='react' ? hooks : name==='react-dom' ? { createPortal: content=>content }
    : name.includes('context/AppContext') ? { useApp:()=>context }
    : name.includes('config/approvalWorkflow') ? { getPipelineAssignee:()=> 'owner' }
    : name.includes('SignaturePadModal') ? { SignaturePadModal:()=>null }
    : name.includes('SearchableTeacherSelect') ? { SearchableTeacherSelect:()=>null } : require(name);
  const mod={ exports:{} };
  new Function('require','module','exports','document',compiled)(stubRequire,mod,mod.exports,{body:{}});
  const render=()=>{cursor=0;return mod.exports.PendingRequestEditButton({module,item});};
  const nodes=root=>React.isValidElement(root)?[root,...React.Children.toArray(root.props.children).flatMap(nodes)]:[];
  const find=predicate=>nodes(render()).find(predicate);
  return { render,find,saved };
}

test('edit buttons require both owner and server-confirmed unstarted status in all five modules',()=>{
  for(const module of ['leave','official_duty','room','repair','substitute']) {
    const key=module==='substitute'?'createdBy':'userId';
    assert.ok(editor(module,{id:'one',[key]:'owner',canEditRequest:true}).render());
    assert.equal(editor(module,{id:'one',[key]:'other',canEditRequest:true}).render(),null);
    assert.equal(editor(module,{id:'one',[key]:'owner',canEditRequest:false}).render(),null);
    assert.equal(editor(module,{id:'one',[key]:'owner'}).render(),null);
  }
});

test('editing preserves original ID, period, attachments and captured version; saves changed data once',async()=>{
  const original={id:'leave-one',userId:'owner',canEditRequest:true,requestVersion:4,academicYear:'2569',semester:'2',reason:'Original',signatureUrl:'data:image/png;base64,synthetic',attachments:[{name:'synthetic.pdf',dataUrl:'data:application/pdf;base64,c3ludGhldGlj'}]};
  const ui=editor('leave',original);
  ui.find(node=>node.type==='button').props.onClick();
  const reason=ui.find(node=>node.type==='textarea'&&node.props.value==='Original');
  reason.props.onChange({target:{value:'Revised'}});
  const save=ui.find(node=>node.type==='form');
  await save.props.onSubmit({preventDefault(){}});
  assert.equal(ui.saved.length,1);
  const [module,id,version,data,key]=ui.saved[0];
  assert.equal(module,'leave');assert.equal(id,'leave-one');assert.equal(version,4);
  assert.equal(data.reason,'Revised');assert.equal(data.academicYear,'2569');assert.equal(data.semester,'2');assert.deepEqual(data.attachments,original.attachments);
  assert.match(key,/^[a-f\d-]{36}$/);
  assert.equal(original.reason,'Original');
});
