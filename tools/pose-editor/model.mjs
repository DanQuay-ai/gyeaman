export const JOINTS = ['head','neck','pelvis','nearShoulder','nearElbow','nearWrist','farShoulder','farElbow','farWrist','nearHip','nearKnee','nearAnkle','farHip','farKnee','farAnkle'];
export const BONES = [['head','neck'],['neck','pelvis'],...['near','far'].flatMap(s=>[['neck',s+'Shoulder'],[s+'Shoulder',s+'Elbow'],[s+'Elbow',s+'Wrist'],['pelvis',s+'Hip'],[s+'Hip',s+'Knee'],[s+'Knee',s+'Ankle']])];
export const ATTACHMENTS = ['spearGrip','spearTip','spearButt','shieldGrip','shieldCenter','shieldEdge'];
const stance = [[.70,.12],[.63,.25],[.49,.58],[.45,.20],[.29,.34],[.28,.50],[.72,.28],[.74,.40],[.83,.40],[.40,.61],[.26,.74],[.13,.94],[.59,.62],[.77,.73],[.84,.92]];
// Rough visual suggestions from the actual extracted images. Near/far are screen-depth labels, not anatomical left/right.
const seeds = {
 idle_1:[[.43,.13],[.47,.25],[.51,.57],[.34,.27],[.27,.40],[.43,.48],[.59,.26],[.64,.32],[.72,.22],[.45,.60],[.45,.78],[.44,.94],[.59,.59],[.70,.65],[.61,.81]],
 idle_2:[[.73,.13],[.65,.25],[.44,.57],[.54,.29],[.54,.50],[.58,.69],[.73,.30],[.78,.44],[.75,.57],[.41,.59],[.30,.76],[.08,.83],[.54,.60],[.65,.73],[.62,.88]],
 idle_3:[[.81,.18],[.70,.25],[.47,.53],[.58,.20],[.39,.25],[.28,.35],[.78,.27],[.83,.37],[.88,.33],[.42,.56],[.32,.75],[.12,.93],[.58,.56],[.70,.65],[.65,.81]],
 gbA_1:[[.63,.12],[.58,.22],[.48,.54],[.57,.22],[.62,.35],[.76,.41],[.41,.24],[.31,.29],[.37,.32],[.40,.56],[.29,.75],[.17,.89],[.58,.57],[.72,.77],[.80,.94]],
 gbA_2:[[.63,.12],[.58,.23],[.43,.51],[.57,.23],[.69,.29],[.80,.29],[.55,.25],[.70,.31],[.84,.29],[.38,.53],[.25,.71],[.08,.89],[.50,.52],[.62,.57],[.52,.78]],
 gbA_3:[[.49,.15],[.54,.25],[.56,.54],[.55,.27],[.43,.31],[.27,.31],[.66,.27],[.76,.28],[.79,.25],[.50,.56],[.44,.70],[.42,.86],[.64,.55],[.81,.70],[.94,.86]],
 gbB_1:[[.43,.12],[.44,.23],[.43,.60],[.50,.23],[.62,.30],[.75,.33],[.33,.27],[.27,.33],[.23,.27],[.40,.61],[.34,.74],[.37,.88],[.53,.61],[.61,.73],[.48,.94]],
 gbB_2:[[.56,.45],[.52,.54],[.44,.72],[.46,.57],[.50,.69],[.61,.76],[.62,.56],[.65,.62],[.67,.65],[.39,.75],[.25,.85],[.10,.96],[.51,.76],[.65,.88],[.69,.96]],
 gbB_3:[[.53,.14],[.48,.27],[.45,.57],[.37,.26],[.36,.41],[.46,.46],[.62,.29],[.65,.43],[.62,.49],[.38,.59],[.23,.76],[.10,.88],[.59,.60],[.78,.76],[.89,.88]],
 gult_1:[[.59,.36],[.58,.45],[.54,.67],[.38,.44],[.23,.27],[.29,.16],[.69,.43],[.75,.28],[.78,.19],[.46,.67],[.40,.77],[.46,.91],[.63,.68],[.77,.78],[.65,.96]],
 gult_2:[[.66,.15],[.60,.25],[.44,.55],[.49,.27],[.52,.46],[.60,.65],[.70,.28],[.73,.45],[.75,.58],[.37,.58],[.27,.75],[.12,.93],[.53,.58],[.62,.74],[.62,.88]],
 gult_3:[[.62,.14],[.60,.25],[.46,.55],[.52,.24],[.64,.28],[.77,.28],[.67,.29],[.68,.42],[.69,.47],[.40,.58],[.25,.76],[.10,.92],[.56,.58],[.73,.73],[.78,.90]]
};
export function suggest(character, id) {
 const points = character === 'gyakari' ? seeds[id] || stance : stance;
 return {reviewed:false, joints:Object.fromEntries(JOINTS.map((key,i)=>[key,{x:points[i][0],y:points[i][1],status:'uncertain',source:character==='gyakari'?'visual-suggestion':'template'}])),attachments:{}};
}
export function validateDocument(doc, manifest) {
 if(!doc || doc.schemaVersion!==1 || doc.coordinateSpace!=='normalized-image' || !manifest.characters[doc.character]) throw Error('Unsupported pose document or character.');
 const frames=manifest.characters[doc.character].frames;
 if(!doc.poses || Object.keys(doc.poses).length!==Object.keys(frames).length) throw Error('Document must contain every character pose.');
 for(const [id,pose] of Object.entries(doc.poses)) {
  if(!frames[id] || !pose || typeof pose.reviewed!=='boolean' || !pose.joints || !pose.attachments) throw Error('Invalid pose '+id);
  if(Object.keys(pose.joints).length!==JOINTS.length) throw Error('Incorrect joint count in '+id);
  for(const name of JOINTS) checkPoint(pose.joints[name],id+' / '+name);
  for(const [name,p] of Object.entries(pose.attachments)) {if(!ATTACHMENTS.includes(name)) throw Error('Unknown attachment');checkPoint(p,name);}
  if(pose.equipment!==undefined){
   if(!pose.equipment || typeof pose.equipment!=='object' || Array.isArray(pose.equipment)) throw Error('Invalid equipment');
   for(const [name,settings] of Object.entries(pose.equipment)){
    if(!['spear','shield'].includes(name) || !settings || ![null,'nearWrist','farWrist'].includes(settings.hand)) throw Error('Invalid equipment hand');
   }
  }
  if(pose.reviewed && Object.values(pose.joints).some(p=>p.status!=='confirmed')) throw Error('Reviewed poses must have confirmed joints.');
 }
 return structuredClone(doc);
}
function checkPoint(p,label) {
 if(!p || !Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1||!['uncertain','confirmed'].includes(p.status)||typeof p.source!=='string') throw Error('Invalid landmark: '+label);
}
export function makeDocument(character,manifest) {return {schemaVersion:1,coordinateSpace:'normalized-image',character,poses:Object.fromEntries(Object.keys(manifest.characters[character].frames).map(id=>[id,suggest(character,id)]))};}
export function frameAt(steps,elapsed) {const total=steps.reduce((n,s)=>n+s.ms,0);let t=((elapsed%total)+total)%total;for(let i=0;i<steps.length;i++){if(t<steps[i].ms)return i;t-=steps[i].ms;}return 0;}

// Interpolate in game anchor pixels, never in independently cropped image coordinates.
export function frameSample(steps,elapsed) {
 const index=frameAt(steps,elapsed), total=steps.reduce((n,s)=>n+s.ms,0);
 const local=((elapsed%total)+total)%total-steps.slice(0,index).reduce((n,s)=>n+s.ms,0);
 return {index,fraction:local/steps[index].ms};
}
export function sourcePoint(p,frame,step={},ref=1,motion=false) {
 return {...p,x:p.x*frame[1]-frame[3]+(motion?(step.x||0)*ref:0),y:p.y*frame[2]-frame[4]-(motion?(step.y||0)*ref:0)};
}
export function sampleScene(doc,character,steps,elapsed,{smooth=false,motion=false}={}) {
 const {index,fraction}=frameSample(steps,elapsed),step=steps[index],next=steps[(index+1)%steps.length];
 const current=doc.poses[step.p],target=doc.poses[next.p];
 const frame=character.frames[step.p],nextFrame=character.frames[next.p];
 const ease=smooth?fraction*fraction*(3-2*fraction):0;
 const world=p=>sourcePoint(p,frame,step,character.ref,motion);
 const joints=Object.fromEntries(JOINTS.map(name=>{
  const a=world(current.joints[name]),b=sourcePoint(target.joints[name],nextFrame,next,character.ref,motion);
  return [name,{...a,x:a.x+(b.x-a.x)*ease,y:a.y+(b.y-a.y)*ease}];
 }));
 // Equipment retains the current keyframe's size, orientation and chosen hand until the cut.
 // Within a transition it can follow that hand, but never travels across to the other hand.
 const attachments=Object.fromEntries(Object.entries(current.attachments).map(([name,p])=>{
  const weapon=name.startsWith('spear')?'spear':'shield',hand=current.equipment?.[weapon]?.hand;
  const q=world(p), wrist=hand?world(current.joints[hand]):null;
  return [name,{...q,x:q.x+(wrist?joints[hand].x-wrist.x:0),y:q.y+(wrist?joints[hand].y-wrist.y:0)}];
 }));
 return {index,fraction,joints,attachments,equipment:current.equipment||{}};
}
export function nearestOnSegment(p,a,b) {
 const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;
 const t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/length)):0;
 return {x:a.x+t*dx,y:a.y+t*dy};
}
// Distance in source pixels avoids aspect-ratio and zoom-dependent snapping errors.
export function wristMagnet(pose,frame,tolerance) {
 const a=pose.attachments.spearButt,b=pose.attachments.spearTip;
 if(!a||!b)return null;
 const pixel=p=>({x:p.x*frame[1],y:p.y*frame[2]});
 return ['nearWrist','farWrist'].map(hand=>{
  const wrist=pixel(pose.joints[hand]),grip=nearestOnSegment(wrist,pixel(a),pixel(b));
  return {hand,grip:{x:grip.x/frame[1],y:grip.y/frame[2]},distance:Math.hypot(wrist.x-grip.x,wrist.y-grip.y)};
 }).sort((a,b)=>a.distance-b.distance).find(hit=>hit.distance<=tolerance)||null;
}
