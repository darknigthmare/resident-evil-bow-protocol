#!/usr/bin/env python3
"""Integrate reviewed v0.6 runtime modules without downloading code or assets."""
from pathlib import Path
import re
R=Path(__file__).resolve().parents[1]
def read(p):return (R/p).read_text(encoding='utf8')
def put(p,s):(R/p).write_text(s,encoding='utf8')
def patch(p,a,b):
 s=read(p)
 if b in s:return
 if a not in s:raise SystemExit('Integration anchor missing: '+p+' / '+a[:100])
 put(p,s.replace(a,b))
put('styles/bow-v060.css',read('styles/bow-v050.css')+'\n'+read('styles/uroboros-v060.css'))
for q in ['index.html','movesets.html','codex.html','operations.html','modules/versus.html','modules/chronicles.html']:
 s=read(q).replace('bow-v050.css','bow-v060.css').replace('BUILD 0.5.0','BUILD 0.6.0').replace('99/99','115/115').replace('99 INCARNATIONS','115 INCARNATIONS').replace('99 DOSSIERS','115 DOSSIERS').replace('990 TECHNIQUES','1150 TECHNIQUES').replace('99 SUJETS','115 SUJETS').replace('LORE AUDITÉ · 0.5.0','LORE AUDITÉ · 0.6.0').replace('LORE AUDITÉ · 0.4.0','LORE AUDITÉ · 0.6.0').replace('0.5.0 · E-001 FAMILY PROTOCOL','0.6.0 · UROBOROS ASCENSION').replace('01 — 08 / ACCÈS AUTORISÉ','01 — 09 / ACCÈS AUTORISÉ')
 if 're-renderer.js' in s and 're5-scenes-v060.js' not in s:
  s=s.replace('<script src="../src/re-renderer.js">','<script src="../src/re5-scenes-v060.js"></script><script src="../src/re-renderer.js">').replace('<script src="src/re-renderer.js">','<script src="src/re5-scenes-v060.js"></script><script src="src/re-renderer.js">')
 put(q,s)
s=read('index.html')
if 'id="uroborosGrid"' not in s:
 mode='<a class="mode" href="operations.html?mode=uroboros"><span class="mode-num">09</span><span class="mode-symbol">◬</span><h3>UROBOROS ASCENSION</h3><p>16 sujets RE5. Munitions, feu et noyaux exposés dans les chambres Tricell.</p><span class="mode-bottom">PROTOCOLE TRICELL <b>↗</b></span></a>'
 anchor='</div></section>\n<section class="incident-baker"'
 assert anchor in s
 s=s.replace(anchor,mode+anchor,1)
 section='''<section class="uroboros-panel" aria-labelledby="uroborosHeading"><div class="uroboros-copy"><p class="eyebrow">EXTENSION · V0.6.0 / RE5</p><h2 id="uroborosHeading">UROBOROS<br>ASCENSION</h2><p>Du quartier autonome de Kijuju aux laboratoires Tricell. Seize incarnations rejoignent le programme.</p><p class="asset-warning">VISUELS DE RÉFÉRENCE PROVISOIRES<br>Animations latérales définitives à produire. Les nouvelles chambres sont des décors procéduraux originaux.</p><a class="primary-action" href="operations.html?mode=uroboros">OUVRIR LE PROTOCOLE →</a><a class="quiet-link" href="coverage.html">VOIR LES MANQUANTS ET LIMITES →</a></div><div id="uroborosGrid" class="uroboros-grid"></div></section>\n'''
 s=s.replace('<section class="archive-banner">',section+'<section class="archive-banner">')
 s=s.replace('<script src="src/hub.js"></script>','<script src="src/hub.js"></script><script src="src/uroboros-ui.js"></script>')
 s=s.replace('<a href="codex.html">ARCHIVES ↗</a>','<a href="codex.html">ARCHIVES ↗</a><a href="coverage.html">COUVERTURE ↗</a>')
put('index.html',s)
patch('operations.html','<option value="family">E-001 FAMILY · 14 SUJETS</option>','<option value="family">E-001 FAMILY · 14 SUJETS</option><option value="uroboros">UROBOROS ASCENSION · 16 SUJETS</option>')
patch('operations.html','<p id="record"','<p id="routePreview" class="route-preview" aria-live="polite"></p><p id="record"')
s=read('src/operations.js')
if 'const UROBOROS=' not in s:
 s=s.replace('  const APEX_IDS=',"  const UROBOROS=D.protocols.uroboros;\n  const APEX_IDS=",1)
 s=s.replace("family:{title:'E-001 FAMILY PROTOCOL',description:'Quatorze sujets de Dulvey, séparés par incarnation.'}}", "family:{title:'E-001 FAMILY PROTOCOL',description:'Quatorze sujets de Dulvey, séparés par incarnation.'},uroboros:{title:UROBOROS.title,description:UROBOROS.description}}")
 start=s.index('  function routeFor(');end=s.index('\n  function post',start)
 s=s[:start]+'''  function routeFor(mode,uid){
    const fixed=mode==='uroboros'?UROBOROS.ids:mode==='family'?FAMILY_IDS:mode==='apex'?APEX_IDS:null;
    if(fixed){if(fixed.some(id=>!F.some(f=>f.uid===id)))throw Error('Dossier requis manquant');return fixed.slice();}
    const pool=F.filter(f=>f.uid!==uid&&(mode!=='boss'||f.boss));
    if(!pool.length)throw Error('Aucun adversaire disponible');
    const count=mode==='boss'?Math.min(10,pool.length):mode==='arcade'?8:Math.max(pool.length,8),a=shuffle(pool);
    return Array.from({length:count},(_,i)=>a[i%a.length].uid);
  }'''+s[end:]
 s=s.replace("    const key=modeSelect.value+", "    const fixed=['family','apex','uroboros'].includes(modeSelect.value),preview=$('#routePreview');\n    if(preview){const ids=fixed?routeFor(modeSelect.value,f.uid):[];preview.textContent=fixed?ids.length+' RENCONTRES · ORDRE FIXE (duel miroir conservé)\\n'+ids.map(id=>F.find(x=>x.uid===id).name).join(' → '):'Parcours aléatoire ; les résultats proviennent du moteur de combat.';}\n    const key=modeSelect.value+")
 s=s.replace("const stage=run.mode==='family'?", "const stage=run.mode==='uroboros'?(S.find(x=>x.id===UROBOROS.stages[id])||S[run.index%S.length]):run.mode==='family'?")
 s=s.replace("['boss','apex','family'].includes", "['boss','apex','family','uroboros'].includes")
 s=s.replace("    const opponent=run.route[run.index%run.route.length];if", "    if(![0,1].includes(d.winnerSlot)||!Number.isFinite(d.life)||!Number.isFinite(d.maxLife)||d.maxLife<=0||d.life<0||d.life>d.maxLife)return;\n    const opponent=run.route[run.index%run.route.length];if")
 s=s.replace('window.RE_OPERATIONS={getState:', 'window.RE_OPERATIONS={routeFor,uroborosIds:UROBOROS.ids.slice(),uroborosStages:{...UROBOROS.stages},getState:')
 put('src/operations.js',s)
p='src/combat-foundation-v060.js';s=read(p)
if 'function biologyDamage060(' not in s:
 i=s.index('function damage(')
 s=s[:i]+'''function biologyDamage060(s,p,m,blocked){
 const b=p.f.combat.biology;if(!b)return 1;
 const fire=m.tag==='fire'||m.status==='burn';
 if(!blocked&&fire&&b.exposeOnFire){p.statuses.exposed={t:Math.max(p.statuses.exposed?.t||0,b.exposeOnFire)};event(s,'coreExposed',p,{frames:b.exposeOnFire,by:'fire'});}
 const open=p.statuses.exposed?.t>0;
 return clamp(open?(b.exposed||1):(b.shell||1),.5,1.5)*(fire?clamp(b.fire||1,.5,2):1);
}
'''+s[i:]
 s=s.replace("const d=p.f.combat.moves[slot];if(!d)return 'Technique inconnue';", "const d=p.f.combat.moves[slot];if(!d)return 'Technique inconnue';\n if(d.kind==='heal'&&p.f.combat.biology?.noHealingWhileBurning&&p.statuses.burn?.t>0)return 'Réassemblage interrompu par le feu';")
 s=s.replace('function heal(s,p,n,budget){const cap=',"function heal(s,p,n,budget){if(p.f.combat.biology?.noHealingWhileBurning&&p.statuses.burn?.t>0)return 0;const cap=")
 s=s.replace("*(rule58(s,'double_damage')?2:1);", "*(rule58(s,'double_damage')?2:1)*biologyDamage060(s,d,m,blocking||armor||reactive);")
 s=s.replace("event(s,'activate',p,{slot:a.name,kind:d.kind,name:d.name});", "event(s,'activate',p,{slot:a.name,kind:d.kind,name:d.name});\n if(d.exposeSelf&&p.f.combat.biology){p.statuses.exposed={t:d.exposeSelf};event(s,'coreExposed',p,{frames:d.exposeSelf,by:a.name});}")
 put(p,s)
p='src/re-renderer.js';s=read(p)
if 'RE5_SCENES.draw' not in s:
 s=s.replace("    const entry = requestAsset(s.background || s.image || '', 'stage');", "    if(s.re5Scene&&root.RE5_SCENES?.draw(ctx,s,root.matchMedia?.('(prefers-reduced-motion: reduce)').matches?0:time,camera,preview))return true;\n    const entry = requestAsset(s.background || s.image || '', 'stage');")
 s=s.replace("    const entry = requestAsset(s?.background || s?.image || '', 'stage');", "    if(s?.re5Scene&&root.RE5_SCENES?.themes.includes(s.re5Scene))return Promise.resolve({ok:true,path:'procedural:'+s.id});\n    const entry = requestAsset(s?.background || s?.image || '', 'stage');")
 s=s.replace('    if (!pose.knockdown) drawAttackAccent', '''    if(f?.fidelity?.visualStatus?.includes('provisional')){ctx.fillStyle='#deb877';ctx.font='9px monospace';ctx.textAlign='center';ctx.fillText('VISUEL PROVISOIRE',0,20);}
    if(pose.actor?.statuses?.exposed?.t>0){ctx.strokeStyle='#e6b862';ctx.lineWidth=2;ctx.strokeRect(-bodyWidth/2-8,-bodyHeight-8,bodyWidth+16,bodyHeight+13);ctx.fillStyle='#f1cc81';ctx.font='11px monospace';ctx.textAlign='center';ctx.fillText('NOYAU EXPOSÉ',0,-bodyHeight-17);}
    if (!pose.knockdown) drawAttackAccent''')
 put(p,s)
patch('src/unified-engine-v060.js','RE 0.5.0 E-001 FAMILY PROTOCOL / CQC 0.60','RE 0.6.0 UROBOROS ASCENSION / CQC 0.60')
patch('codex.html','RENDU EN PIED + MOVESET 10/10 AUDITÉ','STATUT VISUEL DÉTAILLÉ + MOVESET 10/10 AUDITÉ')
patch('src/codex.js',"'SPÉCIMEN JOUABLE / RENDU EN PIED / MOVESET 10 SUR 10 AUDITÉ'", "('SPÉCIMEN JOUABLE / '+(f.fidelity?.visualStatus?.includes('provisional')?'VISUEL PROVISOIRE':'POSE DE RÉFÉRENCE')+' / MOVESET 10 SUR 10 AUDITÉ')")
patch('src/movesets.js','`${f.fidelity.rule} ${f.fidelity.balanceBoundary}`','`${f.fidelity.rule} ${f.fidelity.balanceBoundary} ${f.assetNote||\'\'} ${f.combat.biology?\'Vulnérabilité globale simulée ; pas de hitbox anatomique exacte.\':\'\'}`')
patch('scripts/compile-content.py',"'paintedArenas':len(roster.get('stages',[]))", "'paintedArenas':len({s['background'] for s in roster.get('stages',[]) if s.get('background')}),'arenaConfigurations':len(roster.get('stages',[])),'proceduralArenas':sum(bool(s.get('re5Scene')) for s in roster.get('stages',[]))")
patch('scripts/build.mjs',"'operations.html','src'", "'operations.html','coverage.html','src'")
p='tests/verify-ui.mjs';s=read(p).replace('RENDU EN PIED \\+ MOVESET','STATUT VISUEL DÉTAILLÉ \\+ MOVESET').replace('E-001 FAMILY PROTOCOL / CQC','UROBOROS ASCENSION / CQC').replace('/EVELINE/','/WESKER/')
put(p,s)
patch('tests/verify-pages.mjs',"assert(/RENDu EN PIED/i.test($(codex, '#detailStatus').textContent));", "assert(/VISUEL PROVISOIRE|POSE DE RÉFÉRENCE/i.test($(codex, '#detailStatus').textContent));")
s=read('movesets.html').replace('990','1150').replace('93 SUJETS','115 SUJETS');put('movesets.html',s)
print('v0.6 runtime, fixed routes, visual-status labels, scenery and build integration applied')
