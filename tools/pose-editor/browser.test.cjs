// Run against a local HTTP server. Uses an existing Playwright install; no runtime dependency in the shipped editor.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:1100}}), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.PREVIEW_URL||'http://127.0.0.1:8765')+'/tools/pose-editor/');
  await page.waitForSelector('.joint');assert.equal(await page.locator('.joint').count(),15);
  // Real pointer drag and persistence, then undo.
  const old=Number(await page.locator('#x').inputValue());const box=await page.locator('[data-joint="head"]').boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+28,box.y+box.height/2+12,{steps:5});await page.mouse.up();
  const moved=Number(await page.locator('#x').inputValue());assert.ok(moved>old);
  await page.reload();await page.waitForSelector('.joint');assert.equal(Number(await page.locator('#x').inputValue()),moved);
  await page.locator('#review').click();assert.equal(await page.locator('#reviewBadge').innerText(),'✓ Validated');
  await page.locator('#x').fill('0.6');await page.locator('#x').press('Tab');assert.equal(await page.locator('#reviewBadge').innerText(),'Needs review');
  await page.locator('#undo').click();assert.equal(await page.locator('#reviewBadge').innerText(),'✓ Validated');
  await page.locator('summary').click();await page.locator('#addAttachment').click();assert.equal(await page.locator('.joint').count(),16);
  const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();const download=await downloadPromise;
  const fs=require('node:fs');const exported=fs.readFileSync(await download.path(),'utf8');const data=JSON.parse(exported);assert.ok(data.poses.idle_0.attachments.spearGrip);
  await page.locator('#x').fill('0.1');await page.locator('#x').press('Tab');
  await page.locator('#import').setInputFiles({name:'roundtrip.json',mimeType:'application/json',buffer:Buffer.from(exported)});await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('imported and saved'));
  assert.equal(Number(await page.locator('#x').inputValue()),data.poses.idle_0.attachments.spearGrip.x);
  await page.locator('#import').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"schemaVersion":9}')});await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('Import rejected'));
  assert.equal(Number(await page.locator('#x').inputValue()),data.poses.idle_0.attachments.spearGrip.x);
  await page.locator('#sequence').selectOption('ult');assert.equal(await page.locator('.frame').count(),6);
  await page.locator('#play').click();await page.waitForFunction(()=>document.querySelector('#poseTitle').textContent.includes('idle_3'));await page.locator('#play').click();
  await page.locator('#character').selectOption('bayi');assert.equal(await page.locator('.frame').count(),13);
  assert.ok((await page.locator('#characterNote').innerText()).includes('Generic template'));
  await page.locator('#character').selectOption('gyakari');assert.equal(await page.locator('.joint').count(),16);
  // Decode every sprite, and visit every source frame and game sequence for both characters.
  for(const char of await page.locator('#character option').evaluateAll(os=>os.map(o=>o.value))){
   await page.locator('#character').selectOption(char);
   const sequences=await page.locator('#sequence option').evaluateAll(os=>os.map(o=>o.value));
   for(const seq of sequences){await page.locator('#sequence').selectOption(seq);const count=await page.locator('.frame').count();for(let i=0;i<count;i++){await page.locator('.frame').nth(i).click();await page.locator('#canvas image').evaluate(async im=>{const img=new Image();img.src=im.getAttribute('href');await img.decode();});assert.equal(await page.locator('#canvas .joint').count()>=15,true);}}
  }
  await page.locator('#character').selectOption('gyakari');
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);console.log('PASS: drag, autosave, validation, undo, attachments, JSON roundtrip/rejection, timed playback, all frames/sequences, character isolation, mobile layout; no browser errors.');
  if(process.env.SCREENSHOT){await page.setViewportSize({width:1500,height:1100});await page.screenshot({path:process.env.SCREENSHOT,fullPage:true});}
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
