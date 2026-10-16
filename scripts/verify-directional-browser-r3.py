from pathlib import Path
import base64,json,re
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];O=R/'docs/qa-directional-r3';O.mkdir(exist_ok=True)
D=json.loads((R/'data/roster.json').read_text());E=json.loads((R/'data/catalog-expansion-v070.json').read_text());F=D['fighters']+E['fighters'];M=json.loads((R/'data/directional-art.json').read_text())
paths={D['stages'][0].get('background')}
for f in F:
 if f['uid'] in ('re2-larvae','re1-crow','recv-bandersnatch') or f is F[0]: paths.update((f.get('sprite'),f.get('portrait')))
for r in M['records'].values():
 for v in r.get('views',{}).values():paths.add(v['path'])
assets={p:'data:image/'+('webp' if p.endswith('.webp') else 'png')+';base64,'+base64.b64encode((R/p).read_bytes()).decode() for p in paths if p}
html=(R/'directions.html').read_text()
html=re.sub(r'<link[^>]*href="([^"]+)"[^>]*>',lambda m:'<style>'+(R/m[1]).read_text()+'</style>',html)
html=re.sub(r'<script src="([^"]+)"></script>',lambda m:'<script>'+(R/m[1]).read_text().replace('</script','<\\/script')+'</script>',html)
html=html.replace('<script>','<script>globalThis.RE_ASSET_DATA='+json.dumps(assets)+';</script><script>',1)
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (1440,390):
  page=browser.new_page(viewport={'width':width,'height':1050},device_scale_factor=1);errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('**/*',lambda r:r.abort()) # offline test: never forwards requests
  page.set_content(html,wait_until='load');page.wait_for_function('!!window.RE_DIRECTIONS_PAGE')
  page.select_option('#directionSubject','re2-larvae');page.wait_for_timeout(350)
  page.select_option('#directionState','heavy');page.click('#directionStep');page.click('#directionStep');assert page.evaluate('RE_DIRECTIONS_PAGE.snapshot().tick')==2
  assert 'AUCUNE ANIMATION FOURNIE' in page.inner_text('#directionLeft')
  page.click('#directionSwap');assert page.evaluate('RE_DIRECTIONS_PAGE.snapshot().swap')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),page.evaluate('[innerWidth,document.documentElement.scrollWidth]')
  page.screenshot(path=str(O/f'directions-{width}.png'),full_page=True)
  page.click('#directionAnimate');page.wait_for_timeout(180);assert page.evaluate('RE_DIRECTIONS_PAGE.snapshot().playing')
  page.evaluate("dispatchEvent(new Event('blur'))");assert not page.evaluate('RE_DIRECTIONS_PAGE.snapshot().playing')
  page.fill('#directionSearch','no_such_subject_x');assert page.locator('#directionPlay').is_hidden();assert page.locator('#directionStep').is_disabled()
  page.fill('#directionSearch','');page.select_option('#directionSubject','recv-bandersnatch');page.wait_for_timeout(200)
  assert 'PROFIL À PRODUIRE' in page.inner_text('#directionLeft');assert 'POSE STATIQUE' in page.inner_text('#directionRight')
  assert not errors,errors
  results.append({'viewport':width,'passed':True,'checks':['real local scripts and CSS','source larva pixels','static vs animation status','step','swap','pause','empty filter','asymmetry preserved','no document horizontal overflow','no JS error']});page.close()
 browser.close()
report={'scope':'Offline Chromium set_content with embedded local sources/bitmaps. Network requests aborted; HTTP navigation was blocked by administrator. Not a public/mobile-device certification.','passed':len(results),'failed':0,'results':results}
(O/'browser-results.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
