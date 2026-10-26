import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.BOW_BODY_REVIEW_R28_PORT||5689),base='http://127.0.0.1:'+port;
const uids=['rerev-wall-blister','rerev-scagdead','re1r-cerberus','re1r-lisa-trevor'];
const server=spawn(process.execPath,['scripts/dev.mjs'],{cwd:root,env:{...process.env,RE_BOW_PORT:String(port)},stdio:'ignore'});
let browser;
try{
  let ready=false;
  for(let n=0;n<100;n++){
    try{if((await fetch(base)).ok){ready=true;break;}}catch{}
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  if(!ready)throw Error('Source/output review server did not become ready.');
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:1280,height:1000},deviceScaleFactor:1});
  await page.goto(base+'/modules/fidelity-r28/sources/body-rasters/render.html');
  for(const uid of uids){
    const record=JSON.parse(fs.readFileSync(path.join(root,'modules/fidelity-r28/sprites/records',uid+'.json')));
    const refs=record.provenance.references.map((ref,index)=>`<figure><img src="/${ref.path}" alt="Vue native ${index+1}"><figcaption>${ref.path.split('/').slice(-2).join('/')}</figcaption></figure>`).join('');
    const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${uid} — comparaison des corps R28</title><style>
      *{box-sizing:border-box}body{margin:0;background:#151b20;color:#f4f4f4;font:16px system-ui}header{padding:16px 24px;min-height:116px}h1{margin:0 0 8px;font-size:25px}p{margin:6px 0}.grid{display:grid;grid-template-columns:640px 640px}section{padding:12px}.refs{display:grid;grid-template-columns:1fr 1fr;gap:10px}figure{margin:0;min-width:0}img{display:block;width:100%;height:340px;object-fit:contain;background:repeating-conic-gradient(#303b43 0% 25%,#253039 0% 50%) 50%/24px 24px}figcaption{font-size:11px;overflow-wrap:anywhere;padding:6px 0}.output img{height:760px}h2{font-size:18px;margin:0 0 8px}footer{padding:8px 24px;font-size:13px}
      </style></head><body><header><h1>${record.label} — ${record.incarnation}</h1><p>Références : géométrie native publiée, quatre caméras indépendantes. Sortie : une interprétation générée, pose ${record.poseKind}, orientation ${record.sourceFacing}.</p><p>Aucune certification 1:1 ; ni animation complète ni pose officielle certifiée.</p></header><main class="grid"><section><h2>Géométrie source entière, sans modification de pose</h2><div class="refs">${refs}</div></section><section class="output"><h2>Nouveau PNG complet à examiner</h2><figure><img src="/${record.image}" alt="Nouveau corps généré complet"><figcaption>${record.image}</figcaption></figure></section></main><footer>Capture de comparaison UI : les PNG source et sortie ne sont ni recadrés ni réécrits. Les accessoires détachés et poses de base des exports ne certifient pas leurs positions en jeu.</footer></body></html>`;
    await page.setContent(html,{waitUntil:'networkidle'});
    const loaded=await page.locator('img').evaluateAll(images=>images.every(image=>image.complete&&image.naturalWidth>0));
    if(!loaded)throw Error('A review source or output image failed to load: '+uid);
    const folder=path.join(root,'docs/R28_BODY_VISUAL_EVIDENCE');fs.mkdirSync(folder,{recursive:true});
    await page.screenshot({path:path.join(folder,uid+'.png'),fullPage:true});
    console.log('CAPTURED source/output '+uid);
  }
}finally{await browser?.close();server.kill('SIGTERM');}
