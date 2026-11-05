const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.PREVIEW_URL||'http://127.0.0.1:8765')+'/tools/pose-editor/');await page.waitForSelector('.joint');
  // Simulate an existing v1 document, exactly as users have saved on the original preview.
  await page.evaluate(async()=>{
   const {makeDocument}=await import('./model.mjs'),m=await(await fetch('./manifest.json')).json(),d=makeDocument('gyakari',m);
   d.poses.idle_0.joints.head.x=.333;d.poses.idle_0.joints.head.status='confirmed';
   localStorage.setItem('gyeaman-poses-v1-gyakari',JSON.stringify(d));
  });
  await page.reload();await page.waitForSelector('.joint');assert.equal(Number(await page.locator('#x').inputValue()),.333);
  const draft=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('gyeaman-poses-v1-gyakari')));
  async function screen(x,y){return page.locator('#canvas').evaluate((svg,{x,y})=>{const im=svg.querySelector('image'),p=new DOMPoint(Number(im.getAttribute('x'))+x*Number(im.getAttribute('width')),Number(im.getAttribute('y'))+y*Number(im.getAttribute('height'))).matrixTransform(svg.getScreenCTM());return {x:p.x,y:p.y};},{x,y});}
  async function draw(tool,a,b){await page.locator('#tool-'+tool).click();const p=await screen(...a),q=await screen(...b);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(q.x,q.y,{steps:8});await page.mouse.up();}
  await draw('shield',[.8,.42],[.9,.42]);assert.equal(await page.locator('.weapon-shield').count(),1);
  let d=await draft(),p=d.poses.idle_0;assert.ok(Math.abs(p.attachments.shieldEdge.x-p.attachments.shieldCenter.x-.1)<.002);assert.equal(p.equipment.shield.hand,'farWrist');
  await draw('spear',[.1,.51],[.6,.51]);assert.equal(await page.locator('.weapon-spear').count(),1);
  d=await draft();p=d.poses.idle_0;assert.equal(p.equipment.spear.hand,'nearWrist');assert.equal(p.attachments.spearGrip.x,p.joints.nearWrist.x);assert.equal(p.attachments.spearGrip.y,p.joints.nearWrist.y);assert.ok(Math.abs(p.attachments.spearTip.y-p.joints.nearWrist.y)<.001);assert.equal(p.joints.head.x,.333);
  // Explicitly allow either hand per pose; no anatomical relabeling or global correction.
  await page.locator('#spearHand').selectOption('farWrist');assert.equal((await draft()).poses.idle_0.equipment.spear.hand,'farWrist');
  // A click, rather than a drag, leaves the previous shield unchanged.
  const shield=JSON.stringify((await draft()).poses.idle_0.attachments.shieldEdge);
  await page.locator('#tool-shield').click();const c=await screen(.7,.3);await page.mouse.click(c.x,c.y);assert.equal(JSON.stringify((await draft()).poses.idle_0.attachments.shieldEdge),shield);
  await page.locator('#tool-select').click();
  await page.reload();await page.waitForSelector('.weapon-shield');assert.equal(await page.locator('.weapon-spear').count(),1);assert.equal((await draft()).poses.idle_0.joints.head.x,.333);
  // Use the browser's clock to inspect a real in-between rendered skeleton, not just a keyframe.
  await page.clock.install();await page.clock.pauseAt(new Date());
  const start=await page.locator('[data-joint="head"]').getAttribute('cx');
  await page.locator('#smoothPlay').click();await page.clock.runFor(180);
  assert.equal(await page.locator('#canvas image').count(),0);assert.equal(await page.locator('#canvas').getAttribute('data-playback'),'smooth');
  assert.notEqual(await page.locator('[data-joint="head"]').getAttribute('cx'),start);
  assert.equal(await page.locator('.weapon-spear').count(),1);assert.equal(await page.locator('.weapon-shield').count(),1);
  await page.locator('#smoothPlay').click();assert.equal(await page.locator('#canvas image').count(),1);
  // Export/import keeps geometry, hand choices and previous corrections.
  const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();const dl=await downloadPromise;
  const fs=require('node:fs'),json=fs.readFileSync(await dl.path(),'utf8');
  await page.locator('#import').setInputFiles({name:'equipment.json',mimeType:'application/json',buffer:Buffer.from(json)});await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('imported and saved'));
  assert.deepEqual(await draft(),JSON.parse(json));assert.equal((await draft()).poses.idle_0.joints.head.x,.333);
  if(process.env.SCREENSHOT)await page.screenshot({path:process.env.SCREENSHOT,fullPage:true});
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);console.log('PASS: legacy draft preservation, shield radius, spear endpoint placement and wrist magnet, per-pose hands, click cancellation, persistence, smooth in-between rendering, geometry JSON roundtrip, mobile layout.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
