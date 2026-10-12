#!/usr/bin/env python3
"""Bounded read-only inspection of public references already in the catalog."""
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime,timezone
from html.parser import HTMLParser
import hashlib,json,time
R=Path(__file__).resolve().parents[1]
class Paragraphs(HTMLParser):
 def __init__(self):super().__init__();self.active=False;self.in_h1=False;self.stop=False;self.buf=[];self.title='';self.ignore=0
 def handle_starttag(self,tag,attrs):
  if tag=='h1':self.in_h1=True;self.active=True
  if self.active and tag=='h2':self.stop=True
  if tag in ('script','style'):self.ignore+=1
 def handle_endtag(self,tag):
  if tag=='h1':self.in_h1=False
  if tag in ('script','style'):self.ignore=max(0,self.ignore-1)
 def handle_data(self,text):
  if self.in_h1:self.title+=text
  elif self.active and not self.stop and not self.ignore:self.buf.append(text)
def get(c):
 url=c['sourcePage'];out={'id':c['id'],'url':url,'checkedAt':datetime.now(timezone.utc).isoformat()}
 assert urlparse(url).hostname=='www.evilresource.com' and '/enemies/' in url
 try:
  time.sleep(.25)
  with urlopen(Request(url,headers={'User-Agent':'BOWProtocolCatalogReview/1.0'}),timeout=25) as res:
   assert urlparse(res.url).hostname=='www.evilresource.com';raw=res.read(2000001);assert len(raw)<=2000000;out.update(status=res.status,pageSha256=hashlib.sha256(raw).hexdigest())
  p=Paragraphs();p.feed(raw.decode('utf8'));out['title']=p.title;out['excerpt']=' '.join(' '.join(p.buf).split('Category')[0].split()[:180])
 except Exception as e:out.update(status='unavailable',error=type(e).__name__)
 return out
if __name__=='__main__':
 data=json.loads((R/'data/roster.json').read_text());ids={f['uid'] for f in data['fighters']};missing=[c for c in data['catalog'] if c['id'] not in ids]
 with ThreadPoolExecutor(max_workers=4) as pool:result=list(pool.map(get,missing))
 out=R/'research-output';out.mkdir(exist_ok=True);(out/'observations.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps({'requested':len(result),'http200':sum(x['status']==200 for x in result),'withDescription':sum(bool(x.get('excerpt')) for x in result)}))
