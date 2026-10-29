import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=readFileSync(new URL('../src/components/DocumentSigningViewer.tsx',import.meta.url),'utf8');
function load(name,next){
 const code=source.slice(source.indexOf(`function ${name}(`),source.indexOf(`function ${next}(`));
 const context=vm.createContext({TextEncoder,Uint8Array,Date});
 vm.runInContext(ts.transpile(code),context);
 return context[name];
}
test('receipt is 5 cm wide and 3 cm high at both preview and download resolutions',()=>{
 const paint=load('paintReceipt','decodeBase64DataUrl');
 for(const scale of [1.5,3]){
  let rectangle;
  const context={save(){},restore(){},strokeRect(...args){rectangle=args;},fillText(){},measureText(){return {width:20*scale};},beginPath(){},setLineDash(){},moveTo(){},lineTo(){},stroke(){}};
  paint(context,595.28*scale,841.89*scale,{receiptNo:'2210',date:'2026-10-26',time:'11:11'},595.28);
  assert.ok(Math.abs(rectangle[2]/scale*2.54/72-5)<1e-10);
  assert.ok(Math.abs(rectangle[3]/scale*2.54/72-3)<1e-10);
 }
});
