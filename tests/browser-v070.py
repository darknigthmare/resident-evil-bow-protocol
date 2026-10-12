from pathlib import Path
from playwright.sync_api import sync_playwright
import re,json,mimetypes
R=Path(__file__).resolve().parents[1]
OUT=R/'docs/qa-v070';OUT.mkdir(parents=True,exist_ok=True)
rows=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in [1440,390]:
  for filename,query in [('catalog.html',''),('catalog-laboratory.html','?uid=recv-sweeper&slot=special'),('catalog-duel.html','?uid=re4-jj'),('catalog-encounter.html','?id=rerequiem-the-girl'),('index.html','')]:
   context=browser.new_context(viewport={'width':width,'height':950},device_scale_factor=1)
   page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   def route_handler(route):
    from urllib.parse import urlparse,unquote
    q=urlparse(route.request.url);path=(R/unquote(q.path.lstrip('/'))).resolve()
    if q.hostname!='bow.test' or not path.is_relative_to(R) or not path.is_file():route.abort();return
    route.fulfill(status=200,body=path.read_bytes(),content_type=mimetypes.guess_type(path.name)[0] or 'application/octet-stream')
   page.route('**/*',route_handler)
   html=(R/filename).read_text()
   html=html.replace('<head>','<head><base href="https://bow.test/">',1)
   # Inject authored JS/CSS directly. Assets are served from memory by the route.
   def css(m):return '<style>'+ (R/m.group(1)).read_text()+'</style>'
   html=re.sub(r'<link rel="stylesheet" href="([^"]+)">',css,html)
   def js(m):return '<script>'+ (R/m.group(1)).read_text().replace('</script','<\\/script')+'</script>'
   html=re.sub(r'<script src="([^"]+)"></script>',js,html)
   # Query-dependent controls receive their intended selection after initialization.
   page.set_content(html,wait_until='load');page.wait_for_timeout(550)
   if filename=='catalog.html':
    page.select_option('#catType','contextual');page.wait_for_timeout(50)
    assert '43 dossiers' in page.locator('#catStatus').inner_text()
    page.locator('.catalog-card').first.click();assert page.locator('#catActions a').count()==1
   elif filename=='catalog-laboratory.html':
    page.select_option('#labSubject','recv-sweeper');page.select_option('#labMove','special');page.click('#labActivation');assert page.evaluate('RE_TECHNIQUE_LAB.getBench().snapshot().activations')==1
   elif filename=='catalog-duel.html':
    page.select_option('#trialSubject','re4-jj');page.click('#trialStart');page.wait_for_timeout(350);page.click('#trialPause');assert page.evaluate('RE_CATALOG_DUEL.getState().frame')>0
   elif filename=='catalog-encounter.html':
    page.select_option('#encSelect','rerequiem-the-girl');page.click('#encUV');assert page.evaluate('RE_CONTEXT_PAGE.getTrial().snapshot().uvUntil')>0
   overflow=page.evaluate('document.documentElement.scrollWidth > innerWidth + 1')
   path=OUT/f'{filename[:-5]}-{width}.png';page.screenshot(path=str(path),full_page=False)
   row={'page':filename,'width':width,'javascriptErrors':errors,'documentOverflow':overflow,'passed':not errors and not overflow,'screenshot':str(path.relative_to(R))};rows.append(row);print(json.dumps(row),flush=True);context.close()
 browser.close()
report={'scope':'Offline Chromium set_content, local scripts/styles and mocked local assets; not public HTTP deployment or physical-device certification.','passed':sum(x['passed'] for x in rows),'failed':sum(not x['passed'] for x in rows),'checks':rows}
(R/'docs/qa-v070-browser.json').write_text(json.dumps(report,indent=2)+'\n');print('FINAL',report['passed'],report['failed'])
