from pathlib import Path
from playwright.sync_api import sync_playwright
import json, re, base64, mimetypes, time, os, shutil
R=Path(__file__).resolve().parents[1]; out=R/'docs/qa-v071'; out.mkdir(exist_ok=True)
D=json.loads((R/'data/roster.json').read_text());E=json.loads((R/'data/catalog-expansion-v070.json').read_text()); results=[]
assets={D['stages'][0]['background'], E['fighters'][0]['sprite']}
for f in D['fighters']:
 if f['uid']=='re3r-nemesis': assets.update([f['sprite'],f['portrait']])
for row in E['records'][:20]: assets.add(row['portrait'])
assets_map={p:'data:'+ (mimetypes.guess_type(p)[0] or 'image/png')+';base64,'+base64.b64encode((R/p).read_bytes()).decode() for p in assets}
# Offline pages never navigate to a live origin. Real project JS/CSS is executed;
# localStorage is an explicit in-memory substitute, not an HTTP storage claim.
def html_for(name):
 s=(R/name).read_text()
 s=re.sub(r'<link\b[^>]*href="([^"]+\.css)"[^>]*>',lambda m:'<style>'+ (R/m[1]).read_text()+'</style>',s)
 s=re.sub(r'<script\b[^>]*src="([^"]+)"[^>]*></script>',lambda m:'<script>'+ (R/m[1]).read_text().replace('</script','<\\/script')+'</script>',s)
 shim='''<script>window.__qaStorage=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>__qaStorage.get(k)??null,setItem:(k,v)=>__qaStorage.set(k,String(v)),removeItem:k=>__qaStorage.delete(k)}});const assetMap=ASSETS;const desc=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');Object.defineProperty(HTMLImageElement.prototype,'src',{get:desc.get,set(v){desc.set.call(this,assetMap[v]||v)}});</script>'''.replace('ASSETS',json.dumps(assets_map))
 return s.replace('<head>','<head>'+shim,1)
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox'])
 for width in [1440,390]:
  for name,slug in [('catalog-encounter.html','context'),('catalog-duel.html','duel'),('catalog.html','catalog')]:
   page=b.new_page(viewport={'width':width,'height':900},reduced_motion='reduce');errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   try:
    page.set_content(html_for(name),wait_until='load',timeout=30000)
    page.wait_for_timeout(250)
    detail={}
    if slug=='context':
     page.select_option('#encSelect','re6-chrysalid')
     assert page.locator('[data-context-action="advance"]').is_disabled()
     for i in range(3):page.click('#encStep')
     before=page.evaluate('RE_CONTEXT_PAGE.getTrial().snapshot().frame');assert before==45
     page.click('#encSave');assert 'SAUVEGARDÉE' in page.locator('#encStorageStatus').inner_text()
     page.click('#encReset');page.click('#encLoad');assert page.evaluate('RE_CONTEXT_PAGE.getTrial().snapshot().frame')==45
     assert not page.evaluate('RE_CONTEXT_PAGE.isPlaying()')
     good=page.evaluate('RE_CONTEXT_PAGE.getTrial().checkpoint()');bad=dict(good, stateHash='00000000')
     page.set_input_files('#encImport',{'name':'broken.json','mimeType':'application/json','buffer':json.dumps(bad).encode()})
     page.wait_for_function("document.getElementById('encStorageStatus').textContent.includes('IMPORT REFUSÉ')")
     assert page.evaluate('RE_CONTEXT_PAGE.getTrial().snapshot().frame')==45
     page.click('#encLoad');detail={'savedFrame':before,'resumedPaused':True,'tamperedImportRejected':True,'advanceDisabledForCocoon':True}
    elif slug=='duel':
     page.click('#trialStart');page.click('#trialCanvas',position={'x':20,'y':20});page.evaluate('document.activeElement.blur()')
     before=page.evaluate('RE_CATALOG_DUEL.getState().a.x');page.keyboard.down('KeyD');page.wait_for_timeout(250);page.keyboard.up('KeyD');after=page.evaluate('RE_CATALOG_DUEL.getState().a.x');assert after>before
     page.click('#trialPause');frame=page.evaluate('RE_CATALOG_DUEL.getState().frame');page.wait_for_timeout(150);assert page.evaluate('RE_CATALOG_DUEL.getState().frame')==frame
     assert page.locator('#trialMoves button').count()==10
     assert page.evaluate('__qaStorage.size')==0
     detail={'movement':round(after-before,2),'pauseStable':True,'techniques':10,'noStorageWrites':True}
    else:
     assert page.locator('.catalog-card').count()==18
     page.fill('#catSearch','zzzz-no-result-zzzz');assert page.locator('.catalog-card').count()==0
     page.fill('#catSearch','');assert page.locator('.catalog-card').count()==18
     detail={'firstPage':18,'emptySearch':True}
    document_width=page.evaluate('document.documentElement.scrollWidth');assert document_width<=width,(slug,width,document_width)
    assert not errors,errors
    page.screenshot(path=str(out/f'{slug}-{width}.png'),full_page=True)
    results.append({'page':name,'width':width,'pass':True,'documentWidth':document_width,'checks':detail,'errors':errors})
   except Exception as e:
    results.append({'page':name,'width':width,'pass':False,'error':str(e),'errors':errors})
    page.screenshot(path=str(out/f'FAILED-{slug}-{width}.png'),full_page=True)
   finally:page.close()
 b.close()
report={'version':'0.7.1','passed':sum(r['pass'] for r in results),'failed':sum(not r['pass'] for r in results),'scope':'Chromium offline set_content. Real local HTML/JS/CSS and image data; explicit memory substitute for localStorage. No HTTP navigation, network iframe, real device or browser persistent-storage certification. Keyboard interaction and document overflow verified.','httpNavigation':'Not tested by this offline script. The delivery-session HTTP navigation attempt was blocked by administrator; see delivery report.','results':results}
(R/'docs/qa-v071-browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
