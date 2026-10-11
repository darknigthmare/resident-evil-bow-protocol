#!/usr/bin/env python3
from __future__ import annotations
from pathlib import Path
from PIL import Image
from collections import Counter
import hashlib, json, copy

ROOT=Path(__file__).resolve().parents[1]
VERSION='0.3.0'
SLOTS=['light','heavy','low','throw','special','specialDown','specialForward','specialBack','super','utility']

def read(p): return json.loads((ROOT/p).read_text(encoding='utf-8'))
def write(p,d): (ROOT/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def image_meta(rel):
    p=ROOT/rel; raw=p.read_bytes(); im=Image.open(p).convert('RGBA'); a=im.getchannel('A'); box=a.getbbox() or (0,0,im.width,im.height)
    return {'width':im.width,'height':im.height,'format':'PNG','bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'transparent':a.getextrema()[0]<255,'alphaBox':list(box),'spriteCrop':[box[0],box[1],box[2]-box[0],box[3]-box[1]]}

def move(name,kind,startup,active,recovery,damage,reach,level,cost,meter,tag,evidence,basis,source,counterplay,**extra):
    d={'name':name,'kind':kind,'startup':startup,'active':active,'recovery':recovery,'damage':damage,'reach':reach,'level':level,'cost':cost,'meter':meter,'cooldown':0,'tag':tag,'counterplay':counterplay,'lore':evidence,'evidence':evidence,'loreBasis':basis,'adaptation':(
      'Action directement rattachée aux attaques ou comportements documentés de cette incarnation ; seuls le timing, la portée, les dégâts et les commandes sont adaptés au moteur 2D.' if evidence=='canonical' else
      'Extension prudente de l’anatomie, de la locomotion et des réactions visibles de cette incarnation ; aucun pouvoir provenant d’une autre phase n’est ajouté.' if evidence=='anatomical' else
      'Fonction de déplacement ou de lisibilité nécessaire au duel 2D, explicitement non présentée comme une action canonique.'), 'source':source}
    d.update(extra); return d

SRC_BLOG='https://blackjackrants.blogspot.com/2020/11/reviewing-monsters-resident-evil-7.html'
SRC_REGEN='https://www.evilresource.com/resident-evil-7/end-of-zoe/files/analysis-report'
SRC_SWAMP='https://www.evilresource.com/resident-evil-7/end-of-zoe/enemies/swamp-man'
SRC_BUG='https://www.evilresource.com/resident-evil-7/enemies/bug-swarm'
SRC_RAM='https://www.evilresource.com/resident-evil-7/not-a-hero/files/anti-regen-ammo-ramrods-guide'
SRC_FILTER='https://www.evilresource.com/resident-evil-7/not-a-hero/items/high-grade-filter'
SRC_EVE='https://www.evilresource.com/resident-evil-7/not-a-hero/files/eveline-observation-log'
SRC_TOX='https://www.evilresource.com/resident-evil-7/items/e-necrotoxin'
SRC_FUMER='https://www.evilresource.com/resident-evil-7/not-a-hero/enemies/fumer'

specs={
're7-jack-baker-mutated': dict(name='JACK BAKER — FORME MUTÉE', ep='Resident Evil 7 biohazard (2017)', role='COLOSSE MULTI-OCULAIRE', archetype='quadruped', power=1.30,speed=.72,reach=1.35,color='#251d1b',accent='#d89a68',bio='Moisissure / E-001',morph='Grande masse fongique noire aux nombreux yeux, propre au combat du hangar à bateaux.', visual=('quadruped',190,320,'left',True,'massive','quadruped'),sprite='assets/specimens/re7-jack-baker-mutated.png',portrait='assets/catalog/re7-jack-baker-mutated.png',sources=[SRC_BLOG,SRC_REGEN],canonical=['Tentacules','Écrasement','Projection corrosive','Régénération multi-oculaire'],resource=('YEUX MUTÉS',.22),passive=('Régénération multi-oculaire','Les yeux exposés structurent ses fenêtres de vulnérabilité et une récupération limitée.',980),family='beast'),
're7-jack-baker-swamp-man': dict(name='JACK BAKER — SWAMP MAN', ep='Resident Evil 7 biohazard — End of Zoe (2017)',role='POURSUITE RÉGÉNÉRATIVE',archetype='molded',power=1.18,speed=.95,reach=1.18,color='#1d2926',accent='#86a295',bio='Moisissure / E-001',morph='Forme humanoïde de Jack, couverte de matière fongique et végétale des marais.',visual=('human',286,175,'front',True,'massive','molded'),sprite='assets/specimens/re7-jack-baker-swamp-man.png',portrait='assets/catalog/re7-jack-baker-swamp-man.png',sources=[SRC_SWAMP,SRC_REGEN],canonical=['Coup de poing','Charge','Saisie','Tentacule du bras droit','Régénération'],resource=('RÉGÉNÉRATION E-SERIES',.25),passive=('Cellules impossibles à fixer','La forme des marais revient après les impacts jusqu’à épuisement de son budget régénératif.',1050),family='capture'),
're7-marguerite-baker-mutated': dict(name='MARGUERITE BAKER — FORME MUTÉE',ep='Resident Evil 7 biohazard (2017)',role='EMBUSCADE INSECTOÏDE',archetype='crawler',power=1.00,speed=1.18,reach=1.32,color='#4d493a',accent='#b9c788',bio='Moisissure / E-001',morph='Mutation aux membres allongés et à l’abdomen transformé en nid, capable d’escalader la serre.',visual=('human',270,220,'front',True,'athletic','crawler'),sprite='assets/specimens/re7-marguerite-baker-mutated.png',portrait='assets/catalog/re7-marguerite-baker-mutated.png',sources=[SRC_BLOG,SRC_BUG],canonical=['Bond','Saisie','Essaim d’insectes','Escalade','Nid abdominal'],resource=('COLONIE D’INSECTES',.30),passive=('Nid abdominal','Marguerite alterne mobilité sur les parois, embuscades et génération d’insectes.',760),family='beast'),
're7-lucas-baker-mutated': dict(name='LUCAS BAKER — FORME MUTÉE',ep='Resident Evil 7 biohazard — Not a Hero (2017)',role='CONTAMINATION FONGIQUE',archetype='molded',power=1.17,speed=1.04,reach=1.20,color='#392e2c',accent='#d7785e',bio='Moisissure / E-001',morph='Mutation fongique rapide aux bras griffus et noyau thoracique exposé, propre au laboratoire de Not a Hero.',visual=('human',250,270,'left',True,'massive','molded'),sprite='assets/specimens/re7-lucas-baker-mutated.png',portrait='assets/catalog/re7-lucas-baker-mutated.png',sources=[SRC_BLOG,SRC_RAM,SRC_FILTER],canonical=['Griffes','Charge bondissante','Noyau thoracique','Contamination aérienne','Régénération'],resource=('CONTAMINATION DU LABO',.24),passive=('Régénération inhibitable','Son noyau et sa régénération sont puissants mais vulnérables à l’inhibition mycotoxique.',920),family='beast'),
're7-eveline-final': dict(name='EVELINE — FORME FINALE',ep='Resident Evil 7 biohazard (2017)',role='COLONIE TERMINALE',archetype='colony',power=1.28,speed=.65,reach=1.40,color='#171a1d',accent='#8d9fa8',bio='Moisissure / E-001',morph='Masse colossale de mutamycète à visage et tentacules, limitée à la manifestation finale du domaine Baker.',visual=('quadruped',225,320,'left',True,'massive','colony'),sprite='assets/specimens/re7-eveline-final.png',portrait='assets/catalog/re7-eveline-final.png',sources=[SRC_BLOG,SRC_EVE,SRC_TOX],canonical=['Tentacules','Saisie','Écrasement','Expansion de la colonie'],resource=('MASSE E-001',.20),passive=('Ancrage au domaine','La colonie terminale impose sa portée et récupère lentement une partie des dommages.',1100),family='beast'),
're7-fumer': dict(name='FUMER (WM-002)',ep='Resident Evil 7 biohazard — Not a Hero (2017)',role='RÉGÉNÉRATION BLANCHE',archetype='molded',power=1.02,speed=1.02,reach=1.05,color='#827c73',accent='#e0d7cb',bio='Moisissure blanche / WM-002',morph='Variante blanche du Molded, résistante aux armes ordinaires tant que sa régénération n’est pas inhibée.',visual=('human',285,120,'front',False,'athletic','molded'),sprite='assets/specimens/re7-fumer.png',portrait='assets/catalog/re7-fumer.png',sources=[SRC_FUMER,SRC_RAM],canonical=['Griffes','Charge','Régénération résistante'],resource=('MEMBRANE WM-002',.28),passive=('Régénération anti-balistique','La membrane blanche régénère les dégâts récupérables dans une limite stricte.',880),family='capture'),
}

# Per-incarnation move authoring. Every name and evidence boundary is explicit.
def moves_for(uid,s):
    B=f"Capacités documentées pour {s['ep']} : " + ' / '.join(s['canonical'])
    close='Garder puis punir la récupération ; la prise contourne une garde passive.'
    low='Garde basse ou saut ; la garde haute ne suffit pas.'
    proj='Se déplacer hors de la trajectoire ou bloquer ; punir le long départ à courte portée.'
    if uid=='re7-jack-baker-mutated': return {
      'light':move('Tentacule latéral multi-oculaire','melee',8,4,15,350,118,'mid',0,0,'tentacle','canonical',B,SRC_BLOG,close),
      'heavy':move('Écrasement du hangar','melee',20,7,30,760,165,'mid',0,0,'strike','canonical',B,SRC_BLOG,'Sortir de la zone avant l’impact ou bloquer puis punir.'),
      'low':move('Balayage ventral des yeux','melee',14,5,25,470,158,'low',0,0,'tentacle','anatomical',s['morph'],SRC_BLOG,low),
      'throw':move('Saisie de l’œil central','melee',11,4,36,850,96,'throw',0,0,'grapple','canonical',B,SRC_BLOG,'Reculer, sauter ou déchoper pendant la fenêtre de saisie.'),
      'special':move('Projection corrosive du hangar','projectile',34,1,43,610,620,'mid',25,0,'poison','canonical',B,SRC_BLOG,proj,status='poison',speed=8,life=82,duration=110),
      'specialDown':move('Ruée sur deux niveaux','melee',23,7,32,760,185,'low',23,0,'strike','anatomical',s['morph'],SRC_BLOG,low,travel=6),
      'specialForward':move('Bélier multi-oculaire','melee',16,5,38,980,145,'throw',24,0,'grapple','canonical',B,SRC_BLOG,'Esquiver le départ lisible ou interrompre avant l’impact.',travel=4),
      'specialBack':move('Repli du hangar','mobility',5,17,20,0,0,'mid',12,0,'movement','simulation',s['morph'],SRC_BLOG,'Suivre le recul : aucune invincibilité générale.',travel=-7),
      'super':move('Déchaînement des yeux exposés','melee',31,9,48,2250,245,'mid',0,50,'tentacle','canonical',B,SRC_BLOG,'Respecter l’amorce, reculer puis punir la longue récupération.',travel=3),
      'utility':move('Régénération du noyau oculaire','heal',48,1,26,0,0,'mid',22,0,'recovery','canonical',B,SRC_REGEN,'Interrompre avant l’activation ; seuls les dégâts récupérables sont soignés.',heal=420)}
    if uid=='re7-jack-baker-swamp-man': return {
      'light':move('Poing du Swamp Man','melee',7,3,13,330,88,'mid',0,0,'strike','canonical',B,SRC_SWAMP,close),
      'heavy':move('Marteau fongique du marais','melee',17,5,26,700,142,'mid',0,0,'strike','anatomical',s['morph'],SRC_SWAMP,close),
      'low':move('Fauchage du marais','melee',12,4,23,450,132,'low',0,0,'strike','anatomical',s['morph'],SRC_SWAMP,low),
      'throw':move('Saisie de Zoe','melee',9,3,34,820,84,'throw',0,0,'grapple','canonical',B,SRC_SWAMP,'Reculer ou déchoper ; la saisie ne touche pas hors de portée.'),
      'special':move('Tentacule vertical du bras droit','melee',19,5,28,690,172,'mid',19,0,'tentacle','canonical',B,SRC_SWAMP,'Déborder le côté du bras transformé et punir le retour.'),
      'specialDown':move('Fouet horizontal du bras droit','melee',22,6,31,730,190,'low',22,0,'tentacle','canonical',B,SRC_SWAMP,low),
      'specialForward':move('Charge du Swamp Man','melee',14,4,35,940,125,'throw',22,0,'grapple','canonical',B,SRC_SWAMP,'Sauter ou esquiver avant le contact ; punir la course ratée.',travel=4),
      'specialBack':move('Retour dans les roseaux','mobility',5,18,20,0,0,'mid',12,0,'movement','simulation',s['morph'],SRC_SWAMP,'Suivre le recul : la silhouette reste vulnérable.',travel=-7),
      'super':move('Poursuite de la quarantaine','melee',28,8,45,2180,226,'mid',0,50,'tentacle','canonical',B,SRC_SWAMP,'Bloquer le premier impact et sortir avant la seconde amplitude.',travel=4),
      'utility':move('Régénération extrême de Jack','heal',46,1,25,0,0,'mid',22,0,'recovery','canonical',B,SRC_REGEN,'Interrompre la reconstruction avant l’activation.',heal=430)}
    if uid=='re7-marguerite-baker-mutated': return {
      'light':move('Griffe allongée de la serre','melee',6,3,12,300,112,'mid',0,0,'strike','canonical',B,SRC_BLOG,close),
      'heavy':move('Frappe des membres démesurés','melee',15,6,25,670,165,'mid',0,0,'strike','anatomical',s['morph'],SRC_BLOG,close),
      'low':move('Balayage rampant sous les planches','melee',10,5,22,420,150,'low',0,0,'strike','canonical',B,SRC_BLOG,low,lowProfile=True),
      'throw':move('Saisie depuis la fenêtre','melee',8,3,31,780,92,'throw',0,0,'grapple','canonical',B,SRC_BLOG,'Rester mobile et déchoper dès le bond.'),
      'special':move('Essaim vomi de Marguerite','projectile',30,1,38,240,590,'mid',27,0,'swarm','canonical',B,SRC_BUG,proj,status='poison',count=3,speed=9,life=78,duration=90),
      'specialDown':move('Chute depuis le plafond','melee',20,6,29,720,156,'low',21,0,'strike','canonical',B,SRC_BLOG,'Se déplacer après l’escalade et punir l’atterrissage.',travel=5,launchSelf=-8),
      'specialForward':move('Ruée sur les murs de la serre','melee',13,4,33,900,122,'throw',22,0,'grapple','canonical',B,SRC_BLOG,'Interrompre la ruée avant le contact ou sauter.',travel=5),
      'specialBack':move('Retraite dans les chevrons','mobility',4,18,18,0,0,'mid',16,0,'movement','canonical',B,SRC_BLOG,'Anticiper son point de retour ; aucune invincibilité générale.',travel=-6,launchSelf=-7),
      'super':move('Serre transformée en nid','melee',27,9,44,2100,230,'mid',0,50,'swarm','canonical',B,SRC_BUG,'S’éloigner avant l’éclosion et punir la fin de séquence.',travel=3),
      'utility':move('Nid abdominal persistant','trap',28,1,34,450,96,'low',24,0,'poison','canonical',B,SRC_BUG,'Détruire ou contourner le nid avant son armement.',arm=34,duration=360,maxTraps=2,status='poison')}
    if uid=='re7-lucas-baker-mutated': return {
      'light':move('Griffe du bras gauche muté','melee',7,3,13,325,100,'mid',0,0,'strike','canonical',B,SRC_BLOG,close),
      'heavy':move('Masse du bras thoracique','melee',16,6,27,710,155,'mid',0,0,'strike','anatomical',s['morph'],SRC_BLOG,close),
      'low':move('Raclage fongique au sol','melee',12,4,23,445,140,'low',0,0,'strike','anatomical',s['morph'],SRC_BLOG,low),
      'throw':move('Étreinte sur le noyau','melee',9,3,34,810,86,'throw',0,0,'grapple','anatomical',s['morph'],SRC_BLOG,'Reculer ou déchoper avant la fermeture des bras.'),
      'special':move('Poussée de spores contaminantes','projectile',31,1,39,520,540,'mid',24,0,'poison','canonical',B,SRC_FILTER,proj,status='poison',speed=7,life=78,duration=105),
      'specialDown':move('Bond sur la machine centrale','melee',21,6,30,700,165,'low',22,0,'strike','canonical',B,SRC_BLOG,'Changer de côté pendant le bond et punir la retombée.',travel=6,launchSelf=-8),
      'specialForward':move('Estocade du laboratoire','melee',13,4,35,940,128,'throw',23,0,'grapple','canonical',B,SRC_BLOG,'Esquiver latéralement avant l’estocade puis viser la récupération.',travel=5),
      'specialBack':move('Repli derrière le réacteur','mobility',5,17,20,0,0,'mid',13,0,'movement','simulation',s['morph'],SRC_BLOG,'Rattraper le recul : Lucas reste vulnérable.',travel=-7),
      'super':move('Saturation toxique du laboratoire','projectile',34,1,48,760,650,'mid',0,50,'poison','canonical',B,SRC_FILTER,'Bloquer ou sortir de la ligne avant la saturation.',status='poison',count=3,speed=6,life=100,duration=120,spread=.12),
      'utility':move('Régénération du noyau thoracique','heal',47,1,25,0,0,'mid',22,0,'recovery','canonical',B,SRC_RAM,'Interrompre avant l’activation ; les RAMRODs constituent la limite canonique.',heal=390)}
    if uid=='re7-eveline-final': return {
      'light':move('Tentacule court de la façade','melee',8,4,15,340,124,'mid',0,0,'tentacle','canonical',B,SRC_BLOG,close),
      'heavy':move('Écrasement du visage colossal','melee',21,7,31,780,176,'mid',0,0,'strike','canonical',B,SRC_BLOG,'Reculer pendant la montée puis punir l’écrasement raté.'),
      'low':move('Racines de mutamycète','melee',14,5,25,470,165,'low',0,0,'tentacle','anatomical',s['morph'],SRC_EVE,low),
      'throw':move('Élévation d’Ethan','melee',11,4,36,850,96,'throw',0,0,'grapple','canonical',B,SRC_BLOG,'Reculer ou déchoper avant que la masse ne soulève la cible.'),
      'special':move('Fouet de tentacule terminal','melee',19,6,29,720,190,'mid',20,0,'tentacle','canonical',B,SRC_BLOG,'Passer sous l’amplitude ou bloquer puis punir.'),
      'specialDown':move('Éruption de moisissure au sol','melee',24,7,32,760,188,'low',23,0,'organic','anatomical',s['morph'],SRC_EVE,low),
      'specialForward':move('Assaut de la colonie E-001','melee',15,5,38,970,142,'throw',24,0,'grapple','canonical',B,SRC_BLOG,'Esquiver avant le contact et viser la récupération.',travel=4),
      'specialBack':move('Retrait dans le domaine','mobility',5,18,20,0,0,'mid',13,0,'movement','simulation',s['morph'],SRC_BLOG,'Suivre la masse : aucun retrait invulnérable.',travel=-7),
      'super':move('Effondrement du domaine Baker','melee',32,10,50,2300,255,'mid',0,50,'tentacle','canonical',B,SRC_BLOG,'Sortir de la portée avant la fermeture des tentacules.',travel=2),
      'utility':move('Densification de la colonie','heal',52,1,27,0,0,'mid',24,0,'recovery','anatomical',s['morph'],SRC_EVE,'Interrompre la densification avant l’activation.',heal=450)}
    if uid=='re7-fumer': return {
      'light':move('Griffe blanche WM-002','melee',7,3,13,315,88,'mid',0,0,'strike','canonical',B,SRC_FUMER,close),
      'heavy':move('Frappe de membrane blanche','melee',16,5,25,670,136,'mid',0,0,'strike','anatomical',s['morph'],SRC_FUMER,close),
      'low':move('Balayage du Fumer','melee',11,4,22,420,126,'low',0,0,'strike','anatomical',s['morph'],SRC_FUMER,low),
      'throw':move('Saisie du WM-002','melee',9,3,32,780,80,'throw',0,0,'grapple','canonical',B,SRC_FUMER,'Reculer, sauter ou déchoper pendant la fenêtre de prise.'),
      'special':move('Souffle de spores blanches','projectile',29,1,37,500,520,'mid',23,0,'poison','anatomical',s['morph'],SRC_FUMER,proj,status='poison',speed=7,life=74,duration=90),
      'specialDown':move('Traque basse du Fumer','melee',20,6,29,690,154,'low',21,0,'strike','canonical',B,SRC_FUMER,low,lowProfile=True),
      'specialForward':move('Charge régénérative WM-002','melee',13,4,34,900,120,'throw',22,0,'grapple','canonical',B,SRC_FUMER,'Sauter ou interrompre avant le contact.',travel=4),
      'specialBack':move('Reflux de la membrane','mobility',4,17,19,0,0,'mid',12,0,'movement','simulation',s['morph'],SRC_FUMER,'Suivre le recul ; aucune invincibilité.',travel=-6),
      'super':move('Surpression du WM-002','melee',27,8,44,2080,218,'mid',0,50,'strike','anatomical',s['morph'],SRC_FUMER,'Bloquer le premier impact et punir la fin de séquence.',travel=4),
      'utility':move('Régénération résistante WM-002','heal',45,1,24,0,0,'mid',20,0,'recovery','canonical',B,SRC_RAM,'Interrompre avant l’activation ; les munitions anti-régénération constituent la réponse canonique.',heal=360)}
    raise KeyError(uid)

roster=read('data/roster.json'); playable=read('data/playable.json'); portraits=read('data/catalog-portraits.json'); missing=read('data/missing-bosses.json'); chronicles=read('data/chronicles.json'); finishers=read('data/finishers-v053.json'); assets=read('data/asset-sources.json')
missing_map={x['id']:x for x in missing['entries']}; catalog_map={x['id']:x for x in portraits['catalog']}; roster_catalog={x['id']:x for x in roster['catalog']}
# Remove stale copies so the script is idempotent.
newids=set(specs)
roster['fighters']=[f for f in roster['fighters'] if f['uid'] not in newids]
playable=[f for f in playable if f.get('id') not in newids]
assets['fighters']=[f for f in assets['fighters'] if f.get('id') not in newids]
for uid in newids: chronicles['stories'].pop(uid,None); finishers['profiles'].pop(uid,None)

for uid,s in specs.items():
    meta=image_meta(s['sprite']); cat=copy.deepcopy(catalog_map[uid]);
    morphology=f"{s['name']}, dans son incarnation de {s['ep']}. {s['morph']}"
    visual_kind,h,w,facing,asym,body,morph_kind=s['visual']
    # Collision dimensions stay inside the validated CQC envelope even when the art is wider.
    w=min(w,280)
    visual={'kind':visual_kind,'height':h,'width':w,'drawHeight':h,'sourceFacing':facing,'asymmetric':asym,'fullBody':True,'primary':s['color'],'secondary':'#171715','accent':s['accent'],'skin':'#88776c','weapon':'none','body':body,'morphology':morph_kind,'spriteCrop':meta['spriteCrop']}
    fidelity={'status':'lore-audited','visualIncarnation':s['ep'],'rule':'Pouvoirs, organes et comportements propres à cette forme ; aucune capacité d’une autre phase ou d’un autre épisode n’est importée.','balanceBoundary':'Les attaques et limites biologiques suivent les références ; commandes, frames, dégâts, ressources et match-ups restent des adaptations originales du moteur 2D.'}
    resource={'kind':'energy','label':s['resource'][0],'max':100,'regen':s['resource'][1],'reload':0}
    passive={'id':'lore-'+uid,'name':s['passive'][0],'desc':s['passive'][1],'regenBudget':s['passive'][2]}
    authored=moves_for(uid,s)
    for slot,m in authored.items(): m['id']=uid+'::'+slot; m['slot']=slot
    fighter={'uid':uid,'id':uid,'name':s['name'],'ep':s['ep'],'source':'RE7','game':'resident-evil-7','role':s['role'],'archetype':s['archetype'],'power':s['power'],'speed':s['speed'],'reach':s['reach'],'color':s['color'],'accent':s['accent'],'visual':visual,'portrait':s['portrait'],'sprite':s['sprite'],'reference':s['sources'][0],'spriteSource':cat.get('sourcePage') or s['sources'][0],'assetNote':'Silhouette détourée et transparence alpha vérifiées pour l’intégration. Image statique de référence ; les animations de combat sont produites par le moteur et ne sont pas extraites des jeux.','bioAgent':s['bio'],'morphology':morphology,'canonicalAttacks':s['canonical'],'fidelity':fidelity,'boss':uid!='re7-fumer','combat':{'uid':uid,'key':'re_molded','role':s['role'],'resource':resource,'passive':passive,'moves':authored,'sources':s['sources'],'fidelity':fidelity,'canonicalAttacks':s['canonical'],'evidence':'lore-audited'}}
    roster['fighters'].append(fighter)
    p={'candidateId':uid,'sourcePage':cat.get('sourcePage') or s['sources'][0],'observedImageUrl':cat.get('observedImageUrl') or cat.get('imageUrl'),'downloadUrl':cat.get('imageUrl') or cat.get('observedImageUrl'),'context':'Sélection v0.3.0 : forme intégrale détourée pour la simulation de combat.','localPath':str(ROOT/s['sprite']),**{k:meta[k] for k in ['width','height','format','bytes','sha256','transparent','alphaBox']},'id':uid,'name':cat['name'],'game':cat['game'],'gameKey':'resident-evil-7','pathogen':s['bio'],'morphology':morphology,'sprite':s['sprite'],'portrait':s['portrait'],'assetUsage':'fullBody','fullBodyValidated':True,'validation':'Silhouette et transparence alpha contrôlées ; incarnation et phase séparées des autres formes.','visual':{'asymmetric':asym,'sourceFacing':facing,'morphology':morph_kind,'spriteCrop':meta['spriteCrop']},'referencePage':cat.get('sourcePage') or s['sources'][0],'canonicalAttacks':s['canonical'],'sources':s['sources'],'scopeNote':fidelity['balanceBoundary'],'bioAgent':s['bio'],'description':morphology,'spriteSource':cat.get('sourcePage') or s['sources'][0],'assetNote':fighter['assetNote']}
    playable.append(p); assets['fighters'].append(copy.deepcopy(p))
    # Promote existing catalog/missing dossier to playable/full-body.
    for target in (cat,catalog_map[uid],roster_catalog[uid],missing_map[uid]):
        target.update({'sprite':s['sprite'],'assetUsage':'fullBody','fullBodyValidated':True,'selected':True,'playable':True,'width':meta['width'],'height':meta['height'],'sha256':meta['sha256'],'transparent':meta['transparent'],'alphaBox':meta['alphaBox'],'bioAgent':s['bio'],'canonicalAttacks':s['canonical'],'sources':s['sources'],'description':morphology,'spriteSource':cat.get('sourcePage') or s['sources'][0],'assetNote':fighter['assetNote']})
    # Eight simulated containment trials, no claim of canonical crossovers.
    opponents=['re7-molded','re7-molded-fat','re7-mama-mold','re7-little-crawler','revillage-lycan','revillage-varcolac','revillage-sturm','revillage-mutated-miranda']
    route=[]
    fmap={f['uid']:f for f in roster['fighters']}
    for i,opp in enumerate(opponents):
        of=fmap[opp]; om=of['combat']['moves']['specialForward']
        route.append({'index':i,'opponent':opp,'stage':'baker_house','stageName':'PROPRIÉTÉ BAKER','label':['Ouverture du dossier','Stress initial','Contrôle de portée','Réponse biologique','Escalade du risque','Confinement avancé','Épreuve critique','Confinement terminal'][i],'before':f"Essai {i+1}/8 : {s['name']} face à {of['name']}, référence {of['ep']}. La PROPRIÉTÉ BAKER est isolée pour l’analyse.",'challenge':f"Observer {om['name']}. {om['counterplay']}",'after':f"Le profil {of['name']} est neutralisé dans la simulation. Les capteurs enregistrent les impacts et la dépense de {s['resource'][0]}." + (' Le protocole est complet.' if i==7 else ' Le confinement suivant est préparé.')})
    def cinematic_card(title,text,tile,camera='profile'):
        return {'title':title,'place':'PROPRIÉTÉ BAKER','prop':'none','camera':camera,
                'paragraphs':[text],'text':text,'stage':'baker_house','focus':uid,
                'visual':{'set':'re7','tile':tile,'environment':'PROPRIÉTÉ BAKER'}}
    intro=[
        cinematic_card('Ouverture du dossier',f"Le dossier {s['name']} est chargé depuis les archives de {s['ep']}. {morphology}",0,'wide'),
        cinematic_card('Protocole d’observation',f"La simulation confronte cette incarnation à huit profils adverses. Agent biologique : {s['bio']}. Les confrontations sont des essais fictifs et ne modifient pas la continuité de son épisode.",1),
        cinematic_card('Mise en confinement',f"Les portes se verrouillent dans la PROPRIÉTÉ BAKER. {authored['special']['name']} contrôle l’approche ; {authored['specialBack']['name']} offre une réponse défensive. Le premier essai peut commencer.",2)
    ]
    outro=[
        cinematic_card('Huit essais achevés',f"Les huit confrontations du dossier {s['name']} sont enregistrées. Le compte rendu et la relecture de ce parcours sont débloqués.",3,'wide'),
        cinematic_card('Rapport biologique',f"Profil observé : {s['role']}. L’essai a mobilisé {authored['special']['name']}, {authored['specialForward']['name']} et {authored['super']['name']}. Leur fonction suit cette incarnation ; commandes, timings et dégâts restent adaptés au moteur 2D.",4),
        cinematic_card('Dossier scellé',f"La projection de {s['name']} se dissipe. Le spécimen de référence appartient toujours à {s['ep']}. L’archive conserve les sources, les limites et le parcours complet.",5)
    ]
    chronicles['stories'][uid]={'uid':uid,'name':s['name'],'game':s['ep'],'group':'resident-evil-7','title':s['role'],'evidence':'lore-audited','status':'playable','edition':'v0.3.0','intro':intro,'outro':outro,'route':route,'continuity':'Confrontations fictives de données biologiques ; aucun crossover présenté comme un événement canonique.','anchor':morphology,'meta':fighter['assetNote'],'visualSet':'re7','narrativeVersion':'RE 0.3.0'}
    source_moves=[authored['super']['name'],authored['specialDown']['name'],authored['specialForward']['name'],authored['heavy']['name']]
    finish=[]
    slots=['neutral','down','forward','back']; p1=['O','↓ + O','AVANT + O','ARRIÈRE + O']; p2=['Y','S + Y','AVANT + Y','ARRIÈRE + Y']; cams=['close','wide','low','orbit']
    for i,n in enumerate(source_moves):
        finish.append({'id':f'{uid}::finisher{i+1}','index':i,'slot':slots[i],'commandP1':p1[i],'commandP2':p2[i],'name':n+' — Conclusion','family':s['family'],'tone':'stylized','duration':210+i*16,'camera':cams[i],'description':f"{s['name']} conclut le duel avec {n.lower()}. Séquence de simulation stylisée.",'loreBasis':morphology,'sourceMoves':[n],'phases':['approach','grapple','impact','fall'],'victimRule':'any','rating':'stylized','gore':False,'canonical':False,'evidence':'simulation'})
    finishers['profiles'][uid]={'uid':uid,'fighterName':s['name'],'episode':s['ep'],'source':'RE7','family':s['family'],'tone':'stylized','basis':morphology,'evidence':'simulation','finishers':finish,'color':s['color'],'accent':s['accent'],'visual':visual,'power':s['power'],'speed':s['speed'],'reach':s['reach']}

# Keep catalog ordering and source lists stable; append fighters in the authored order above.
portraits['catalog']=[catalog_map[x['id']] for x in portraits['catalog']]
roster['catalog']=[roster_catalog[x['id']] for x in roster['catalog']]
missing['entries']=[missing_map[x['id']] for x in missing['entries']]

# Update release-wide counts. Lore counts are finalized by build-lore-movesets.py / compile-content.py.
fc=len(roster['fighters']); finc=sum(len(p['finishers']) for p in finishers['profiles'].values())
base_counts={'fighters':fc,'stories':len(chronicles['stories']),'authored':len(chronicles['stories']),'structured':len(chronicles['stories']),'duels':len(chronicles['stories'])*8,'introPanels':len(chronicles['stories'])*3,'outroPanels':len(chronicles['stories'])*3,'paragraphs':len(chronicles['stories'])*6,'illustratedPortraits':fc,'paintedArenas':len(roster['stages']),'catalog':len(roster['catalog']),'finishers':finc,'loreProfiles':fc,'loreMoves':fc*len(SLOTS)}
roster['version']=VERSION; roster['counts'].update(base_counts)
chronicles['version']=VERSION; chronicles['sourceVersion']=VERSION; chronicles['fighters']=copy.deepcopy(roster['fighters']); chronicles['counts'].update(base_counts)
finishers['version']=VERSION; finishers['fighterCount']=fc; finishers['finisherCount']=finc; finishers['familyCounts']=dict(Counter(p['family'] for p in finishers['profiles'].values())); finishers['toneCounts']=dict(Counter(p['tone'] for p in finishers['profiles'].values()))
portraits['retrievedAt']='2026-10-11T00:00:00Z'
write('data/roster.json',roster); write('data/playable.json',playable); write('data/catalog-portraits.json',portraits); write('data/missing-bosses.json',missing); write('data/chronicles.json',chronicles); write('data/finishers-v053.json',finishers); write('data/asset-sources.json',assets)
print(json.dumps({'version':VERSION,'fighters':fc,'moves':fc*10,'finishers':finc,'new':list(specs)},ensure_ascii=False,indent=2))
