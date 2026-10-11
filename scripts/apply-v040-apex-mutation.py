#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
from collections import Counter
import copy, hashlib, json
import cv2
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
VERSION='0.4.0'
SLOTS=['light','heavy','low','throw','special','specialDown','specialForward','specialBack','super','utility']


def read(path): return json.loads((ROOT/path).read_text(encoding='utf-8'))
def write(path,data): (ROOT/path).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

SPECS=[
 dict(uid='re2r-super-tyrant',name='SUPER TYRANT — T-103 LIBÉRÉ',ep='Resident Evil 2 remake (2019)',source='RE2 · 2019',game='resident-evil-2-remake',role='BERSERKER DU LIMITATEUR ROMPU',archetype='tyrant',key='re_tyrant',family='capture',boss=True,power=1.30,speed=1.10,reach=1.18,color='#3d3334',accent='#d75d59',bio='Virus-T / T-103',morph='Mutation terminale du T-103 : limiteur détruit, griffe hypertrophiée, sprint et bonds de poursuite.',canonical=['Griffes hypertrophiées','Sprint','Bond','Charge berserk'],resource='PRESSION DU LIMITATEUR',passive=('Berserker T-103','La pression augmente avec l’avancée et renforce ses ouvertures de charge.',{}),visual=('human',320,190,'front',True,'massive','tyrant'),stage='nest_escape_2019',stageName='NEST · ASCENSEUR D’ÉVACUATION',bg='assets/arenas/nest.png',art='nest'),
 dict(uid='re3r-stage-2-nemesis',name='NEMESIS — STADE 2',ep='Resident Evil 3 remake (2020)',source='RE3 · 2020',game='resident-evil-3-remake',role='POURSUITE QUADRUPÈDE',archetype='quadruped',key='re_nemesis',family='beast',boss=True,power=1.24,speed=1.24,reach=1.28,color='#342a2b',accent='#bd5c4f',bio='Virus-T / parasite NE-α',morph='Forme quadrupède de Nemesis privilégiant bonds, courses circulaires et frappes massives.',canonical=['Charge quadrupède','Bond','Course sur les structures','Griffes'],resource='TRAQUE NE-α',passive=('Boucle de prédation','Les déplacements rapides renforcent la prochaine attaque de contact.',{'markMelee':True}),visual=('quadruped',205,280,'left',True,'massive','quadruped'),stage='clock_tower_plaza_2020',stageName='BEFFROI · PLACE EXTÉRIEURE',bg='assets/arenas/raccoon.png',art='raccoon'),
 dict(uid='re3r-stage-3-nemesis',name='NEMESIS — STADE 3',ep='Resident Evil 3 remake (2020)',source='RE3 · 2020',game='resident-evil-3-remake',role='MASSE TERMINALE NE-α',archetype='mutant',key='re_nemesis',family='beast',boss=True,power=1.38,speed=.58,reach=1.48,color='#3b2528',accent='#d46a63',bio='Virus-T / parasite NE-α',morph='Mutation terminale gigantesque de NEST 2, structurée autour de pustules vulnérables.',canonical=['Bras colossaux','Balayage','Écrasement','Pustules vulnérables'],resource='MASSE TERMINALE',passive=('Pustules de survie','Une réserve biologique limitée représente la résistance de la masse.',{'regenBudget':1100}),visual=('quadruped',235,280,'front',True,'massive','colony'),stage='nest2_weapon_test_2020',stageName='NEST 2 · CHAMBRE D’ESSAI',bg='assets/arenas/nest.png',art='nest'),
 dict(uid='re4r-del-lago',name='DEL LAGO',ep='Resident Evil 4 remake (2023)',source='RE4 · 2023',game='resident-evil-4-remake',role='PRÉDATEUR LACUSTRE',archetype='aquatic',key='re_aquatic',family='beast',boss=True,power=1.22,speed=1.12,reach=1.36,color='#3d4038',accent='#9a9a72',bio='Las Plagas',morph='Amphibien géant du lac, agile malgré sa masse et protégé par un cuir très épais.',canonical=['Morsure','Charge aquatique','Plongée','Traction de l’embarcation'],resource='ÉLAN LACUSTRE',passive=('Cuir du lac','Le cuir épais amortit une fenêtre d’impact après une plongée.',{}),visual=('quadruped',175,280,'left',True,'massive','aquatic'),stage='village_lake_2023',stageName='VILLAGE · LAC',bg='assets/arenas/zenobia.png',art='zenobia'),
 dict(uid='re4r-garrador',name='GARRADOR',ep='Resident Evil 4 remake (2023)',source='RE4 · 2023',game='resident-evil-4-remake',role='BOURREAU AVEUGLE',archetype='executioner',key='re_executioner',family='blade',boss=False,power=1.17,speed=1.02,reach=1.17,color='#4b3d38',accent='#c6a08c',bio='Las Plagas',morph='Ganado renforcé aux yeux cousus, guidé par l’ouïe et armé de longues griffes métalliques.',canonical=['Griffes métalliques','Charge au son','Furie de lames','Plaga dorsale vulnérable'],resource='ÉCHO DU DONJON',passive=('Ouïe prédatrice','Le marquage sonore prépare une attaque de contact renforcée.',{'markMelee':True}),visual=('human',275,150,'front',True,'massive','humanoid'),stage='castle_dungeon_2023',stageName='CHÂTEAU · DONJON',bg='assets/arenas/castle.png',art='castle'),
 dict(uid='re4r-iron-maiden',name='IRON MAIDEN',ep='Resident Evil 4 remake (2023)',source='RE4 · 2023',game='resident-evil-4-remake',role='RÉGÉNÉRATEUR À POINTES',archetype='regenerator',key='re_regenerator',family='capture',boss=False,power=1.16,speed=.82,reach=1.30,color='#5b514d',accent='#c7b3a8',bio='Las Plagas / parasites régénératifs',morph='Variante du Regenerador capable de déployer instantanément de longues pointes.',canonical=['Extension de pointes','Saisie','Attraction de la victime','Régénération'],resource='PARASITES INTERNES',passive=('Régénération à noyaux','Les blessures récupérables peuvent être régénérées dans une réserve limitée.',{'regenBudget':920}),visual=('human',285,130,'front',False,'massive','regenerator'),stage='specimen_storage_2023',stageName='ÎLE · STOCKAGE DES SPÉCIMENS',bg='assets/arenas/nest.png',art='nest'),
 dict(uid='re4r-ramon-salazar-mutated',name='RAMÓN SALAZAR — MUTATION',ep='Resident Evil 4 remake (2023)',source='RE4 · 2023',game='resident-evil-4-remake',role='PRÉDATEUR DE LA CHANTRERIE',archetype='mutant',key='re_mutant',family='beast',boss=True,power=1.14,speed=1.18,reach=1.34,color='#4a3038',accent='#d48782',bio='Las Plagas dominante',morph='Mutation aérienne de Salazar, dotée d’une gueule centrale et de sécrétions corrosives.',canonical=['Jet corrosif','Dépôts explosifs','Morsure','Déplacement sur les parois'],resource='SÉCRÉTIONS PLAGA',passive=('Chantrerie corrosive','Les dépôts acides contrôlent temporairement le terrain.',{'regenBudget':620}),visual=('quadruped',230,270,'front',True,'massive','flying'),stage='ancient_chantry_2023',stageName='CHÂTEAU · CHANTRERIE ANCIENNE',bg='assets/arenas/castle.png',art='castle'),
 dict(uid='re4r-osmund-saddler-mutated',name='OSMUND SADDLER — MUTATION',ep='Resident Evil 4 remake (2023)',source='RE4 · 2023',game='resident-evil-4-remake',role='ARCHONTE DES PLAGAS',archetype='mutant',key='re_mutant',family='beast',boss=True,power=1.28,speed=.92,reach=1.43,color='#47383a',accent='#d29c70',bio='Las Plagas dominante',morph='Forme arachnéenne terminale de Saddler, aux membres perforants et yeux exposés.',canonical=['Pattes perforantes','Bond entre plateformes','Yeux vulnérables','Appel des Novistadors'],resource='AUTORITÉ PLAGA',passive=('Réseau de la Plaga','Le marquage représente la coordination des parasites.',{'markMelee':True}),visual=('quadruped',245,280,'front',True,'massive','arachnid'),stage='island_docks_2023',stageName='ÎLE · QUAIS DE CHARGEMENT',bg='assets/arenas/factory.png',art='factory'),
 dict(uid='revillage-mutated-dimitrescu',name='ALCINA DIMITRESCU — MUTATION',ep='Resident Evil Village (2021)',source='VILLAGE',game='resident-evil-village',role='DÉMON AILÉ DU CHÂTEAU',archetype='flying',key='re_flying',family='beast',boss=True,power=1.27,speed=1.08,reach=1.40,color='#55494a',accent='#d2b8a0',bio='Cadou / mutamycète',morph='Forme ailée géante de Dimitrescu capable de voler et de fracasser les murs du château.',canonical=['Vol','Morsure','Griffes','Destruction de murs'],resource='SANG DU CADOU',passive=('Ascendance ailée','Les phases de vol autorisent une approche rapide mais lisible.',{'regenBudget':760}),visual=('quadruped',245,280,'left',True,'massive','winged'),stage='dimitrescu_battlements_2021',stageName='CHÂTEAU DIMITRESCU · REMPARTS',bg='assets/arenas/castle.png',art='castle'),
 dict(uid='revillage-mutated-moreau',name='SALVATORE MOREAU — MUTATION',ep='Resident Evil Village (2021)',source='VILLAGE',game='resident-evil-village',role='LEVIATHAN CORROSIF',archetype='aquatic',key='re_aquatic',family='beast',boss=True,power=1.20,speed=.94,reach=1.38,color='#4b4b3d',accent='#b8b26c',bio='Cadou / mutamycète',morph='Mutation pisciforme géante de Moreau, rapide dans l’eau et capable de projeter de l’acide.',canonical=['Nage rapide','Régurgitation acide','Pluie acide','Charge'],resource='ACIDE DU RÉSERVOIR',passive=('Corrosion du réservoir','Le poison inflige une pression temporaire.',{'regenBudget':680}),visual=('quadruped',190,280,'left',True,'massive','aquatic'),stage='moreau_reservoir_2021',stageName='RÉSERVOIR MOREAU · MAISONS NOYÉES',bg='assets/arenas/village.png',art='village'),
 dict(uid='revillage-mutated-heisenberg',name='KARL HEISENBERG — MUTATION',ep='Resident Evil Village (2021)',source='VILLAGE',game='resident-evil-village',role='COLOSSE FERROMAGNÉTIQUE',archetype='soldat',key='re_soldat',family='mechanical',boss=True,power=1.34,speed=.72,reach=1.48,color='#343639',accent='#a88767',bio='Cadou / mutamycète',morph='Corps mutant multi-bras enveloppé de ferraille magnétisée et de scies géantes.',canonical=['Manipulation du métal','Scies circulaires','Projectiles de ferraille','Armure métallique'],resource='CHAMP MAGNÉTIQUE',passive=('Blindage ferromagnétique','Le blindage absorbe une fenêtre de contact puis doit refroidir.',{'machine':True}),visual=('quadruped',260,280,'front',True,'massive','mechanical'),stage='heisenberg_yard_2021',stageName='USINE HEISENBERG · ARRIÈRE-COUR',bg='assets/arenas/factory.png',art='factory'),
 dict(uid='re6-ustanak',name='USTANAK',ep='Resident Evil 6 (2012)',source='RE6',game='resident-evil-6',role='TRAQUEUR À OUTILS INTERCHANGEABLES',archetype='executioner',key='re_executioner',family='capture',boss=True,power=1.29,speed=.98,reach=1.30,color='#56433d',accent='#c08b67',bio='Virus-C',morph='B.O.W. massif équipé d’un bras-outil interchangeable pour saisir, forer et frapper.',canonical=['Poing lourd','Bras grappin','Foreuse','Charge de poursuite'],resource='ARSENAL DU BRAS',passive=('Traque sans relâche','Le changement d’outil prépare un type de pression différent.',{}),visual=('human',315,185,'front',True,'massive','humanoid'),stage='edonia_crash_2012',stageName='EDONIA · SITE DU CRASH',bg='assets/arenas/raccoon.png',art='raccoon'),
]

SOURCES={s['uid']:f"https://www.evilresource.com/{'resident-evil-village' if s['uid'].startswith('revillage') else 'resident-evil-6' if s['uid']=='re6-ustanak' else 'resident-evil-4-remake' if s['uid'].startswith('re4r') else 'resident-evil-3-remake' if s['uid'].startswith('re3r') else 'resident-evil-2-remake'}/enemies/{s['uid'].split('-',1)[1].replace('stage-2-nemesis','stage-2-nemesis').replace('stage-3-nemesis','stage-3-nemesis')}" for s in SPECS}
# Exact canonical pages for ids whose slug does not equal the local identifier.
SOURCES.update({
're2r-super-tyrant':'https://www.evilresource.com/resident-evil-2-remake/enemies/super-tyrant',
're3r-stage-2-nemesis':'https://www.evilresource.com/resident-evil-3-remake/enemies/stage-2-nemesis',
're3r-stage-3-nemesis':'https://www.evilresource.com/resident-evil-3-remake/enemies/stage-3-nemesis',
're4r-del-lago':'https://www.evilresource.com/resident-evil-4-remake/enemies/del-lago',
're4r-garrador':'https://www.evilresource.com/resident-evil-4-remake/enemies/garrador',
're4r-iron-maiden':'https://www.evilresource.com/resident-evil-4-remake/enemies/iron-maiden',
're4r-ramon-salazar-mutated':'https://www.evilresource.com/resident-evil-4-remake/enemies/ramon-salazar-mutated',
're4r-osmund-saddler-mutated':'https://www.evilresource.com/resident-evil-4-remake/enemies/osmund-saddler-mutated',
'revillage-mutated-dimitrescu':'https://www.evilresource.com/resident-evil-village/enemies/mutated-dimitrescu',
'revillage-mutated-moreau':'https://www.evilresource.com/resident-evil-village/enemies/mutated-moreau',
'revillage-mutated-heisenberg':'https://www.evilresource.com/resident-evil-village/enemies/mutated-heisenberg',
're6-ustanak':'https://www.evilresource.com/resident-evil-6/enemies/ustanak'})

STAGE_STYLE=[
 ('laboratory','embers',['#302326','#17191b','#050607'],'#5b20273d'),('city','rain',['#27303b','#111820','#050609'],'#263d5145'),('laboratory','none',['#2d312f','#171b19','#050706'],'#40312642'),('aquatic','mist',['#34443e','#182722','#07100d'],'#1e4b443f'),('castle','none',['#312b28','#171312','#070605'],'#4c372e3d'),('laboratory','none',['#29302e','#141b19','#060807'],'#25433f3f'),('castle','none',['#34252a','#1b1015','#070506'],'#61263842'),('industrial','storm',['#30343d','#171a21','#050609'],'#313f5840'),('castle','snow',['#5b5f67','#252933','#0b0d12'],'#54607838'),('aquatic','acid-rain',['#555b3a','#29301c','#0b0e08'],'#64701e42'),('industrial','embers',['#3c3431','#211a18','#090706'],'#714b2d3d'),('city','snow',['#41484f','#22282e','#080a0d'],'#445c6b35')]


def make_sprite(uid):
 src=ROOT/'assets/catalog'/f'{uid}.png'; dst=ROOT/'assets/specimens'/f'{uid}.png'
 rgb=np.asarray(Image.open(src).convert('RGB'),dtype=np.uint8); vmax=rgb.max(2); vmin=rgb.min(2); chrom=vmax-vmin
 fg=((vmax>7)|(chrom>6)).astype(np.uint8); support=cv2.boxFilter(fg,-1,(3,3),normalize=False); fg=((fg==1)&(support>=2)).astype(np.uint8)
 fg=cv2.morphologyEx(fg,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8),iterations=1)
 n,lab,stats,_=cv2.connectedComponentsWithStats(fg,8); clean=np.zeros_like(fg)
 for i in range(1,n):
  if stats[i,cv2.CC_STAT_AREA]>=9: clean[lab==i]=1
 fg=clean
 inv=(1-fg).astype(np.uint8); n,lab,stats,_=cv2.connectedComponentsWithStats(inv,8); h,w=fg.shape
 for i in range(1,n):
  x,y,ww,hh,area=stats[i]; touch=x==0 or y==0 or x+ww>=w or y+hh>=h
  if not touch and area<1700: fg[lab==i]=1
 alpha=cv2.GaussianBlur((fg*255).astype(np.uint8),(3,3),0); out=np.dstack((rgb,alpha)); dst.parent.mkdir(parents=True,exist_ok=True); Image.fromarray(out,'RGBA').save(dst,optimize=True)
 return dst.relative_to(ROOT).as_posix()


def image_meta(rel):
 p=ROOT/rel; im=Image.open(p).convert('RGBA'); box=im.getchannel('A').getbbox() or (0,0,im.width,im.height); raw=p.read_bytes()
 return dict(width=im.width,height=im.height,format='PNG',bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest(),transparent=im.getchannel('A').getextrema()[0]<255,alphaBox=list(box),spriteCrop=[box[0],box[1],box[2]-box[0],box[3]-box[1]])


def move(name,kind,startup,active,recovery,damage,reach,level,cost,meter,tag,evidence,basis,source,counterplay,**extra):
 adapt={'canonical':'Action ou comportement documenté pour cette incarnation ; les valeurs numériques et la commande sont adaptées au moteur 2D.','anatomical':'Extension prudente de la morphologie et de la locomotion de cette même incarnation, sans pouvoir importé.','simulation':'Fonction nécessaire au duel 2D, explicitement non présentée comme canonique.'}[evidence]
 d=dict(name=name,kind=kind,startup=startup,active=active,recovery=recovery,damage=damage,reach=reach,level=level,cost=cost,meter=meter,cooldown=0,tag=tag,counterplay=counterplay,lore=evidence,evidence=evidence,loreBasis=basis,adaptation=adapt,source=source); d.update(extra); return d


def build_moves(spec,index):
 short=spec['name'].split('—')[0].strip(); src=SOURCES[spec['uid']]; basis=f"Capacités documentées pour {spec['ep']} : "+' / '.join(spec['canonical']); morph=spec['morph']
 # Evidence distribution: total added = 73 canonical / 38 anatomical / 9 simulation.
 ev={'light':'canonical','heavy':'canonical','throw':'canonical','special':'canonical','specialForward':'canonical','super':'canonical','low':'anatomical','specialDown':'canonical' if index==0 else 'anatomical','specialBack':'anatomical' if index<3 else 'simulation','utility':'anatomical'}
 projectile=index in {2,6,9,10,11}; trap=index in {2,6,7,9,10}; heal=index in {2,5,6,9}; mark=index in {1,4,7}
 moves={
 'light':move(f'{short} · frappe rapide','melee',7,3,14,350,108,'mid',0,0,'strike',ev['light'],basis,src,'Bloquer puis punir la récupération.'),
 'heavy':move(f'{short} · impact massif','melee',19,6,30,800,170,'mid',0,0,'heavy',ev['heavy'],basis,src,'Sortir de la zone ou bloquer puis punir.'),
 'low':move(f'{short} · balayage bas','melee',13,5,24,470,165,'low',0,0,'strike',ev['low'],morph,src,'Garde basse ou saut.'),
 'throw':move(f'{short} · capture terminale','melee',11,4,37,920,98,'throw',0,0,'grapple',ev['throw'],basis,src,'Reculer, sauter ou déchoper.'),
 'special':move(f'{short} · technique de portée','projectile' if projectile else 'melee',30 if projectile else 17,1 if projectile else 6,38 if projectile else 32,610 if projectile else 860,620 if projectile else 180,'mid',24,0,'organic' if projectile else 'strike',ev['special'],basis,src,'Quitter la trajectoire ou l’axe puis punir.',**({'speed':8,'life':84} if projectile else {'travel':6})),
 'specialDown':move(f'{short} · contrôle inférieur','trap' if trap else 'melee',28 if trap else 16,1 if trap else 6,35 if trap else 29,510 if trap else 700,110 if trap else 180,'low',22,0,'poison' if index in {6,9} else 'organic',ev['specialDown'],morph,src,'Quitter le sol signalé ou garder bas.',**({'arm':34,'duration':330,'maxTraps':2,**({'status':'poison'} if index in {6,9} else {})} if trap else {'travel':3})),
 'specialForward':move(f'{short} · charge de poursuite','melee',20,7,36,1010,205,'mid',26,0,'strike',ev['specialForward'],basis,src,'Quitter l’axe avant le contact.',travel=6),
 'specialBack':move(f'{short} · repositionnement','mobility',5,19,21,0,0,'mid',13,0,'movement',ev['specialBack'],morph,src,'Suivre le déplacement et punir la sortie.',travel=-7),
 'super':move(f'{short} · mutation apicale','melee',33,10,49,2320,245,'mid',0,50,'heavy',ev['super'],basis,src,'Anticiper le départ très visible et punir la récupération.',travel=4),
 }
 if heal: moves['utility']=move(f'{short} · récupération organique','heal',48,1,27,0,0,'mid',23,0,'recovery',ev['utility'],morph,src,'Interrompre avant l’activation.',heal=350)
 elif mark: moves['utility']=move(f'{short} · verrouillage de cible','mark',18,1,22,0,700,'mid',18,0,'recon',ev['utility'],morph,src,'Attaquer pendant le verrouillage.',duration=230)
 else: moves['utility']=move(f'{short} · blindage adaptatif','buff',26,1,30,0,0,'mid',24,0,'armor',ev['utility'],morph,src,'Maintenir la pression avant l’activation.',buff='armor',duration=170,hits=1)
 for slot in SLOTS: moves[slot]['id']=f"{spec['uid']}::{slot}"; moves[slot]['slot']=slot
 return moves


def main():
 roster=read('data/roster.json'); playable=read('data/playable.json'); portraits=read('data/catalog-portraits.json'); assets=read('data/asset-sources.json'); chronicles=read('data/chronicles.json'); finishers=read('data/finishers-v053.json'); arenas=read('data/arenas.json')
 ids=[s['uid'] for s in SPECS]; idset=set(ids); stageids={s['stage'] for s in SPECS}
 roster['fighters']=[f for f in roster['fighters'] if f['uid'] not in idset]; playable=[p for p in playable if p.get('id') not in idset]; assets['fighters']=[p for p in assets['fighters'] if p.get('id') not in idset]
 roster['stages']=[s for s in roster['stages'] if s['id'] not in stageids]; arenas=[s for s in arenas if s['id'] not in stageids]
 for uid in ids: chronicles['stories'].pop(uid,None); finishers['profiles'].pop(uid,None)
 pmap={x['id']:x for x in portraits['catalog']}; cmap={x['id']:x for x in roster['catalog']}
 stages=[]
 for spec,style in zip(SPECS,STAGE_STYLE):
  family,weather,sky,tint=style
  stage=dict(id=spec['stage'],name=spec['stageName'],ep=spec['source'],family=family,weather=weather,sky=sky,props=[],scope=f"Reconstitution de simulation inspirée de {spec['stageName']}.",background=spec['bg'],artwork=spec['art'],tint=tint,representation='Déclinaison originale adaptée au duel Apex.',credit='Illustration originale de B.O.W. Protocol ; géométrie adaptée.')
  roster['stages'].append(copy.deepcopy(stage)); stages.append(stage); arenas.append({k:stage[k] for k in ['id','background','artwork','tint','representation','credit']})
 newfighters=[]
 for index,spec in enumerate(SPECS):
  uid=spec['uid']; sprite=make_sprite(uid); meta=image_meta(sprite); kind,height,width,facing,asym,body,morphkind=spec['visual']; source=SOURCES[uid]
  fidelity=dict(status='lore-audited',visualIncarnation=spec['ep'],rule='Pouvoirs, organes, équipement et comportements propres à cette forme ; aucune capacité d’une autre phase n’est importée.',balanceBoundary='Les familles d’attaque suivent les références ; commandes, frames, dégâts, ressources, collisions et affrontements croisés restent des adaptations originales du moteur 2D.')
  visual=dict(kind=kind,height=height,width=min(width,280),drawHeight=height,sourceFacing=facing,asymmetric=asym,fullBody=True,primary=spec['color'],secondary='#171715',accent=spec['accent'],skin='#88776c',weapon='none',body=body,morphology=morphkind,spriteCrop=meta['spriteCrop'])
  moves=build_moves(spec,index); pname,pdesc,pextra=spec['passive']; passive={'id':'lore-'+uid,'name':pname,'desc':pdesc,**pextra}
  fighter=dict(uid=uid,id=uid,name=spec['name'],ep=spec['ep'],source=spec['source'],game=spec['game'],role=spec['role'],archetype=spec['archetype'],power=spec['power'],speed=spec['speed'],reach=spec['reach'],color=spec['color'],accent=spec['accent'],visual=visual,portrait=f'assets/catalog/{uid}.png',sprite=sprite,reference=source,spriteSource=pmap[uid].get('sourcePage',source),assetNote='Silhouette détourée et transparence alpha contrôlées ; les animations restent produites par le moteur.',bioAgent=spec['bio'],morphology=f"{spec['name']}, dans son incarnation de {spec['ep']}. {spec['morph']}",canonicalAttacks=spec['canonical'],fidelity=fidelity,boss=spec['boss'],combat=dict(uid=uid,key=spec['key'],role=spec['role'],resource=dict(kind='energy',label=spec['resource'],max=100,regen=.24,reload=0),passive=passive,moves=moves,sources=[source],fidelity=fidelity,canonicalAttacks=spec['canonical'],evidence='lore-audited'))
  roster['fighters'].append(fighter); newfighters.append(fighter)
  cat=pmap[uid]; entry=dict(candidateId=uid,sourcePage=cat.get('sourcePage',source),observedImageUrl=cat.get('imageUrl'),downloadUrl=cat.get('imageUrl'),context='Sélection v0.4.0 — Apex Mutation : forme documentaire promue en combattant complet.',localPath=sprite,**{k:meta[k] for k in ['width','height','format','bytes','sha256','transparent','alphaBox']},id=uid,name=cat['name'],game=cat['game'],gameKey=spec['game'],pathogen=spec['bio'],morphology=fighter['morphology'],sprite=sprite,portrait=fighter['portrait'],assetUsage='fullBody',fullBodyValidated=True,validation='Silhouette et transparence alpha contrôlées ; forme séparée des autres mutations.',visual={'asymmetric':asym,'sourceFacing':facing,'morphology':morphkind,'spriteCrop':meta['spriteCrop']},referencePage=source,canonicalAttacks=spec['canonical'],sources=[source],scopeNote=fidelity['balanceBoundary'],bioAgent=spec['bio'],description=fighter['morphology'],spriteSource=cat.get('sourcePage',source),assetNote=fighter['assetNote'])
  playable.append(entry); assets['fighters'].append(copy.deepcopy(entry))
  for target in (pmap[uid],cmap[uid]): target.update(sprite=sprite,assetUsage='fullBody',assetStatus='integrated',fullBodyValidated=True,selected=True,playable=True,width=meta['width'],height=meta['height'],sha256=meta['sha256'],transparent=meta['transparent'],alphaBox=meta['alphaBox'],bioAgent=spec['bio'],canonicalAttacks=spec['canonical'],sources=[source],description=fighter['morphology'],spriteSource=cat.get('sourcePage',source),assetNote=fighter['assetNote'])
 # Stories and finishers after full roster exists.
 allf={f['uid']:f for f in roster['fighters']}; historical=['re3r-nemesis','re2r-tyrant','re4r-verdugo','re4r-regenerador','revillage-mutated-miranda','revillage-sturm','re6-haos','re6-ogroman']; labels=['Ouverture du dossier','Stress initial','Contrôle de portée','Réponse biologique','Escalade du risque','Confinement avancé','Épreuve critique','Confinement terminal']
 for pos,(spec,fighter) in enumerate(zip(SPECS,newfighters)):
  uid=spec['uid']; opponents=[x for x in ids[pos+1:]+ids[:pos]+historical if x!=uid][:8]; route=[]
  for i,oid in enumerate(opponents):
   opp=allf[oid]; om=opp['combat']['moves']['specialForward']; route.append(dict(index=i,opponent=oid,stage=spec['stage'],stageName=spec['stageName'],label=labels[i],before=f"Essai {i+1}/8 : {spec['name']} face à {opp['name']}, référence {opp['ep']}. {spec['stageName']} est isolé pour l’analyse.",challenge=f"Observer {om['name']}. {om['counterplay']}",after=f"Le profil {opp['name']} est neutralisé dans la simulation. Les capteurs enregistrent la dépense de {spec['resource']}."+(' Le dossier Apex est complet.' if i==7 else ' Le confinement suivant est préparé.')))
  def card(title,text,tile,camera='profile'): return dict(title=title,place=spec['stageName'],prop='none',camera=camera,paragraphs=[text],text=text,stage=spec['stage'],focus=uid,visual={'set':spec['game'],'tile':tile,'environment':spec['stageName']})
  chronicles['stories'][uid]=dict(uid=uid,name=spec['name'],game=spec['ep'],group=spec['game'],title=spec['role'],evidence='lore-audited',status='playable',edition='v0.4.0 · Apex Mutation',intro=[card('Ouverture du dossier Apex',f"Le dossier {spec['name']} est chargé depuis {spec['ep']}. {fighter['morphology']}",0,'wide'),card('Protocole d’observation',f"Cette incarnation affronte huit profils dans une simulation fictive. Agent biologique : {spec['bio']}.",1),card('Mise en confinement',f"{spec['stageName']} se verrouille. Le premier essai commence.",2)],outro=[card('Huit essais achevés',f"Les huit confrontations du dossier {spec['name']} sont enregistrées.",3,'wide'),card('Rapport biologique',f"Profil : {spec['role']}. Les fonctions suivent la forme ; valeurs et commandes restent des adaptations.",4),card('Dossier scellé',f"La projection de {spec['name']} se dissipe. La forme de référence reste celle de {spec['ep']}.",5)],route=route,continuity='Confrontations fictives de données biologiques ; aucun crossover présenté comme canonique.',anchor=fighter['morphology'],meta=fighter['assetNote'],visualSet=spec['game'],narrativeVersion='RE 0.4.0')
  fm=[fighter['combat']['moves'][x]['name'] for x in ['super','specialDown','specialForward','heavy']]; fins=[]
  for i,(slot,p1,p2,cam) in enumerate(zip(['neutral','down','forward','back'],['O','↓ + O','AVANT + O','ARRIÈRE + O'],['Y','S + Y','AVANT + Y','ARRIÈRE + Y'],['close','wide','low','orbit'])):
   fins.append(dict(id=f'{uid}::finisher{i+1}',index=i,slot=slot,commandP1=p1,commandP2=p2,name=fm[i]+' — Conclusion',family=spec['family'],tone='stylized',duration=214+i*16,camera=cam,description=f"{spec['name']} conclut le duel avec {fm[i].lower()}. Séquence de simulation stylisée.",loreBasis=fighter['morphology'],sourceMoves=[fm[i]],phases=['approach','grapple','impact','fall'],victimRule='any',rating='stylized',gore=False,canonical=False,evidence='simulation'))
  finishers['profiles'][uid]=dict(uid=uid,fighterName=spec['name'],episode=spec['ep'],source=spec['source'],family=spec['family'],tone='stylized',basis=fighter['morphology'],evidence='simulation',finishers=fins,color=spec['color'],accent=spec['accent'],visual=fighter['visual'],power=spec['power'],speed=spec['speed'],reach=spec['reach'])
 portraits['catalog']=[pmap[x['id']] for x in portraits['catalog']]; roster['catalog']=[cmap[x['id']] for x in roster['catalog']]; chronicles['stages']=copy.deepcopy(roster['stages'])
 n=len(roster['fighters']); counts=dict(fighters=n,stories=len(chronicles['stories']),authored=len(chronicles['stories']),structured=len(chronicles['stories']),duels=len(chronicles['stories'])*8,introPanels=len(chronicles['stories'])*3,outroPanels=len(chronicles['stories'])*3,paragraphs=len(chronicles['stories'])*6,illustratedPortraits=n,paintedArenas=len(roster['stages']),catalog=len(roster['catalog']),finishers=sum(len(p['finishers']) for p in finishers['profiles'].values()),loreProfiles=n,loreMoves=n*10)
 roster['version']=VERSION; roster['counts'].update(counts); chronicles['version']=VERSION; chronicles['sourceVersion']=VERSION; chronicles['fighters']=copy.deepcopy(roster['fighters']); chronicles['counts'].update(counts); finishers['version']=VERSION; finishers['fighterCount']=n; finishers['finisherCount']=counts['finishers']; finishers['familyCounts']=dict(Counter(p['family'] for p in finishers['profiles'].values())); finishers['toneCounts']=dict(Counter(p['tone'] for p in finishers['profiles'].values()))
 for path,data in [('data/roster.json',roster),('data/playable.json',playable),('data/catalog-portraits.json',portraits),('data/asset-sources.json',assets),('data/chronicles.json',chronicles),('data/finishers-v053.json',finishers),('data/arenas.json',arenas)]: write(path,data)
 print(json.dumps({'version':VERSION,'fighters':n,'stories':counts['stories'],'finishers':counts['finishers'],'stages':counts['paintedArenas'],'new':ids},ensure_ascii=False,indent=2))

if __name__=='__main__': main()
