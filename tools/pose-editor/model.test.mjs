import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument,validateDocument,frameAt,JOINTS} from './model.mjs';
const manifest=JSON.parse(fs.readFileSync(new URL('./manifest.json',import.meta.url)));
test('all source frames and sequence references exist',()=>{
 for(const c of Object.values(manifest.characters)){
  for(const [file,w,h,ax,ay] of Object.values(c.frames)) {assert.ok(fs.existsSync(new URL('../../assets/sq/kf/'+file,import.meta.url)));assert.ok([w,h,ax,ay].every(Number.isFinite));}
  for(const steps of Object.values(c.sequences))for(const s of steps){assert.ok(c.frames[s.p]);assert.ok(s.ms>0);}
 }
});
test('every pose starts uncertain and round trips independently',()=>{
 for(const char of Object.keys(manifest.characters)){
  const d=makeDocument(char,manifest);assert.deepEqual(validateDocument(JSON.parse(JSON.stringify(d)),manifest),d);
  for(const p of Object.values(d.poses)){assert.equal(p.reviewed,false);assert.equal(Object.keys(p.joints).length,JOINTS.length);assert.ok(Object.values(p.joints).every(j=>j.status==='uncertain'));}
  const clone=validateDocument(d,manifest);clone.poses.idle_0.joints.head.x=0;assert.notEqual(d.poses.idle_0.joints.head.x,0);
 }
});
test('malformed and falsely reviewed imports are rejected',()=>{
 for(const mutate of [d=>d.schemaVersion=9,d=>d.character='other',d=>delete d.poses.idle_0,d=>d.poses.idle_0.joints.head.x=NaN,d=>d.poses.idle_0.joints.head.x=2,d=>d.poses.idle_0.reviewed=true,d=>d.poses.idle_0.attachments.unknown={x:0,y:0}]){
  const d=makeDocument('gyakari',manifest);mutate(d);assert.throws(()=>validateDocument(d,manifest));
 }
});
test('playback honors exact boundaries, looping and long elapsed times',()=>{
 const s=[{ms:230},{ms:320}];assert.equal(frameAt(s,0),0);assert.equal(frameAt(s,229),0);assert.equal(frameAt(s,230),1);assert.equal(frameAt(s,549),1);assert.equal(frameAt(s,550),0);assert.equal(frameAt(s,550*100+230),1);
});

test('smooth sampling uses anchor pixels across different image crops',async()=>{
 const {sampleScene}=await import('./model.mjs');
 const d=makeDocument('gyakari',manifest),c=manifest.characters.gyakari,s=[{p:'idle_0',ms:400},{p:'gult_1',ms:400}];
 const a=sampleScene(d,c,s,0,{smooth:true}),b=sampleScene(d,c,s,400,{smooth:true}),mid=sampleScene(d,c,s,200,{smooth:true});
 for(const name of JOINTS){assert.equal(mid.joints[name].x,(a.joints[name].x+b.joints[name].x)/2);assert.equal(mid.joints[name].y,(a.joints[name].y+b.joints[name].y)/2);}
 assert.equal(sampleScene(d,c,s,200).joints.head.x,a.joints.head.x);
 assert.equal(sampleScene(d,c,s,800,{smooth:true}).joints.head.x,a.joints.head.x);
});
test('weapons stay rigid and follow one hand until teleport, including loop boundary',async()=>{
 const {sampleScene}=await import('./model.mjs');
 const d=makeDocument('gyakari',manifest),c=manifest.characters.gyakari,s=[{p:'idle_0',ms:400},{p:'gult_1',ms:400}];
 for(const [id,hand]of [['idle_0','nearWrist'],['gult_1','farWrist']]){
  const p=d.poses[id],j=p.joints[hand],point=(x,y)=>({x,y,status:'uncertain',source:'manual'});
  p.equipment={spear:{hand},shield:{hand}};
  p.attachments={spearGrip:point(j.x,j.y),spearButt:point(j.x-.1,j.y),spearTip:point(j.x+.1,j.y),shieldCenter:point(j.x,j.y),shieldEdge:point(j.x+.08,j.y)};
 }
 const a=sampleScene(d,c,s,0,{smooth:true}),mid=sampleScene(d,c,s,200,{smooth:true}),before=sampleScene(d,c,s,399.999,{smooth:true}),cut=sampleScene(d,c,s,400,{smooth:true});
 const length=q=>q.attachments.spearTip.x-q.attachments.spearButt.x;
 assert.ok(Math.abs(length(a)-length(mid))<1e-9);assert.ok(Math.abs(length(a)-length(before))<1e-9);
 assert.equal(mid.attachments.spearGrip.x,mid.joints.nearWrist.x);assert.equal(cut.attachments.spearGrip.x,cut.joints.farWrist.x);
 assert.ok(Math.abs(before.attachments.spearGrip.x-cut.attachments.spearGrip.x)>1);
 assert.equal(cut.equipment.spear.hand,'farWrist');
 assert.equal(sampleScene(d,c,s,800,{smooth:true}).equipment.spear.hand,'nearWrist');
});
test('spear magnet chooses either wrist by pixel distance, including far hand',async()=>{
 const {wristMagnet}=await import('./model.mjs');
 const p=makeDocument('gyakari',manifest).poses.idle_0,frame=manifest.characters.gyakari.frames.idle_0;
 p.attachments={spearButt:{x:.7,y:p.joints.farWrist.y+.01},spearTip:{x:.95,y:p.joints.farWrist.y+.01}};
 assert.equal(wristMagnet(p,frame,10).hand,'farWrist');assert.equal(wristMagnet(p,frame,1),null);
});
test('legacy corrections and new weapon geometry round trip without replacing body poses',()=>{
 const d=makeDocument('gyakari',manifest);d.poses.idle_0.joints.head.x=.123;
 assert.deepEqual(validateDocument(d,manifest),d);
 d.poses.idle_0.equipment={spear:{hand:'farWrist'},shield:{hand:null}};
 for(const name of ['spearButt','shieldCenter','shieldEdge'])d.poses.idle_0.attachments[name]={x:.4,y:.5,status:'uncertain',source:'manual'};
 assert.deepEqual(validateDocument(JSON.parse(JSON.stringify(d)),manifest),d);
 d.poses.idle_0.equipment.spear.hand='left';assert.throws(()=>validateDocument(d,manifest));
});
