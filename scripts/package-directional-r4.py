#!/usr/bin/env python3
"""Package the exact Git commit and read-only test reports into bounded Drive artifacts."""
from pathlib import Path
import hashlib,json,subprocess,zipfile,shutil
R=Path(__file__).resolve().parents[1];out=R/'r4-delivery';out.mkdir(exist_ok=True)
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip()
source=out/'BOW_DIRECTIONAL_R4_SOURCE.zip'
subprocess.run(['git','archive','--format=zip','--prefix=bow-directional-r4/','-o',str(source),'HEAD'],cwd=R,check=True)
manifest={};groups={'01_CODE':[],'02_ASSETS_A':[],'03_ASSETS_B':[]};sizes={'02_ASSETS_A':0,'03_ASSETS_B':0}
with zipfile.ZipFile(source) as z:
 assert z.testzip() is None
 infos=[i for i in z.infolist() if not i.is_dir()]
 for info in sorted(infos,key=lambda i:i.compress_size,reverse=True):
  relative=Path(info.filename).relative_to('bow-directional-r4');assert '..' not in relative.parts
  data=z.read(info);manifest[str(relative)]=hashlib.sha256(data).hexdigest()
  group='01_CODE' if relative.parts[0]!='assets' else min(sizes,key=sizes.get)
  if group in sizes:sizes[group]+=info.compress_size
  dest=out/group/'bow-directional-r4'/relative;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data);groups[group].append(str(relative))
assert all(v<90*1024*1024 for v in sizes.values()),sizes
report=out/'00_RAPPORT';report.mkdir(exist_ok=True)
for file in ['docs/DIRECTIONAL_R4_TESTS.json','docs/DIRECTIONAL_R4_ASSETS.json','docs/DIRECTIONAL_R4_SCOPE.md','docs/DIRECTIONAL_R3_PRESERVATION.json','data/directional-reference-review-r4.json']:
 shutil.copy2(R/file,report/Path(file).name)
for file in (R/'qa-directional-r4').glob('*'):
 if file.is_file():shutil.copy2(file,report/file.name)
for key,base in [('FROM_R3','b072ee93c04c62146409e3707baf34c70871b0ef'),('FROM_MAIN','1cac959cd5cc5b40b6cffc94a705970bc74c9580')]:
 with (report/f'BOW_DIRECTIONAL_R4_{key}.patch').open('wb') as f:subprocess.run(['git','diff','--binary',base,'HEAD'],cwd=R,stdout=f,check=True)
(report/'MANIFESTE_R4.json').write_text(json.dumps({'commit':commit,'sourceFiles':len(manifest),'files':manifest,'parts':groups},ensure_ascii=False,indent=2)+'\n')
(report/'verifier_reconstruction.py').write_text('''from pathlib import Path
import json,hashlib,sys
here=Path(__file__).resolve().parent
m=json.loads((here/'MANIFESTE_R4.json').read_text())
root=here/'bow-directional-r4'
errors=[]
for name,expected in m['files'].items():
 p=root/name
 if not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=expected:errors.append(name)
print('Commit:',m['commit'],'Fichiers vérifiés:',len(m['files']),'Erreurs:',len(errors))
for name in errors:print(name)
sys.exit(bool(errors))
''')
(report/'LISEZ_MOI_R4.txt').write_text(f'''B.O.W. PROTOCOL — RENDU DIRECTIONNEL R4
Commit exact : {commit}
PR : https://github.com/darknigthmare/resident-evil-bow-protocol/pull/11

Extraire les quatre archives 00_RAPPORT, 01_CODE, 02_ASSETS_A, 03_ASSETS_B dans le même répertoire. Elles contiennent des fichiers complémentaires, pas des volumes ZIP numérotés.
Le code et les assets doivent se réunir sous bow-directional-r4/.
Lancer python verifier_reconstruction.py pour vérifier les {len(manifest)} fichiers du commit.
Dans bow-directional-r4/, lancer npm start, puis ouvrir http://localhost:5173/directions.html.
Pour voir la nouvelle paire en duel : http://localhost:5173/catalog-duel.html?uid=reoutbreak2-zombie-hyena et choisir Strelat comme adversaire.

R4 : douze PNG de combat préparés depuis les références existantes. Deux nouvelles silhouettes natives de profil approximatif, dix références encore obliques. Aucun nouveau dessin final et aucune animation dessinée. Cinq corps sur 346 possèdent une pose de référence bidirectionnelle ; les autres restent à réaliser. Pas de fusion dans main ni nouveau déploiement Vercel.
Les tests du navigateur sont ceux décrits par BROWSER_R4_RESULTS.json ; les images jointes viennent du vrai navigateur et de ses fichiers locaux, pas d'une génération.
''')
# Verify the combined parts against each byte from the commit, before publication.
for name,expected in manifest.items():
 candidates=[out/g/'bow-directional-r4'/name for g in groups];found=[p for p in candidates if p.is_file()];assert len(found)==1,name;assert hashlib.sha256(found[0].read_bytes()).hexdigest()==expected
checks=[]
for group in ['00_RAPPORT',*groups]:
 dest=out/(group+'.zip')
 with zipfile.ZipFile(dest,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for p in sorted((out/group).rglob('*')):
   if p.is_file():z.write(p,p.relative_to(out/group))
 assert dest.stat().st_size<100*1024*1024,(group,dest.stat().st_size)
 with zipfile.ZipFile(dest) as z:assert z.testzip() is None
 checks.append({'name':dest.name,'bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
(out/'SHA256_R4.json').write_text(json.dumps({'commit':commit,'files':checks},indent=2)+'\n')
print(json.dumps({'commit':commit,'verifiedSourceFiles':len(manifest),'packages':checks},indent=2))
