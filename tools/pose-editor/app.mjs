import {JOINTS,BONES,ATTACHMENTS,makeDocument,validateDocument,frameAt,sampleScene,wristMagnet} from './model.mjs';
const $=id=>document.getElementById(id), svg=$('canvas'), NS='http://www.w3.org/2000/svg';
let manifest, doc, char='gyakari', sequence='all', index=0, playing=false, smooth=false, elapsed=0, lastTime=0;
let selected='head', dragging=null, transform, layout, history=[], tool='select';
const asset=file=>'../../assets/sq/kf/'+file;
// Keep the original storage key and document contract so existing corrections load unchanged.
const key=()=> 'gyeaman-poses-v1-'+char;
const character=()=>manifest.characters[char];
const steps=()=>sequence==='all'?Object.keys(character().frames).map(p=>({p,ms:400})):character().sequences[sequence];
const frameId=()=>steps()[index].p;
const pose=()=>doc.poses[frameId()];
const point=()=>pose().joints[selected]||pose().attachments[selected];
const clamp=v=>Math.max(0,Math.min(1,v));
const landmark=p=>({x:p.x,y:p.y,status:'uncertain',source:'manual'});
const atFrameStart=()=>steps().slice(0,index).reduce((n,s)=>n+s.ms,0);
function notice(text){$('notice').textContent=text;}
function stop(){playing=false;updatePlayButtons();}
function updatePlayButtons(){
 $('play').textContent=playing&&!smooth?'Pause':'Play';
 $('smoothPlay').textContent=playing&&smooth?'Ⅱ Pause smooth':'▶ Smooth play';
 $('smoothPlay').setAttribute('aria-pressed',String(playing&&smooth));
}
function checkpoint(){stop();history.push(JSON.stringify(doc));if(history.length>60)history.shift();}
function save(){
 try{localStorage.setItem(key(),JSON.stringify(doc));$('saveStatus').textContent='Saved in this browser · export JSON for a portable backup.';}
 catch{$('saveStatus').textContent='Browser storage unavailable. Export JSON to keep your work.';}
}
function loadCharacter(){
 stop();char=$('character').value;sequence='all';index=0;history=[];selected='head';
 doc=makeDocument(char,manifest);let restored=false,failed=false;
 try{const saved=localStorage.getItem(key());if(saved){const next=validateDocument(JSON.parse(saved),manifest);if(next.character!==char)throw Error('Wrong cached character');doc=next;restored=true;}}
 catch{failed=true;}
 $('sequence').replaceChildren();
 for(const [value,label] of [['all','All source poses · 400 ms inspection holds'],...Object.keys(character().sequences).map(k=>[k,k+' · game sequence'])])$('sequence').add(new Option(label,value));
 $('characterNote').textContent=char==='gyakari'?'16 source poses. Suggestions and your saved corrections; unreviewed joints remain orange.':'Agyekum uses the bayi asset ID. Generic template suggestions only; every pose needs a mapping pass.';
 setTool('select');render();
 notice(failed?'Saved draft could not be restored. The stored copy is untouched; import a backup before editing.':restored?'Your saved corrections are restored. New equipment tools do not change the body mapping.':'Ready. Drag a joint, or choose the shield / spear tool.');
}
function rebuildLandmarks(){
 $('joint').replaceChildren();for(const id of [...JOINTS,...Object.keys(pose().attachments)])$('joint').add(new Option(id,id));
 if(!point())selected='head';$('joint').value=selected;
}
function el(tag,attrs,parent=svg){const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);parent.append(n);return n;}
function position(p){return {x:layout.originX+p.x*layout.scale,y:layout.originY+p.y*layout.scale};}
function draw(){
 const id=frameId(),[file,w,h,ax,ay]=character().frames[id],data=character(),moving=$('motion').checked&&sequence!=='all';
 const extent=Object.values(data.frames).reduce((a,[,fw,fh,fx,fy])=>({left:Math.min(a.left,-fx),right:Math.max(a.right,fw-fx),top:Math.min(a.top,-fy),bottom:Math.max(a.bottom,fh-fy)}),{left:0,right:0,top:0,bottom:0});
 const scale=Math.min(870/(extent.right-extent.left+(moving?data.ref*.9:0)),650/(extent.bottom-extent.top+(moving?data.ref*.6:0)));
 const originX=65-extent.left*scale,originY=700-extent.bottom*scale,step=steps()[index];
 const dx=moving?(step.x||0)*data.ref:0,dy=moving?-(step.y||0)*data.ref:0;
 layout={originX,originY,scale};transform={x:originX+(dx-ax)*scale,y:originY+(dy-ay)*scale,w:w*scale,h:h*scale};
 const scene=sampleScene(doc,data,steps(),playing?elapsed:atFrameStart(),{smooth:playing&&smooth,motion:moving});
 svg.replaceChildren();svg.dataset.playback=playing?(smooth?'smooth':'keyframes'):'paused';svg.dataset.fraction=scene.fraction.toFixed(4);
 el('line',{x1:30,x2:970,y1:originY,y2:originY,stroke:'#47624f','stroke-dasharray':'6 8'});
 el('text',{x:30,y:originY+20,fill:'#7d9584','font-size':12}).textContent='GAME FLOOR / SHARED ANCHOR';
 if($('sprite').checked && !(playing&&smooth)){
  const im=el('image',{href:asset(file),x:transform.x,y:transform.y,width:transform.w,height:transform.h});
  im.addEventListener('error',()=>notice('Sprite failed to load: '+file));
 }
 const drawBone=(a,b,className='bone')=>{if(!a||!b)return;const p=position(a),q=position(b);el('line',{x1:p.x,y1:p.y,x2:q.x,y2:q.y,class:className});};
 for(const [a,b]of BONES)drawBone(scene.joints[a],scene.joints[b]);
 const attachments=scene.attachments;
 if(attachments.shieldCenter&&attachments.shieldEdge){
  const c=position(attachments.shieldCenter),e=position(attachments.shieldEdge);
  el('circle',{cx:c.x,cy:c.y,r:Math.hypot(e.x-c.x,e.y-c.y),class:'weapon-shield','data-weapon':'shield'});
  drawBone(attachments.shieldCenter,attachments.shieldEdge,'weapon-link');
 }
 if(attachments.spearButt&&attachments.spearTip){
  const a=position(attachments.spearButt),b=position(attachments.spearTip),angle=Math.atan2(b.y-a.y,b.x-a.x);
  el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'weapon-spear','data-weapon':'spear'});
  const back={x:b.x-Math.cos(angle)*18,y:b.y-Math.sin(angle)*18};
  el('path',{d:`M${b.x},${b.y} L${back.x-Math.sin(angle)*7},${back.y+Math.cos(angle)*7} L${back.x+Math.sin(angle)*7},${back.y-Math.cos(angle)*7} Z`,class:'weapon-tip'});
 }
 for(const weapon of ['spear','shield']){
  const hand=scene.equipment[weapon]?.hand,grip=attachments[weapon+'Grip'];
  if(hand&&grip)drawBone(scene.joints[hand],grip,'weapon-link');
 }
 // Keep old point-only attachment documents visible even before full markers are placed.
 if(!attachments.spearButt)drawBone(attachments.spearGrip,attachments.spearTip,'weapon-link');
 for(const [name,p]of Object.entries({...scene.joints,...attachments})){
  const pos=position(p),attached=ATTACHMENTS.includes(name);
  const c=el('circle',{cx:pos.x,cy:pos.y,r:name===selected?10:8,fill:attached?'#c4a1f8':p.status==='confirmed'?'#9ce0b9':'#f4b56a',class:'joint'+(name===selected?' selected':''),'data-joint':name});
  el('title',{},c).textContent=name+' · '+p.status;
  if($('labels').checked)el('text',{x:pos.x+12,y:pos.y-9,class:'joint-label'}).textContent=name;
 }
}
function inspector(){
 const p=point();if(!p)return;
 $('joint').value=selected;$('x').value=p.x.toFixed(3);$('y').value=p.y.toFixed(3);
 $('jointStatus').textContent=p.status+' · '+p.source;
 $('reviewBadge').textContent=pose().reviewed?'✓ Validated':'Needs review';
 $('progress').textContent=Object.values(doc.poses).filter(p=>p.reviewed).length+' / '+Object.keys(doc.poses).length+' poses validated';
 $('undo').disabled=!history.length;
 for(const weapon of ['spear','shield'])$(weapon+'Hand').value=pose().equipment?.[weapon]?.hand||'';
 $('equipmentStatus').textContent='Equipment: teleport at frame changes · body: '+(playing&&smooth?'smooth interpolation':'keyframe pose');
}
function render(){
 if(!point())selected='head';rebuildLandmarks();draw();inspector();updatePlayButtons();
 $('poseTitle').textContent=character().name+' / '+frameId();
 const step=steps()[index],f=character().frames[frameId()];
 $('stepInfo').textContent=`${index+1} / ${steps().length} · ${step.ms} ms${step.ev?' · '+step.ev:''}`;
 $('metadata').textContent=playing&&smooth?'Smooth skeleton preview · source artwork hidden · shield / spear keep their shape and teleport at each frame boundary':`${f[1]} × ${f[2]} px · anchor (${f[3]}, ${f[4]}) · reference height ${character().ref} · ${sequence==='all'?'inspection order, not a game animation':'original game timing'}`;
 $('timeline').replaceChildren();
 steps().forEach((s,i)=>{
  const b=document.createElement('button');b.className='frame'+(i===index?' active':'');b.setAttribute('aria-label',`Frame ${i+1}: ${s.p}`);b.setAttribute('aria-pressed',String(i===index));
  const image=document.createElement('img');image.src=asset(character().frames[s.p][0]);image.alt='';b.append(image);
  const label=document.createElement('span');label.textContent=`${s.p} · ${s.ms}ms`;b.append(label);b.onclick=()=>selectFrame(i);$('timeline').append(b);
 });
}
function selectFrame(i){stop();index=(i+steps().length)%steps().length;render();}
function editPoint(x,y){
 const p=point(),next={x:clamp(x),y:clamp(y)};
 // Moving center / grip handles translates the whole marker without stretching its shape.
 const group=selected==='shieldCenter'?['shieldCenter','shieldEdge','shieldGrip']:selected==='spearGrip'?['spearButt','spearTip','spearGrip']:null;
 if(group&&group.some(k=>k!==selected&&pose().attachments[k])){
  const members=group.map(k=>pose().attachments[k]).filter(Boolean),dx=next.x-p.x,dy=next.y-p.y;
  const tx=Math.max(-Math.min(...members.map(q=>q.x)),Math.min(1-Math.max(...members.map(q=>q.x)),dx));
  const ty=Math.max(-Math.min(...members.map(q=>q.y)),Math.min(1-Math.max(...members.map(q=>q.y)),dy));
  members.forEach(q=>{q.x+=tx;q.y+=ty;q.source='manual';q.status='uncertain';});
 }else{p.x=next.x;p.y=next.y;p.source='manual';p.status='uncertain';}
 pose().reviewed=false;draw();inspector();
}
function pointer(e){const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());return {x:clamp((p.x-transform.x)/transform.w),y:clamp((p.y-transform.y)/transform.h)};}
function setTool(next){
 tool=next;for(const name of ['select','shield','spear']){$('tool-'+name).classList.toggle('active',name===tool);$('tool-'+name).setAttribute('aria-pressed',String(name===tool));}
 svg.parentElement.classList.toggle('drawing',tool!=='select');
 $('toolHint').textContent=tool==='shield'?'Shield · drag center → rim':tool==='spear'?'Spear · drag end → tip · wrist magnet':'Select · drag joints or marker handles';
}
for(const name of ['select','shield','spear'])$('tool-'+name).onclick=()=>{stop();setTool(name);render();};
document.addEventListener('keydown',e=>{if(e.target.closest('input,select,textarea,button')||e.metaKey||e.ctrlKey||e.altKey||dragging)return;const next={v:'select',s:'shield',p:'spear',Escape:'select'}[e.key];if(next){e.preventDefault();stop();setTool(next);render();}});
function setHand(weapon,hand){pose().equipment??={};pose().equipment[weapon]={hand};}
function snapSpear(){
 if(!$('magnet').checked)return false;
 const hit=wristMagnet(pose(),character().frames[frameId()],22/layout.scale);
 if(!hit)return false;
 const wrist=pose().joints[hit.hand],dx=wrist.x-hit.grip.x,dy=wrist.y-hit.grip.y;
 const ends=['spearButt','spearTip'].map(k=>pose().attachments[k]);
 if(ends.some(p=>p.x+dx<0||p.x+dx>1||p.y+dy<0||p.y+dy>1))return false;
 for(const p of ends){p.x+=dx;p.y+=dy;p.status='uncertain';p.source='manual';}
 pose().attachments.spearGrip=landmark(wrist);setHand('spear',hit.hand);
 notice('Spear magnet → '+(hit.hand==='nearWrist'?'near wrist':'far wrist')+'. This pose keeps its own hand choice.');return true;
}
function updateSpearGrip(){
 const a=pose().attachments.spearButt,b=pose().attachments.spearTip;
 if(a&&b)pose().attachments.spearGrip=landmark({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
}
svg.addEventListener('pointerdown',e=>{
 if(e.button!==0||dragging)return;
 const name=e.target.getAttribute('data-joint');
 if(tool==='select'&&!name)return;
 checkpoint();render();const start=pointer(e);
 dragging={id:e.pointerId,tool,start};svg.setPointerCapture(e.pointerId);
 if(tool==='select'){selected=name;}
 else if(tool==='shield'){
  pose().attachments.shieldCenter=landmark(start);pose().attachments.shieldEdge=landmark(start);pose().attachments.shieldGrip=landmark(start);setHand('shield',null);selected='shieldEdge';
 }else{
  pose().attachments.spearButt=landmark(start);pose().attachments.spearTip=landmark(start);pose().attachments.spearGrip=landmark(start);setHand('spear',null);selected='spearTip';
 }
 render();e.preventDefault();
});
svg.addEventListener('pointermove',e=>{if(dragging?.id!==e.pointerId)return;const p=pointer(e);editPoint(p.x,p.y);if(dragging.tool==='spear'){updateSpearGrip();draw();}});
function endDrag(e){
 if(dragging?.id!==e.pointerId)return;
 const action=dragging;dragging=null;
 if(e.type==='pointercancel'){
  doc=JSON.parse(history.pop());render();notice('Placement cancelled. Previous pose restored.');return;
 }
 if(action.tool!=='select'){
  const a=pose().attachments[action.tool==='shield'?'shieldCenter':'spearButt'],b=pose().attachments[action.tool==='shield'?'shieldEdge':'spearTip'];
  if(Math.hypot((a.x-b.x)*transform.w,(a.y-b.y)*transform.h)<5){doc=JSON.parse(history.pop());render();notice('Drag to place a marker; a click leaves your previous marker unchanged.');return;}
  pose().reviewed=false;
 }
 if(action.tool==='spear'||['spearButt','spearTip','spearGrip'].includes(selected)){
  if(selected!=='spearGrip')updateSpearGrip();
  if(!snapSpear()&&action.tool==='spear')notice('Spear placed. Move it close to either wrist to magnet, or choose its hand in the inspector.');
 }
 if(action.tool==='shield'){
  const c=pose().attachments.shieldCenter;
  const hand=['nearWrist','farWrist'].find(k=>Math.hypot((pose().joints[k].x-c.x)*transform.w,(pose().joints[k].y-c.y)*transform.h)<22);
  if(hand)setHand('shield',hand);
  notice('Shield placed. Its radius stays rigid during smooth play; choose the hand for this pose.');
 }
 save();if(action.tool!=='select')setTool('select');render();
}
svg.addEventListener('pointerup',endDrag);svg.addEventListener('pointercancel',endDrag);
$('joint').onchange=()=>{stop();selected=$('joint').value;render();};
for(const name of ['x','y'])$(name).onchange=()=>{const x=Number($('x').value),y=Number($('y').value);if(!Number.isFinite(x)||!Number.isFinite(y))return;checkpoint();editPoint(x,y);save();render();};
$('confirm').onclick=()=>{checkpoint();point().status='confirmed';save();render();};
$('uncertain').onclick=()=>{checkpoint();point().status='uncertain';pose().reviewed=false;save();render();};
$('review').onclick=()=>{checkpoint();Object.values(pose().joints).forEach(p=>p.status='confirmed');pose().reviewed=true;save();render();notice(frameId()+' validated. Hidden landmarks are your explicit estimates.');};
$('unreview').onclick=()=>{checkpoint();pose().reviewed=false;save();render();};
$('undo').onclick=()=>{if(!history.length)return;stop();doc=JSON.parse(history.pop());save();render();};
for(const weapon of ['spear','shield'])$(weapon+'Hand').onchange=()=>{checkpoint();setHand(weapon,$(weapon+'Hand').value||null);save();render();};
$('removeWeapon').onclick=()=>{
 if(!ATTACHMENTS.includes(selected)){notice('Select a purple weapon handle first.');return;}
 checkpoint();const weapon=selected.startsWith('spear')?'spear':'shield';
 for(const name of ATTACHMENTS)if(name.startsWith(weapon))delete pose().attachments[name];
 if(pose().equipment)delete pose().equipment[weapon];selected='head';save();render();
};
$('addAttachment').onclick=()=>{const name=$('attachment').value;stop();if(!pose().attachments[name]){checkpoint();const p=pose().joints[name.startsWith('shield')?'farWrist':'nearWrist'];pose().attachments[name]=landmark(p);save();}selected=name;render();};
$('character').onchange=loadCharacter;
$('sequence').onchange=()=>{stop();sequence=$('sequence').value;index=0;render();};
$('prev').onclick=()=>selectFrame(index-1);$('next').onclick=()=>selectFrame(index+1);
function play(mode){
 if(playing&&smooth===mode){stop();render();return;}
 smooth=mode;playing=true;setTool('select');elapsed=atFrameStart();lastTime=performance.now();render();
 if(mode)notice('Smooth skeleton playback. Equipment follows its assigned wrist, then teleports at the next keyframe. Pause to edit the source pose.');
}
$('play').onclick=()=>play(false);$('smoothPlay').onclick=()=>play(true);
for(const id of ['sprite','labels','motion'])$(id).onchange=draw;
$('export').onclick=()=>{const data=validateDocument(doc,manifest);const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=char+'-poses.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('Pose JSON exported.');};
$('import').onchange=async()=>{
 const file=$('import').files[0];if(!file)return;
 try{if(file.size>5*1024*1024)throw Error('Pose file exceeds 5 MB.');const next=validateDocument(JSON.parse(await file.text()),manifest);if(next.character!==char)throw Error('Select '+manifest.characters[next.character].name+' before importing this file.');checkpoint();doc=next;save();render();notice('Pose JSON imported and saved.');}
 catch(e){notice('Import rejected: '+e.message+' Your current work is unchanged.');}finally{$('import').value='';}
};
function tick(time){
 if(playing){elapsed+=Math.min(time-lastTime,1000)*Number($('speed').value);const next=frameAt(steps(),elapsed);if(next!==index){index=next;render();}else if(smooth)draw();}
 lastTime=time;requestAnimationFrame(tick);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing){stop();render();}});
try{const response=await fetch('./manifest.json');if(!response.ok)throw Error('Metadata unavailable');manifest=await response.json();loadCharacter();requestAnimationFrame(tick);}catch(e){notice('Unable to start: '+e.message+'. Serve the repository over HTTP.');}
