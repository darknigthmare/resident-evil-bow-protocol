"""Offline browser rendering with embedded local assets, no network navigation.
PageTransitionEvents are synthetic lifecycle tests, not a real cache eviction test.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re,base64,mimetypes
R=Path(__file__).resolve().parents[1];OUT=R/'docs/qa-v073';OUT.mkdir(exist_ok=True,parents=True)
D=json.loads((R/'data/roster.json').read_text());E=json.loads((R/'data/catalog-expansion-v070.json').read_text())
needed={'re3r-nemesis','re5-uroboros-mkono','re5-reaper','re5-gatling-gun-majini',E['fighters'][0]['uid']}
paths={f[k] for f in D['fighters']+E['fighters'] if f['uid'] in needed for k in ['sprite','portrait']}
if D['stages'][0].get('background'):paths.add(D['stages'][0]['background'])
embedded={p:'data:'+ (mimetypes.guess_type(p)[0] or 'image/png')+';base64,'+base64.b64encode((R/p).read_bytes()).decode() for p in paths}
checks=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in [1440,390]:
  for name in ['laboratory.html','catalog-laboratory.html','catalog-duel.html','catalog-encounter.html']:
   ctx=browser.new_context(viewport={'width':width,'height':1050});page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.route('**/*',lambda r:r.abort())
   html=(R/name).read_text()
   html=re.sub(r'<link rel="stylesheet" href="([^"]+)">',lambda m:'<style>'+(R/m[1]).read_text()+'</style>',html)
   html=html.replace('<head>','<head><script>globalThis.RE_ASSET_DATA='+json.dumps(embedded)+';</script>',1)
   html=re.sub(r'<script src="([^"]+)"></script>',lambda m:'<script>'+(R/m[1]).read_text().replace('</script','<\\/script')+'</script>',html)
   page.set_content(html,wait_until='load');page.wait_for_timeout(600)
   if name in ['laboratory.html','catalog-laboratory.html']:
    page.select_option('#labSubject','re5-gatling-gun-majini');page.select_option('#labTarget','re5-reaper');page.check('#labTargetOpening');page.select_option('#labMove','special');page.click('#labActivation')
    for _ in range(12):page.click('#labStep')
    assert page.evaluate('RE_TECHNIQUE_LAB.getBench().snapshot().activations')==1
    assert 'ZONE CRITIQUE' in page.inner_text('#labContact') or 'CORPS' in page.inner_text('#labContact')
    assert 'target=re5-reaper' in page.get_attribute('#labScenarioLink','href')
    before=page.evaluate('RE_TECHNIQUE_LAB.getBench().snapshot().frame')
    page.evaluate("dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));")
    page.wait_for_timeout(100);assert page.evaluate('RE_TECHNIQUE_LAB.getBench().snapshot().frame')==before
    page.click('#labToggle');page.wait_for_timeout(120);page.click('#labToggle');assert page.evaluate('RE_TECHNIQUE_LAB.getBench().snapshot().frame')>before
   elif name=='catalog-duel.html':
    page.click('#trialStart');page.wait_for_timeout(130)
    page.evaluate("dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));")
    assert page.evaluate('RE_CATALOG_DUEL.isPaused()');before=page.evaluate('RE_CATALOG_DUEL.getState().frame');page.click('#trialPause');page.wait_for_timeout(130);page.click('#trialPause');assert page.evaluate('RE_CATALOG_DUEL.getState().frame')>before
   else:
    page.click('#encStep');before=page.evaluate('RE_CONTEXT_PAGE.getTrial().snapshot().frame');page.evaluate("dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));")
    assert not page.evaluate('RE_CONTEXT_PAGE.isPlaying()');page.click('#encPlay');page.wait_for_timeout(130);page.click('#encPlay');assert page.evaluate('RE_CONTEXT_PAGE.getTrial().snapshot().frame')>before
   overflow=page.evaluate('document.documentElement.scrollWidth>innerWidth+1');shot=OUT/f'{name[:-5]}-{width}.png';page.screenshot(path=str(shot),full_page=True)
   row={'page':name,'width':width,'javascriptErrors':errors,'documentOverflow':overflow,'passed':not errors and not overflow,'screenshot':str(shot.relative_to(R))};checks.append(row);print(json.dumps(row),flush=True);ctx.close()
 browser.close()
report={'version':'0.7.3','passed':sum(c['passed'] for c in checks),'failed':sum(not c['passed'] for c in checks),'scope':'Chromium offline set_content with local HTML/JS/CSS and embedded local images; no network. Synthetic pageshow/pagehide lifecycle. No native phone, actual bfcache traversal, gamepad hardware or persistent-storage certification.','checks':checks}
(R/'docs/qa-v073-browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
if report['failed']:raise SystemExit(1)
