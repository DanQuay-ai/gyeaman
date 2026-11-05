import {JOINTS,BONES,ATTACHMENTS,makeDocument,validateDocument,frameAt} from './model.mjs';
const $=id=>document.getElementById(id), svg=$('canvas'), NS='http://www.w3.org/2000/svg';
let manifest, doc, char='gyakari', sequence='all', index=0, playing=false, elapsed=0, lastTime=0, selected='head', dragging=null, transform, history=[];
const asset=file=>'../../assets/sq/kf/'+file;
const key=()=> 'gyeaman-poses-v1-'+char;
const character=()=>manifest.characters[char];
const steps=()=>sequence==='all'?Object.keys(character().frames).map(p=>({p,ms:400})):character().sequences[sequence];
const frameId=()=>steps()[index].p;
const pose=()=>doc.poses[frameId()];
const point=()=>pose().joints[selected]||pose().attachments[selected];
function notice(text){$('notice').textContent=text;}
function checkpoint(){playing=false;$('play').textContent='Play';history.push(JSON.stringify(doc));if(history.length>60)history.shift();}
function save(){
 try{localStorage.setItem(key(),JSON.stringify(doc));$('saveStatus').textContent='Saved in this browser · export JSON for a portable backup.';}
 catch{$('saveStatus').textContent='Browser storage unavailable. Export JSON to keep your work.';}
}
function loadCharacter(){
 playing=false;char=$('character').value;sequence='all';index=0;history=[];selected='head';
 doc=makeDocument(char,manifest);
 try{const saved=localStorage.getItem(key());if(saved)doc=validateDocument(JSON.parse(saved),manifest);if(doc.character!==char)throw Error('Wrong cached character');}
 catch{doc=makeDocument(char,manifest);notice('Saved draft could not be restored. Import a backup if available.');}
 $('sequence').replaceChildren();
 for(const [value,label] of [['all','All source poses · 400 ms inspection holds'],...Object.keys(character().sequences).map(k=>[k,k+' · game sequence'])]){const o=new Option(label,value);$('sequence').add(o);}
 $('characterNote').textContent=char==='gyakari'?'16 source poses. Rough visual suggestions; all joints await review.':'Agyekum uses the bayi asset ID. Generic template suggestions only; every pose needs a mapping pass.';
 rebuildLandmarks();render();notice('Ready. Drag a joint or choose a landmark and edit its coordinates.');
}
function rebuildLandmarks(){
 $('joint').replaceChildren();for(const id of [...JOINTS,...Object.keys(pose().attachments)])$('joint').add(new Option(id,id));
 if(!point())selected='head';$('joint').value=selected;
}
function el(tag,attrs,parent=svg){const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);parent.append(n);return n;}
function position(p){return {x:transform.x+p.x*transform.w,y:transform.y+p.y*transform.h};}
function draw(){
 const id=frameId(),[file,w,h,ax,ay]=character().frames[id], data=character();
 // Common floor/anchor space across all source poses, including leap anchors outside the image.
 const extent=Object.values(data.frames).reduce((a,[,fw,fh,fx,fy])=>({left:Math.min(a.left,-fx),right:Math.max(a.right,fw-fx),top:Math.min(a.top,-fy),bottom:Math.max(a.bottom,fh-fy)}),{left:0,right:0,top:0,bottom:0});
 const moving=$('motion').checked && sequence!=='all', step=steps()[index];
 const travel=moving?data.ref*.9:0;
 const scale=Math.min(870/(extent.right-extent.left+travel),650/(extent.bottom-extent.top+(moving?data.ref*.6:0)));
 const originX=65-extent.left*scale,originY=700-extent.bottom*scale;
 const dx=moving?(step.x||0)*data.ref:0,dy=moving?-(step.y||0)*data.ref:0;
 transform={x:originX+(dx-ax)*scale,y:originY+(dy-ay)*scale,w:w*scale,h:h*scale};
 svg.replaceChildren();
 el('line',{x1:30,x2:970,y1:originY,y2:originY,stroke:'#47624f','stroke-dasharray':'6 8'});
 el('text',{x:30,y:originY+20,fill:'#7d9584','font-size':12}).textContent='GAME FLOOR / SHARED ANCHOR';
 if($('sprite').checked){const im=el('image',{href:asset(file),x:transform.x,y:transform.y,width:transform.w,height:transform.h});im.addEventListener('error',()=>notice('Sprite failed to load: '+file));}
 el('path',{d:`M ${originX+dx*scale-7} ${originY+dy*scale} h 14 m -7 -7 v 14`,stroke:'#a4c3a8',fill:'none'});
 const drawBone=(a,b,color)=>{if(!a||!b)return;const p=position(a),q=position(b);el('line',{x1:p.x,y1:p.y,x2:q.x,y2:q.y,class:'bone',...(color?{style:'stroke:'+color,'stroke-dasharray':'6 4'}:{})});};
 for(const [a,b]of BONES)drawBone(pose().joints[a],pose().joints[b]);
 for(const [name,p]of Object.entries(pose().attachments)){const parent=name==='shieldGrip'?pose().joints.farWrist:name==='spearTip'?pose().attachments.spearGrip:pose().joints.nearWrist;drawBone(parent,p,'#c4a1f8');}
 for(const [name,p]of Object.entries({...pose().joints,...pose().attachments})){
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
}
function render(){
 if(!point())selected='head';rebuildLandmarks();draw();inspector();
 $('poseTitle').textContent=character().name+' / '+frameId();$('play').textContent=playing?'Pause':'Play';
 const step=steps()[index],f=character().frames[frameId()];
 $('stepInfo').textContent=`${index+1} / ${steps().length} · ${step.ms} ms${step.ev?' · '+step.ev:''}`;
 $('metadata').textContent=`${f[1]} × ${f[2]} px · anchor (${f[3]}, ${f[4]}) · reference height ${character().ref} · ${sequence==='all'?'inspection order, not a game animation':'original game timing; offsets '+($('motion').checked?'enabled':'disabled')}`;
 $('timeline').replaceChildren();
 steps().forEach((s,i)=>{const b=document.createElement('button');b.className='frame'+(i===index?' active':'');b.setAttribute('aria-label',`Frame ${i+1}: ${s.p}`);b.setAttribute('aria-pressed',String(i===index));const image=document.createElement('img');image.src=asset(character().frames[s.p][0]);image.alt='';b.append(image);const label=document.createElement('span');label.textContent=`${s.p} · ${s.ms}ms`;b.append(label);b.onclick=()=>selectFrame(i);$('timeline').append(b);});
}
function selectFrame(i){playing=false;index=(i+steps().length)%steps().length;render();}
function editPoint(x,y){const p=point();p.x=Math.max(0,Math.min(1,x));p.y=Math.max(0,Math.min(1,y));p.source='manual';p.status='uncertain';pose().reviewed=false;draw();inspector();}
svg.addEventListener('pointerdown',e=>{const name=e.target.getAttribute('data-joint');if(!name)return;playing=false;selected=name;checkpoint();dragging=e.pointerId;svg.setPointerCapture(e.pointerId);render();});
svg.addEventListener('pointermove',e=>{if(dragging!==e.pointerId)return;const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());editPoint((p.x-transform.x)/transform.w,(p.y-transform.y)/transform.h);});
function endDrag(e){if(dragging!==e.pointerId)return;dragging=null;save();}
svg.addEventListener('pointerup',endDrag);svg.addEventListener('pointercancel',endDrag);
$('joint').onchange=()=>{selected=$('joint').value;draw();inspector();};
for(const name of ['x','y'])$(name).onchange=()=>{const x=Number($('x').value),y=Number($('y').value);if(!Number.isFinite(x)||!Number.isFinite(y))return;checkpoint();editPoint(x,y);save();};
$('confirm').onclick=()=>{checkpoint();point().status='confirmed';save();draw();inspector();};
$('uncertain').onclick=()=>{checkpoint();point().status='uncertain';pose().reviewed=false;save();draw();inspector();};
$('review').onclick=()=>{checkpoint();Object.values(pose().joints).forEach(p=>p.status='confirmed');pose().reviewed=true;save();render();notice(frameId()+' validated. Hidden landmarks are your explicit estimates.');};
$('unreview').onclick=()=>{checkpoint();pose().reviewed=false;save();render();};
$('undo').onclick=()=>{if(!history.length)return;doc=JSON.parse(history.pop());save();render();};
$('addAttachment').onclick=()=>{const name=$('attachment').value;playing=false;if(!pose().attachments[name]){checkpoint();const p=pose().joints[name==='shieldGrip'?'farWrist':'nearWrist'];pose().attachments[name]={x:p.x,y:p.y,status:'uncertain',source:'manual'};save();}selected=name;render();};
$('character').onchange=loadCharacter;
$('sequence').onchange=()=>{playing=false;sequence=$('sequence').value;index=0;render();};
$('prev').onclick=()=>selectFrame(index-1);$('next').onclick=()=>selectFrame(index+1);
$('play').onclick=()=>{playing=!playing;elapsed=steps().slice(0,index).reduce((n,s)=>n+s.ms,0);lastTime=performance.now();render();};
for(const id of ['sprite','labels','motion'])$(id).onchange=draw;
$('export').onclick=()=>{const data=validateDocument(doc,manifest);const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=char+'-poses.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('Pose JSON exported.');};
$('import').onchange=async()=>{
 const file=$('import').files[0];if(!file)return;
 try{if(file.size>5*1024*1024)throw Error('Pose file exceeds 5 MB.');const next=validateDocument(JSON.parse(await file.text()),manifest);if(next.character!==char)throw Error('Select '+manifest.characters[next.character].name+' before importing this file.');checkpoint();doc=next;playing=false;save();render();notice('Pose JSON imported and saved.');}
 catch(e){notice('Import rejected: '+e.message+' Your current work is unchanged.');}finally{$('import').value='';}
};
function tick(time){if(playing){elapsed+=Math.min(time-lastTime,1000)*Number($('speed').value);const next=frameAt(steps(),elapsed);if(next!==index){index=next;render();}}lastTime=time;requestAnimationFrame(tick);}
try{const response=await fetch('./manifest.json');if(!response.ok)throw Error('Metadata unavailable');manifest=await response.json();loadCharacter();requestAnimationFrame(tick);}catch(e){notice('Unable to start: '+e.message+'. Serve the repository over HTTP.');}
