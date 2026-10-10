"""One-time transparent transposition of the user's actual CQC v0.60 sources.

Run with the original extracted source directory as argument. The distributed
project already includes the resulting editable modules; normal builds do not
require the original MGS archive.
"""
from pathlib import Path
import sys, re, json, hashlib

ROOT = Path(__file__).resolve().parents[1]
BASE = Path(sys.argv[1]).resolve()
FILES = ['combat-foundation-v060.js','combat-audio-v060.js','combat-flow-v060.js',
 'defeat-presentation-v060.js','combat-host-v060.js','combat-camera-v060.js',
 'dojo-coach-v060.js','unified-engine-v060.js','finisher-library-v060.js',
 'freeplay-bridge-v060.js','chronicles-core-v060.js','chronicles-v060.js','freeplay-hub-v060.js']
provenance = {'source':'CQC Versus Legacy v0.60 / CQC_Versus_v0.60_Jeux_et_Sources.zip',
 'sourceArchiveSHA256': hashlib.sha256((BASE.parent.parent/'source-base/CQC_Versus_v0.60_Jeux_et_Sources.zip').read_bytes()).hexdigest()
   if (BASE.parent.parent/'source-base/CQC_Versus_v0.60_Jeux_et_Sources.zip').exists() else None,
 'adaptation':'Resident Evil — B.O.W. Protocol','files':[]}

for name in FILES:
    original = (BASE/'src'/name).read_text()
    s = original
    if name == 'unified-engine-v060.js':
        for symbol in ['FIGHTERS','STAGES']:
            marker = 'const '+symbol+'='
            start = s.index(marker)+len(marker)
            _, length = json.JSONDecoder().raw_decode(s[start:])
            s = s[:start]+'window.RE_DATA.'+symbol.lower()+s[start+length:]
        s = re.sub(r"const filters=\[[^\n]+?\];", "const filters=['TOUS',...new Set(FIGHTERS.map(f=>f.source))];", s, count=1)
        s = s.replace("p1=FIGHTERS.findIndex(f=>f.name.includes('THE BOSS')), p2=FIGHTERS.findIndex(f=>f.name==='NAKED SNAKE')", "p1=0, p2=Math.min(1,FIGHTERS.length-1)")
        a=s.index('function matches(f)');b=s.index('function buildFilters()',a)
        s=s[:a]+"function matches(f){const q=($('#search')?.value||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toUpperCase().trim();const text=`${f.name} ${f.ep} ${f.role}`.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toUpperCase();return (!q||text.includes(q))&&(filter==='TOUS'||f.source===filter)}\n"+s[b:]
        a=s.index('function era55(f)');b=s.index('function drawEraHud55',a)
        s=s[:a]+"function era55(f){return{name:f.source+' / BIOHAZARD',accent:'#e8cfc2',bg:'#190d0e',kind:'digital'};}\n"+s[b:]
        s=s.replace("visual:'LEGACY_ART_V4_PRESERVED'", "visual:'RE_REFERENCE_RENDER'")
        s=s.replace("window.__CQC060Versus.release='0.60';", "window.__CQC060Versus.release='RE 0.1.0 / CQC 0.60';window.RE_COMBAT=window.__CQC060Versus;")
        s=s.replace("${STAGES[galleryIndex].ep} · PANORAMA ILLUSTRÉ + PARALLAXE ·", "${STAGES[galleryIndex].ep} · ARÈNE DE SIMULATION ·")
        s=s.replace("'MODE RIPPER'", "'SURACTIVITÉ'").replace("'ZANDATSU'", "'ABSORPTION'")
        # All remaining historical procedural renderers are bypassed by re-renderer.
        # Removing them prevents accidental MGS silhouettes on missing assets.
        a=s.index('function drawStage(');b=s.index('function drawFighter(',a)
        s=s[:a]+"function drawStage(c,stage,time=0,cam=0,preview=false){return window.CQC_PRESENTATION_058.stage(c,stage,time,cam,preview)}\n"+s[b:]
        a=s.index('function drawFighter(');b=s.index('function drawMiniStage()',a)
        s=s[:a]+"function drawFighter(c,f,x,y,face,scale,pose={}){return window.CQC_ACTORS_058.draw(c,f,x,y,face,scale,pose)}\nfunction drawPortrait(canvas,f){return window.CQC_PRESENTATION_058.portrait(canvas,f)}\n"+s[b:]
    if name == 'combat-foundation-v060.js':
        a=s.index('function box(p)');b=s.index('function overlap(',a)
        s=s[:a]+"function box(p){const v=p.f.visual||{},w=Math.max(40,Math.min(280,v.width||78));let h=Math.max(45,Math.min(360,v.height||230));if(p.crouch||p.attack?.def.lowProfile)h*=.53;return{x:p.x-w/2,y:p.y-h,w,h};}\n"+s[b:]
        s=s.replace("'MODE RIPPER'", "'SURACTIVITÉ'").replace("'ZANDATSU'", "'ABSORPTION'")
        s=s.replace('Jauge tactique insuffisante','Jauge de furie insuffisante')
    if name == 'chronicles-v060.js':
        s=s.replace('${list.length} / 354', '${list.length} / ${D.fighters.length}')
        s=s.replace('Récit revu en 0.60','Dossier documenté').replace('Récit réécrit pour ce personnage','Simulation individuelle').replace('Adaptation structurée','Simulation de confinement')
        s=s.replace('cqc-chronicles-', 're-bow-chronicles-')
        s=s.replace("'HUD inspiré de l’époque'", "'HUD biologique'")
    s=s.replace('unified-versus-v060.html','versus.html').replace('unified-versus-v059.html','versus.html').replace('chronicles-v060.html','chronicles.html')
    # The engine's protocol identifiers remain stable for verified iframe bridges.
    # Persistent save keys and envelope schemas belong solely to this new game.
    s=s.replace('cqc.chronicles','re.bow.chronicles').replace('cqc.save-slot','re.bow.save-slot')
    s=s.replace('cqc-v0','re-bow-v0').replace('cqc.audio','re.bow.audio')
    (ROOT/'src'/name).write_text(s)
    provenance['files'].append({'path':'src/'+name,'sourceSHA256':hashlib.sha256(original.encode()).hexdigest(),
       'adaptedSHA256':hashlib.sha256(s.encode()).hexdigest(),'retained':s==original})

scripts={
 'versus.html':['re-data.js','combat-foundation-v060.js','finishers-v053.js','re-renderer.js',
  'combat-audio-v060.js','combat-flow-v060.js','defeat-presentation-v060.js','combat-host-v060.js',
  'combat-camera-v060.js','dojo-coach-v060.js','unified-engine-v060.js','finisher-library-v060.js',
  'freeplay-bridge-v060.js','re-navigation.js'],
 'chronicles.html':['re-data.js','chronicles-data-v060.js','chronicles-core-v060.js','re-renderer.js',
  'combat-audio-v060.js','defeat-presentation-v060.js','chronicles-v060.js','freeplay-hub-v060.js']}
for old,new in [('unified-versus-v060.html','versus.html'),('chronicles-v060.html','chronicles.html')]:
    s=(BASE/'modules'/old).read_text()
    s=re.sub(r'<script\s+src=[\"\'][^\"\']+[\"\'][^>]*>\s*</script>','',s)
    s=s.replace('</head>','<link rel="stylesheet" href="../styles/re-theme.css"></head>')
    s=s.replace('</body>','\n'+''.join('<script src="../src/'+x+'"></script>\n' for x in scripts[new])+'</body>')
    s=s.replace('CQC Versus — Combat 0.60','Resident Evil — B.O.W. Protocol · Versus')
    s=s.replace('CQC — Chroniques 0.60','Resident Evil — B.O.W. Protocol · Dossiers')
    s=s.replace('CQC VERSUS','B.O.W. PROTOCOL').replace('UNIFIED 0.55','RESIDENT EVIL')
    s=s.replace('PURE FIGHTING MODE','BIO ORGANIC WEAPON / COMBAT TRIAL')
    s=s.replace('ARÈNES ILLUSTRÉES 0.60','ENVIRONNEMENTS DE CONFINEMENT').replace('30 SCÈNES','ARÈNES')
    s=s.replace('CQC — CHRONIQUES','B.O.W. — DOSSIERS').replace('CQC — Chroniques','B.O.W. — Dossiers')
    s=s.replace('CQC CHRONICLES','B.O.W. PROTOCOL').replace('CHRONIQUES 0.60','DOSSIERS DE CONFINEMENT')
    s=s.replace('354 personnages','Des spécimens documentés').replace('354 histoires','Parcours de confinement')
    s=s.replace('7 788 moments','Scènes de simulation').replace('1 416 finishers','Conclusions de combat')
    s=s.replace('354','').replace('0.60','0.1.0')
    s=s.replace('unified-versus-v060.html','versus.html').replace('unified-versus-v059.html','versus.html')
    s=s.replace('index-v060.html','../index.html')
    # Keep the exact v0.60 DOM and controls; add a reliable top-level return link.
    s=s.replace('<body>', '<body><a class="re-home-link" href="../index.html" aria-label="Retour au menu principal">← MENU</a>',1)
    (ROOT/'modules'/new).write_text(s)
(ROOT/'docs/source-provenance.json').write_text(json.dumps(provenance,ensure_ascii=False,indent=2))
print('Adapted',len(FILES),'CQC source modules and 2 complete interface modules.')
