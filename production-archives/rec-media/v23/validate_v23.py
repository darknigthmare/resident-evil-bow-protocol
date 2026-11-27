#!/usr/bin/env python3
"""Validate V23 files, guide provenance, links and prototype logic; never modify old evidence."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit
import hashlib
import json
import re
import subprocess
import tempfile
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
DOCS = ROOT/'docs/combat-bible'
BASE = '7c679b38c72ee4d34fd1c39d1dc8950dd4f506aa'
checks=[]

def require(condition, name, detail=None):
    checks.append({'check':name,'passed':bool(condition),'detail':detail})
    if not condition:
        raise AssertionError(f'{name}: {detail}')

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

tracked=set(subprocess.check_output(['git','ls-tree','-r','--name-only',BASE],cwd=ROOT,text=True).splitlines())

def available(path):
    path=path.resolve()
    if path in {HERE/'reports/VALIDATION_V23.json',HERE/'reports/DOMAIN_QA_ROOT_V23.tap'}:
        return True  # This command writes these two named outputs before succeeding.
    try: rel=path.relative_to(ROOT).as_posix()
    except ValueError: return False
    return path.exists() or rel in tracked or any(x.startswith(rel+'/') for x in tracked)

def local_target(owner,url):
    parsed=urlsplit(url)
    if parsed.scheme or parsed.netloc or not parsed.path or parsed.path.startswith('data:'):
        return None
    return owner.parent/unquote(parsed.path)

class HtmlCheck(HTMLParser):
    def __init__(self):
        super().__init__();self.links=[];self.ids=[];self.images=[];self.in_script=False;self.script_type='';self.script_text='';self.scripts=[];self.inline_json=[]
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if 'id' in attrs:self.ids.append(attrs['id'])
        for k in ('href','src'):
            if attrs.get(k):self.links.append(attrs[k])
        if tag=='img':self.images.append(attrs)
        if tag=='script' and 'src' not in attrs:
            self.in_script=True;self.script_type=attrs.get('type','');self.script_text=''
    def handle_data(self,data):
        if self.in_script:self.script_text+=data
    def handle_endtag(self,tag):
        if tag=='script' and self.in_script:
            if self.script_type=='application/json':self.inline_json.append(json.loads(self.script_text))
            else:self.scripts.append(self.script_text)
            self.in_script=False

manifest=json.loads((HERE/'ASSET_MANIFEST_V23.json').read_text())
assets=manifest['assets']
require(len(assets)==11,'11 PNG manifestés')
require(sum(a['status']=='animation_key_candidate' for a in assets)==9,'9 clés candidates')
require(sum(a['status']=='superseded_trial' for a in assets)==2,'2 essais remplacés')
require(len({a['sha256'] for a in assets})==11,'11 contenus distincts')
require(set(p.relative_to(HERE).as_posix() for p in (HERE/'assets').rglob('*.png'))==set(a['path'] for a in assets),'Tous les PNG du lot sont manifestés')
for a in assets:
    p=HERE/a['path'];data=p.read_bytes()
    with Image.open(p) as im:
        im.load()
        require(list(im.size)==a['dimensions'] and im.mode=='RGBA','Dimensions et mode '+a['asset_id'])
        alpha=im.getchannel('A')
        require(list(alpha.getextrema())==a['alpha_range'] and alpha.getextrema()[0]==0 and alpha.getextrema()[1]>128,'Alpha utile '+a['asset_id'])
    blob=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
    require(sha(p)==a['sha256'] and blob==a['git_blob_sha'] and len(data)==a['file_bytes'],'Empreintes PNG '+a['asset_id'])
    require(sha(ROOT/a['reference_asset'])==a['reference_asset_sha256'],'Référence exacte '+a['asset_id'])
    require(not a['engine_admitted'] and not a['animation_complete'] and not a['canonical_fidelity_1_1_certified'],'Qualification de pose '+a['asset_id'])
    if a['status']=='superseded_trial':require(available(HERE/a['superseded_by']),'Remplacement vérifiable '+a['asset_id'])
require(sha(HERE.parent/'v22/ASSET_MANIFEST_V22.json')==manifest['v22_manifest_sha256'],'Manifeste V22 conservé')

source_manifest=json.loads((DOCS/'sources/manifest.json').read_text())
require(len(source_manifest['files'])==3,'3 originaux du guide')
for source in source_manifest['files']:
    p=DOCS/'sources'/source['file']
    require(p.stat().st_size==source['bytes'] and sha(p)==source['sha256'],'Original intact '+source['file'])
source_sections=json.loads((DOCS/'sources/sections.json').read_text())
matrix=json.loads((DOCS/'INTEGRATION_MATRIX.json').read_text())
matrix_sections=matrix['sections']
require({str(s['section']).zfill(2) for s in source_sections}=={f'{i:02d}' for i in range(68)},'68 sections sources distinctes')
require(len(matrix_sections)==68 and {str(s['section']).zfill(2) for s in matrix_sections}=={s['section'] for s in source_sections},'Correspondance complète des 68 sections')

missing=[];link_count=0;html_count=0;syntax_count=0
files=list(DOCS.rglob('*.md'))+list(HERE.rglob('*.md'))+[ROOT/'README.md',HERE.parent/'README.md']
for p in files:
    body=p.read_text()
    body=re.sub(r'```[\s\S]*?```','',body)
    for url in re.findall(r'\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)',body):
        target=local_target(p,url)
        if target is not None:
            link_count+=1
            if not available(target):missing.append({'file':p.relative_to(ROOT).as_posix(),'target':url})
for p in (HERE/'galerie.html',HERE/'prototype/index.html'):
    parsed=HtmlCheck();parsed.feed(p.read_text());html_count+=1
    require(len(parsed.ids)==len(set(parsed.ids)),'Identifiants HTML uniques '+p.name)
    require(all('alt' in img for img in parsed.images),'Alternatives images '+p.name)
    for url in parsed.links:
        target=local_target(p,url)
        if target is not None:
            link_count+=1
            if not available(target):missing.append({'file':p.relative_to(ROOT).as_posix(),'target':url})
    for script in parsed.scripts:
        with tempfile.NamedTemporaryFile(mode='w',suffix='.js',delete=True) as f:
            f.write(script);f.flush()
            done=subprocess.run(['node','--check',f.name],capture_output=True,text=True)
            require(done.returncode==0,'Syntaxe script HTML '+p.name,done.stderr or None);syntax_count+=1
    if p.name=='galerie.html':require(parsed.inline_json==[manifest],'Galerie embarque le manifeste exact')
require(not missing,'Liens locaux MD/HTML',{'count':link_count,'missing':missing})
for p in sorted((HERE/'prototype').glob('*.js'))+sorted((HERE/'prototype').glob('*.mjs')):
    done=subprocess.run(['node','--check',str(p)],capture_output=True,text=True)
    require(done.returncode==0,'Syntaxe '+p.name,done.stderr or None);syntax_count+=1
tests=subprocess.run(['node','--test','--test-reporter=tap',str(HERE/'prototype/test-access.mjs')],cwd=ROOT,capture_output=True,text=True)
require(tests.returncode==0 and '# pass 26' in tests.stdout and '# fail 0' in tests.stdout,'26 tests de domaine',{'returncode':tests.returncode})
(HERE/'reports/DOMAIN_QA_ROOT_V23.tap').write_text(tests.stdout,encoding='utf-8')
changed=subprocess.check_output(['git','diff','--name-only',BASE],cwd=ROOT,text=True).splitlines()
new=subprocess.check_output(['git','ls-files','--others','--exclude-standard'],cwd=ROOT,text=True).splitlines()
allowed=lambda p:p in ('README.md','production-archives/rec-media/README.md') or p.startswith(('docs/combat-bible/','production-archives/rec-media/v23/'))
require(all(allowed(p) for p in changed+new),'Périmètre V23 limité',{'outside':[p for p in changed+new if not allowed(p)]})
diff=subprocess.run(['git','diff','--check',BASE],cwd=ROOT,capture_output=True,text=True)
require(diff.returncode==0,'Diff sans erreur d’espacement',diff.stdout or None)
report={'schema':'rec-v23-validation-1','date':'2026-11-27','timezone':'Europe/Paris','base_commit':BASE,
        'status':'passed_scoped_checks','checks':checks,
        'summary':{'passed':len(checks),'failed':0,'png':11,'candidate_keys':9,'superseded_trials':2,
                   'original_guides':3,'guide_sections':68,'local_links':link_count,'html_files':html_count,
                   'javascript_syntax_checks':syntax_count,'domain_tests_passed':26},
        'browser_validation':{'status':'blocked','reason':'Chromium absent ; téléchargement du navigateur Playwright refusé HTTP403.',
                              'assertions_executed':0,'screenshots':0,'report':'../prototype/reports/BROWSER_QA.json'},
        'not_run':['Gameplay/build global (hors périmètre documentaire, média et prototype isolé).','CI distante du futur commit.'],
        'limits':['Contrôles de fichiers/structure/logique ; aucune certification artistique globale 1:1.',
                  'Aucune animation complète ni nouvelle admission moteur.',
                  'Les liens du dépôt non matérialisés en sparse sont vérifiés contre les chemins Git de la base.']}
(HERE/'reports/VALIDATION_V23.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report['summary'],ensure_ascii=False))
