from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse,unquote
from decimal import Decimal
import hashlib,json,re,subprocess,zipfile,xml.etree.ElementTree as ET
ROOT=Path('/workspace/scratch/39787b3268a6')
BASE=ROOT/'production-archives/rec-media/v22'
V21=BASE.parent/'v21'
manifest=json.loads((BASE/'ASSET_MANIFEST_V22.json').read_text())
inv=json.loads((BASE/'inventory/INVENTAIRE_COMPLET_V22_20261124.json').read_text())
assert manifest['generation_reports_finalized'] and not manifest['unreported_in_progress_png']
assert all(a['sources'] and a['prompt'] for a in manifest['assets'])
assert all(r.get('request_id') for r in manifest['tool_refusals'])
assert [manifest['summary'][k] for k in ['png_outputs','static_candidates','visual_studies','rejected_trials','tool_refusals_no_png']]==[80,77,1,2,13]
class Links(HTMLParser):
 def __init__(self): super().__init__();self.links=[];self.cards=0;self.images=0
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if tag=='article' and 'card' in d.get('class','').split(): self.cards+=1
  if tag=='img': self.images+=1;assert d.get('alt')
  for key in ('href','src'):
   if d.get(key): self.links.append(d[key])
page=(BASE/'galerie.html').read_text(); p=Links();p.feed(page); local=[]
for link in p.links:
 u=urlparse(link)
 if not u.scheme and u.path:
  assert (BASE/unquote(u.path)).exists(),('Broken link',link)
  local.append(link)
assert p.cards==p.images==80
js=re.findall(r'<script>(.*?)</script>',page,re.S);assert len(js)==1
jsp=ROOT/'v22_work/gallery_v22_script.js';jsp.write_text(js[0])
subprocess.run(['/opt/codex/runtimes/codex-primary-runtime/dependencies/node/bin/node','--check',str(jsp)],check=True,capture_output=True,text=True)
NS={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
def readbook(path):
 with zipfile.ZipFile(path) as z:
  assert z.testzip() is None
  shared=[]
  if 'xl/sharedStrings.xml' in z.namelist():
   shared=[''.join(n.itertext()) for n in ET.fromstring(z.read('xl/sharedStrings.xml'))]
  rels={x.attrib['Id']:x.attrib['Target'] for x in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
  result={};cached={}
  for sheet in ET.fromstring(z.read('xl/workbook.xml')).find('s:sheets',NS):
   t=rels[sheet.attrib['{'+NS['r']+'}id']];t=t.lstrip('/') if t.startswith('/') else 'xl/'+t
   cells={};values={}
   for c in ET.fromstring(z.read(t)).iter('{'+NS['s']+'}c'):
    f=c.find('s:f',NS);v=c.find('s:v',NS);typ=c.get('t')
    if typ=='s': val=('text',shared[int(v.text)]) if v is not None else ('text','')
    elif typ=='inlineStr': val=('text',''.join(c.find('s:is',NS).itertext()))
    elif v is None: val=('text','')
    elif typ=='str': val=('text',v.text or '')
    elif typ in ('b','e'): val=(typ,v.text or '')
    else: val=('number',str(Decimal(v.text).normalize()))
    if val!=('text',''): values[c.attrib['r']]=val
    if f is not None: cells[c.attrib['r']]=('formula',f.text or '')
    elif val!=('text',''): cells[c.attrib['r']]=val
   result[sheet.attrib['name']]=cells;cached[sheet.attrib['name']]=values
  return result,cached
old,_=readbook(V21/'inventory/Resident_Evil_Combat_Inventaire_V21_20261124.xlsx')
new,cached=readbook(BASE/'inventory/Resident_Evil_Combat_Inventaire_V22_20261124.xlsx')
diff=[]
for name,cells in old.items():
 assert name in new
 for cell in cells.keys()|new[name].keys():
  if name=='Synthese' and cell in ('A2','A3'): continue
  if cells.get(cell)!=new[name].get(cell): diff.append((name,cell,cells.get(cell),new[name].get(cell)))
assert not diff,diff[:20]
assert len(old)==11 and len(new)==22
qual=lambda v:inv['qualification_labels_v22'].get(v,v)
for n,r in enumerate(inv['specifications_stages_v1_non_cumulees'],7):
 assert new['SpecsStagesV22'][f'E{n}']==('text',qual(r['statut_v22']))
 assert r['note_v22'] in new['SpecsStagesV22'][f'H{n}'][1]
for n,r in enumerate(inv['projectile_families'],7): assert new['FamillesV22'][f'D{n}']==('text',qual(r['statut_v22']))
for n,r in enumerate(inv['catalogue_costumes_v22']['variants'],7): assert new['CostumesV22'][f'E{n}']==('text',qual(r['status_v22']))
expected=[80,77,1,2,13,25,15,5,32,3]
actual=[int(Decimal(cached['BilanV22'][f'B{n}'][1])) for n in range(7,17)]
assert actual==expected,(actual,expected)
qa={'date':'2026-11-24','result':'PASS','manifest_png_outputs':80,'all_assets_have_source_pages_and_exact_prompts':True,'all_refusals_have_request_ids':True,'gallery':{'cards':p.cards,'images':p.images,'local_links_checked':len(local),'broken_local_links':[],'javascript_syntax':'PASS','browser_render_tested':False},'workbook':{'worksheets':len(new),'historical_worksheets':list(old),'historical_values_and_formulas_preserved':True,'historical_cells_compared':sum(len(v) for v in old.values())-2,'intentional_changed_historical_cells':['Synthese!A2','Synthese!A3'],'unexpected_historical_value_changes':diff,'formula_cached_values':actual,'formula_expected_values':expected,'updated_stage_specifications_checked':24,'updated_family_labels_checked':16,'updated_costume_labels_checked':38,'visual_previews_reviewed_by_root':False},'canonical_fidelity_1_1_certified':False,'engine_integration_tested':False,'historical_reference_files_changed':False,'recovery':'Checks performed on the reconstructed delivery; native PNG identity verified separately by assemble_delivery.py.'}
(BASE/'reports/DELIVERY_QA_V22.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'result':'PASS','png':80,'gallery_links':len(local),'sheets':len(new),'historical_cells':qa['workbook']['historical_cells_compared'],'formula_values':actual}))

