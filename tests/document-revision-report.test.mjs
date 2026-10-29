import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const React=require('react');
function load(path,globals={}) {
 const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const context=vm.createContext({exports:{},require,Error,...globals});vm.runInContext(code,context);return context.exports;
}
const helper=load('../src/lib/document-revision-report.ts');
const original={id:'DOC-1',title:'Plan',topic:'learner_quality',fileName:'original.pdf',createdBy:'owner',createdByName:'Teacher',createdAt:'2026-10-28 10:00:00',academicYear:'2569',semester:'1',fileVersion:1,status:'rejected',currentStep:2,signers:[{status:'signed'},{status:'rejected'}]};
const latest={...original,fileName:'latest.pdf',fileVersion:3,resubmittedAt:'2026-10-29 16:15:00',status:'completed',signers:[{status:'signed'},{status:'signed'}]};
const history=[{version:2,replacedAt:'2026-10-29 16:15:00',document:{...original,fileVersion:2,fileName:'second.pdf'}},{version:1,replacedAt:'2026-10-29 14:00:00',document:original}];
const t=(thai,english)=>thai;
test('timeline retains original submission and derives each corrected submission from its own version event',()=>{
 const entries=helper.documentRevisionTimeline(latest,history);
 assert.deepEqual(Array.from(entries,e=>[e.version,e.submittedAt,e.current]),[[1,'2026-10-28 10:00:00',false],[2,'2026-10-29 14:00:00',false],[3,'2026-10-29 16:15:00',true]]);
 assert.equal(history[0].version,2);
 assert.equal(latest.createdAt,original.createdAt);
 assert.equal(entries[0].supersededBy,2);
});
test('report aligns old/revised file names, submission dates, replacement status and their actual signature counts',()=>{
 const html=helper.documentRevisionReportRows([{items:[latest]}],new Map([['DOC-1',history]]),{t,topicLabel:()=> 'Learner report',statusLabel:d=>d.status});
 assert.match(html,/rowspan="3"/);
 assert.equal((html.match(/Teacher/g)||[]).length,1);
 assert.match(html,/original\.pdf[\s\S]*แก้ไขแล้ว — มีฉบับที่ 2 แทน[\s\S]*1 \/ 2/);
 assert.match(html,/second\.pdf[\s\S]*แก้ไขแล้ว — มีฉบับที่ 3 แทน/);
 assert.match(html,/latest\.pdf[\s\S]*ฉบับแก้ไขที่ 3[\s\S]*completed[\s\S]*2 \/ 2/);
 assert.match(html,/14:00/);assert.match(html,/16:15/);
});
test('unchanged files have one row, no invented correction date, and escaped document metadata',()=>{
 const item={...original,status:'completed',fileName:'<img src=x onerror=bad>.pdf',createdByName:'<script>bad</script>'};
 const html=helper.documentRevisionReportRows([{items:[item]}],new Map(),{t,topicLabel:()=>'<b>type</b>',statusLabel:()=> 'Completed'});
 assert.equal((html.match(/<tr /g)||[]).length,1);
 assert.doesNotMatch(html,/<script>|<img|ฉบับแก้ไขที่/);
 assert.match(html,/&lt;img/);assert.match(html,/&lt;script&gt;/);
 assert.equal(helper.documentSubmissionTime('invalid'),'—');
 assert.equal(helper.documentSubmissionTime(''), '—');
});
test('Bangkok submission timestamps remain the same for UTC and database representations',()=>{
 assert.equal(helper.documentSubmissionTime('2026-10-29 16:15:00'),helper.documentSubmissionTime('2026-10-29T09:15:00Z'));
});
test('export fetches revision history before rendering and keeps document totals separate from file versions',async()=>{
 let slot=0,html='',requested=[];
 const popup={closed:false,document:{open(){html='';},write(value){html+=value;},close(){}},focus(){},close(){this.closed=true;}};
 const hooks={...React,useState(initial){const index=slot++;return [index===0?[{...latest,signers:latest.signers.map((s,index)=>({...s,userId:'s'+index}))}]:index===2?false:typeof initial==='function'?initial():initial,()=>{}];},useEffect(){},useMemo:fn=>fn()};
 const {lessonPlanTopicLabel}=load('../src/lib/lessonPlanTopicLabel.ts');
 const {DocumentReviewModule}=load('../src/components/modules/DocumentReviewModule.tsx',{window:{open:()=>popup},require:name=>{
  if(name==='react')return hooks;
  if(name==='lucide-react')return new Proxy({},{get:()=>()=>null});
  if(name==='../../context/AppContext')return {useApp:()=>({currentUser:{id:'reviewer',name:'Reviewer'},academicPeriod:{academicYear:'2569',semester:'1'},addToast:()=>{}})};
  if(name==='../../context/LanguageContext')return {useLanguage:()=>({t})};
  if(name==='../../lib/api')return {documentWorkflowsApi:{history:async id=>{requested.push(id);return history;}}};
  if(name==='../../lib/lessonPlanTopicLabel')return {lessonPlanTopicLabel};
  if(name==='../../lib/useAcademicPeriodSelection')return {useAcademicPeriodSelection:()=>({academicYear:'2569',semester:'1'})};
  if(name==='../../lib/document-revision-report')return helper;
  if(name==='../DocumentRevisionNotice')return {DocumentRevisionNotice:()=>null};
  if(name==='../DocumentSigningViewer')return {DocumentSigningViewer:()=>null};
  return require(name);
 }});
 const nodes=root=>React.isValidElement(root)?[root,...React.Children.toArray(root.props.children).flatMap(nodes)]:[];
 const text=node=>React.isValidElement(node)?React.Children.toArray(node.props.children).map(text).join(''):String(node??'');
 const button=nodes(DocumentReviewModule()).find(node=>node.type==='button'&&text(node).includes('ออกรายงาน PDF'));
 button.props.onClick();await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(requested,['DOC-1']);
 assert.match(html,/เอกสาร: 1 \| ผู้ส่ง: 1 \| เสร็จสิ้น: 1 \| มีฉบับแก้ไข: 1/);
 assert.match(html,/@page\{size:A4 landscape/);assert.match(html,/thead\{display:table-header-group/);
 assert.match(html,/original\.pdf/);assert.match(html,/latest\.pdf/);assert.doesNotMatch(html,/กำลังเตรียมรายงาน/);
 if(process.env.MMV_REPORT_PROOF)writeFileSync(process.env.MMV_REPORT_PROOF,html);
});
