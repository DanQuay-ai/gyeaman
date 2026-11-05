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
