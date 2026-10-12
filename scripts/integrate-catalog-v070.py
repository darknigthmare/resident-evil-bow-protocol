#!/usr/bin/env python3
from pathlib import Path
import json
R=Path(__file__).resolve().parents[1]
def patch(p,a,b):
 f=R/p;s=f.read_text()
 if b in s:return
 assert a in s,(p,a[:80]);f.write_text(s.replace(a,b),encoding='utf8')
# Isolate the experimental lab in its own HTML route, preserving production datasets.
s=(R/'laboratory.html').read_text().replace('Banc d’essai —','Catalogue expérimental —').replace('src/runtime-contract.js','src/catalog-expansion-data.js').replace('<script src="src/combat-foundation-v060.js">','<script src="src/catalog-trial-adapter.js"></script><script src="src/combat-foundation-v060.js">')
s=s.replace('src/technique-lab-v061.js','src/catalog-laboratory-v070.js').replace('href="index.html">← MENU','href="catalog.html">← ANNEXE').replace('BANC D’ESSAI / MOTEUR DE COMBAT','ANNEXE EXPÉRIMENTALE / AUCUNE PROGRESSION')
(R/'catalog-laboratory.html').write_text(s,encoding='utf8')
s=(R/'src/technique-lab-v061.js').read_text().replace("'movesets.html?uid='+encodeURIComponent(f.uid)","(f.experimental?'catalog.html?id=':'movesets.html?uid=')+encodeURIComponent(f.uid)")
(R/'src/catalog-laboratory-v070.js').write_text(s,encoding='utf8')
# Main interface exposes the annex without enrolling unfinished fighters into saves.
patch('index.html','<section class="archive-banner">','<section class="archive-banner"><div><span class="eyebrow">EXTENSION DU CATALOGUE · V0.7.0</span><h2>274 dossiers désormais détaillés.</h2><p>231 prototypes de combat et 43 exercices contextuels, hors progression. Illustrations provisoires ; animations originales à produire.</p></div><div class="archive-actions"><a href="catalog.html">OUVRIR LES 274 DOSSIERS →</a><a href="catalog-duel.html">DUEL EXPÉRIMENTAL →</a></div></section>\n<section class="archive-banner">')
# Existing coverage counts remain production counts; detailed new records linked beside them.
patch('coverage.html','<main class="coverage-main">','<main class="coverage-main"><p class="asset-warning">Les 274 entrées hors progression possèdent maintenant une fiche enrichie et un essai isolé. Elles restent hors roster principal tant que leur fidélité visuelle et leur gameplay ne sont pas finalisés. <a href="catalog.html">OUVRIR L’ANNEXE COMPLÈTE →</a></p>')
patch('src/codex.js',"$('#detailSources').replaceChildren();", "if(!f)$('#detailActions').append(link('FICHE ENRICHIE ET ESSAI →','catalog.html?id='+encodeURIComponent(id)));\n  $('#detailSources').replaceChildren();")
patch('scripts/build.mjs',"'finishers.html','src'","'finishers.html','catalog.html','catalog-laboratory.html','catalog-duel.html','catalog-encounter.html','src'")
for p in list(R.glob('*.html'))+list((R/'modules').glob('*.html')):
 s=p.read_text().replace('bow-v061.css','bow-v070.css').replace('BUILD 0.6.1','BUILD 0.7.0').replace('B.O.W. PROTOCOL / 0.6.1','B.O.W. PROTOCOL / 0.7.0').replace('0.6.1 · CONTAINMENT CONTINUITY','0.7.0 · CATALOGUE ÉTENDU');p.write_text(s)
# Version only in engine banner; combat values and commands are unmodified.
patch('src/unified-engine-v060.js','RE 0.6.1 UROBOROS ASCENSION / CQC 0.60','RE 0.7.0 UROBOROS ASCENSION / CQC 0.60')
(R/'styles/bow-v070.css').write_text((R/'styles/bow-v061.css').read_text())
p=R/'package.json';d=json.loads(p.read_text());d['version']='0.7.0';
if 'verify-v070.mjs' not in d['scripts']['verify']:d['scripts']['verify']+=' && node tests/verify-v070.mjs'
d['scripts']['docs:release']='python3 scripts/release-v070.py';p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
p=R/'data/roster.json';d=json.loads(p.read_text());d['version']='0.7.0';p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
print('Catalog routes integrated; production fighters unchanged.')

patch('tests/verify-pages.mjs',"} else { assert.equal(links.length, 0); assert(/ARCHIVE DOCUMENTAIRE/","} else { assert.equal(links.length, 1); assert.equal(new URL(links[0].getAttribute('href'),'https://example.test/').pathname,'/catalog.html'); assert.equal(new URL(links[0].getAttribute('href'),'https://example.test/').searchParams.get('id'),entry.id); assert(/ARCHIVE DOCUMENTAIRE/")

for file in ['coverage.html','src/coverage-v060.js']:
 p=R/file;s=p.read_text().replace('ENTRÉES DOCUMENTAIRES','HORS ROSTER PRINCIPAL').replace('DOCUMENTAIRES / NON JOUABLES','ANNEXE / HORS PROGRESSION').replace("'DOCUMENTAIRE'","'ANNEXE · HORS PROGRESSION'").replace('Profil de combat, animation et tests à produire.','Prototype isolé disponible ; animations et validation complète restent à produire.').replace("'codex.html?id='","'catalog.html?id='");p.write_text(s,encoding='utf8')
