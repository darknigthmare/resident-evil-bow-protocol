#!/usr/bin/env python3
"""Idempotent RE5 content migration. Never invent missing image pixels or import remote files."""
from pathlib import Path
from collections import Counter
import copy, json, re
R=Path(__file__).resolve().parents[1]
VERSION='0.6.0'
SLOTS=['light','heavy','low','throw','special','specialDown','specialForward','specialBack','super','utility']
BASE='https://www.evilresource.com/resident-evil-5/'
BOUNDARY='Noms de commandes, valeurs, jauges et duels sont une adaptation Versus. Les poses de référence ne sont pas des animations 1:1. Les géants sont ramenés à une enveloppe de collision jouable.'
def load(p):return json.loads((R/p).read_text(encoding='utf8'))
def write(p,v):
 q=R/p;q.parent.mkdir(parents=True,exist_ok=True);q.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def text(p,s):(R/p).write_text(s,encoding='utf8')
SPECS=[
['adjule','ADJULE','PRÉDATEUR CANIN PLAGA','Las Plagas',[104,156],1.18,'INSTINCT CANIN','DÉPÔT · CONTENEURS','depot','Chien parasité, rapide au sol ; morsure et ouverture de la tête autour du parasite.',
 ['Morsure d’Adjule','Gueule parasitée','Attaque des chevilles','Saisie canine','Bond de prédation','Morsure rasante','Course du chenil','Recul animal','Assaut de la gueule','Repérage de proie'],[0,1,4,6],
 {'special':{'launchSelf':-8,'travel':5.2},'specialDown':{'level':'low','lowProfile':True},'specialForward':{'travel':7,'reach':115},'specialBack':{'kind':'mobility','travel':-5,'damage':0},'utility':{'kind':'mark','reach':470,'duration':130}}],
['big-man-majini','BIG MAN MAJINI','COLOSSE DE CONTACT','Las Plagas',[250,164],.81,'EFFORT MUSCULAIRE','PORT · ENTREPOSAGE','depot','Majini massif, spécialiste des coups et de l’écrasement ; aucun projectile biologique.',
 ['Poing du colosse','Marteau des deux bras','Balayage massif','Étreinte écrasante','Crochet de démolition','Écrasement au sol','Percussion d’épaule','Ancrage défensif','Pilon du port','Reprise d’appui'],[0,1,3],
 {'special':{'damage':890,'reach':145},'specialDown':{'level':'low','damage':760},'specialForward':{'travel':4.2},'specialBack':{'kind':'buff','buff':'armor','hits':1,'duration':80,'damage':0},'utility':{'kind':'recover','restore':30}}],
['chainsaw-majini','CHAINSAW MAJINI','MENACE À TRONÇONNEUSE','Las Plagas',[245,122],.9,'TEMPÉRATURE DU MOTEUR','BIDONVILLE · GRILLE','settlement','Majini encagoulé armé d’une tronçonneuse ; moteur et portée de lame, sans pouvoir à distance.',
 ['Coup de carter','Coupe verticale','Fauchage de chaîne','Capture à la scie','Sciage frontal','Lame au ras du sol','Avancée motorisée','Retrait de lame','Coupe de rupture','Refroidissement moteur'],[1,4,6],
 {'special':{'tag':'blade','damage':1070,'startup':29},'specialDown':{'tag':'blade','level':'low'},'specialForward':{'travel':4.5,'tag':'blade'},'specialBack':{'kind':'mobility','travel':-4,'damage':0},'super':{'tag':'blade','damage':1890},'utility':{'kind':'recover','restore':42}}],
['executioner','EXECUTIONER MAJINI','BOURREAU À HACHE','Las Plagas',[302,184],.78,'INERTIE DE LA HACHE','KIJUJU · PLACE PUBLIQUE','settlement','Bourreau du chapitre 1-1 ; grande hache de fortune. Variante noire sans hache enflammée.',
 ['Revers du manche','Abattage de la hache','Fauchage du bourreau','Poigne du condamné','Grand arc de hache','Lame de guillotine','Percée du portail','Rappel du manche','Sentence de la place','Réarmement de la hache'],[1,4,6],
 {'heavy':{'tag':'blade','reach':192},'special':{'tag':'blade','reach':280,'startup':34,'damage':1220},'specialDown':{'tag':'blade','level':'low','reach':205},'specialForward':{'tag':'blade','travel':3.5},'specialBack':{'kind':'melee','reach':125,'damage':380},'super':{'tag':'blade','reach':310},'utility':{'kind':'recover','restore':35}}],
['gatling-gun-majini','GATLING GUN MAJINI','SUPPRESSION BALISTIQUE','Las Plagas',[260,174],.77,'BANDE DE MUNITIONS','NAVIRE · CALES','ship','Majini à mitrailleuse rotative ; le conteneur dorsal est un équipement, pas une carapace biologique.',
 ['Coup de poignée','Revers de mitrailleuse','Balayage du pied','Poigne de l’artilleur','Rafale rotative','Balayage de tir bas','Tir de couverture','Repli de l’artilleur','Saturation du pont','Alimentation de bande'],[4,6],
 {'special':{'kind':'projectile','tag':'ballistic','count':6,'interval':5,'recovery':65,'cooldown':145,'damage':160,'cost':18,'speed':17,'life':65,'reach':900,'height':148},'specialDown':{'kind':'projectile','tag':'ballistic','count':4,'interval':6,'damage':150,'height':62,'cost':14},'specialForward':{'kind':'projectile','tag':'ballistic','count':3,'interval':5,'damage':210,'cost':12},'specialBack':{'kind':'mobility','travel':-3.6,'damage':0},'super':{'kind':'projectile','tag':'ballistic','count':10,'interval':4,'damage':210,'cost':28},'utility':{'kind':'reload'}}],
['jill-valentine-enemy','JILL VALENTINE — SOUS P30','ACROBATIE SOUS CONTRÔLE','P30 — composé chimique, pas une Plaga',[223,88],1.2,'CHARGEURS DES MITRAILLETTES','RUINES · SALLE MONARQUE','ruins','Jill sous administration continue de P30 : capacités physiques augmentées et équipement humain ; aucune mutation Uroboros.',
 ['Frappe rapprochée','Coup de pied retourné','Balayage acrobatique','Projection de neutralisation','Rafale des mitraillettes','Glissade de combat','Bond offensif','Écart acrobatique','Enchaînement sous P30','Changement des chargeurs'],[1,4],
 {'special':{'kind':'projectile','tag':'ballistic','count':4,'interval':4,'damage':185,'speed':19,'cost':12,'height':138,'reach':820},'specialDown':{'kind':'melee','level':'low','lowProfile':True,'travel':4},'specialForward':{'launchSelf':-9,'travel':4.6},'specialBack':{'kind':'mobility','launchSelf':-7,'travel':-4,'damage':0},'super':{'kind':'melee','travel':6,'damage':1570},'utility':{'kind':'reload'}}],
['licker-beta','LICKER β','PRÉDATEUR À LANGUE','Virus-T / développement de Tricell',[128,200],1.1,'TENSION LINGUALE','LABORATOIRE · CORRIDOR','lab','Licker amélioré par Tricell : griffes, langue allongée, corps dépourvu de peau ; ne pas lui attribuer une Plaga.',
 ['Griffe de Licker β','Double lacération','Griffe rampante','Enserrement lingual','Fouet de langue','Langue au sol','Bond du laboratoire','Recul quadrupède','Empalement lingual','Repérage acoustique'],[0,3,4],
 {'special':{'kind':'melee','tag':'tentacle','reach':300,'startup':23,'damage':830},'specialDown':{'tag':'tentacle','reach':275,'level':'low'},'specialForward':{'launchSelf':-9,'travel':5},'specialBack':{'kind':'mobility','travel':-5,'damage':0},'super':{'tag':'tentacle','reach':340},'utility':{'kind':'mark','reach':500,'duration':160}}],
['reaper','REAPER','CARAPACE ET FAUX','Mutation associée à des traces d’Uroboros',[275,158],.87,'RÉSERVE CAUSTIQUE','MISSILES · CONVOYEURS','lab','Insecte mutant aux appendices coupants et sécrétion aveuglante. Le gaz est un trouble visuel, pas un poison mortel confirmé.',
 ['Faux latérale','Double perforation','Faux basse','Capture perforante','Sécrétion aveuglante','Croisement des faux','Marche perforante','Fermeture de carapace','Étreinte du Reaper','Reconstitution de réserve'],[0,3,4],
 {'special':{'kind':'projectile','tag':'bio','status':'slow','duration':95,'damage':240,'speed':7,'life':55,'reach':430},'specialDown':{'tag':'blade','reach':165},'specialForward':{'tag':'blade','travel':3.2},'specialBack':{'kind':'buff','buff':'armor','duration':85,'hits':1,'damage':0},'super':{'level':'throw','tag':'grapple','reach':112,'damage':2150,'exposeSelf':150},'utility':{'kind':'recover','restore':28}}],
['popokarimu','POPOKARIMU','CHASSE SOL / AIR','Las Plagas',[215,266],.95,'SÉCRÉTION ADHÉSIVE','MINE · PLATEAU','quarry','Chauve-souris infectée avec queue parasitaire blindée ; substance collante et talons. Son point faible se trouve sous la queue.',
 ['Serres du plateau','Percussion corporelle','Balayage de la queue','Capture des talons','Sécrétion adhésive','Queue blindée','Piqué de chasse','Recul aérien','Assaut du Popokarimu','Reprise des sécrétions'],[0,1,4,6],
 {'special':{'kind':'projectile','tag':'bio','status':'slow','duration':130,'damage':330,'speed':10,'reach':650},'specialDown':{'reach':230,'level':'low'},'specialForward':{'launchSelf':-10,'travel':5.4,'damage':940,'exposeSelf':100},'specialBack':{'kind':'mobility','launchSelf':-9,'travel':-4.8,'damage':0},'super':{'launchSelf':-8,'travel':5,'damage':1650,'exposeSelf':140},'utility':{'kind':'recover','restore':32}}],
['ndesu','NDESU','COLOSSE À CINQ PLAGAS','Las Plagas — cinq parasites',[350,235],.76,'EFFORT DU COLOSSE','PORT · APRÈS LA POURSUITE','settlement','Géant à cinq Plagas ; force permettant de manier les débris du décor. Les débris ne sont pas des projectiles produits par son organisme.',
 ['Poing de Ndesu','Double marteau','Piétinement du port','Poigne du géant','Projection de gravats','Pied d’écrasement','Charge du colosse','Posture de résistance','Poteau arraché','Reprise du souffle colossal'],[0,2,4,8],
 {'special':{'kind':'projectile','tag':'debris','speed':10,'vy':-2,'gravity':.06,'life':90,'damage':1130,'startup':36,'reach':900},'specialDown':{'level':'low','reach':200},'specialForward':{'travel':3.6,'damage':1030},'specialBack':{'kind':'buff','buff':'armor','duration':90,'hits':1,'damage':0},'super':{'kind':'melee','reach':335,'damage':2200,'exposeSelf':180},'utility':{'kind':'recover','restore':35}}],
['irving','RICARDO IRVING — MUTATION','PRÉDATEUR AQUATIQUE','Plaga de contrôle modifiée',[300,280],.82,'TRACTION TENTACULAIRE','BATEAU · EAUX CÔTIÈRES','water','Mutation aquatique d’Irving : longs tentacules, gueule dentée et noyau vulnérable. Tout déplacement hors de l’eau est une abstraction du Versus.',
 ['Tentacule d’Irving','Frappe de la gueule','Tentacule rasant','Saisie du bateau','Fouet de surface','Balayage immergé','Charge aquatique','Retrait dans l’eau','Morsure du navire','Tension des appendices'],[0,1,3,4,6],
 {'special':{'tag':'tentacle','reach':340,'damage':930},'specialDown':{'tag':'tentacle','reach':305,'level':'low'},'specialForward':{'travel':4.8,'reach':185,'damage':1130,'exposeSelf':150},'specialBack':{'kind':'mobility','travel':-4,'damage':0},'super':{'level':'throw','reach':175,'damage':2340,'exposeSelf':180},'utility':{'kind':'recover','restore':30}}],
['u-8','U-8','BLINDAGE À FAILLES','Las Plagas / ADN composite de crustacés',[330,280],.72,'PRESSION DES APPENDICES','TRICELL · PLATEFORME','lab','B.O.W. crustacée à carapace résistante et défauts de blindage. Le U de sa désignation ne désigne pas Uroboros.',
 ['Patte d’U-8','Double percussion blindée','Balayage de plateforme','Capture des mandibules','Percée des pattes','Rabotage du sol','Pression crustacée','Repli blindé','Gueule ouverte','Redistribution de pression'],[0],
 {'special':{'reach':300,'damage':1100,'startup':31},'specialDown':{'level':'low','reach':275},'specialForward':{'travel':3.4,'damage':1050},'specialBack':{'kind':'buff','buff':'armor','duration':100,'hits':2,'damage':0},'super':{'level':'throw','reach':160,'damage':2270,'exposeSelf':180},'utility':{'kind':'recover','restore':32}}],
['uroboros','UROBOROS — PREMIER SUJET','MASSE FILAMENTEUSE','Virus Uroboros',[285,192],.81,'COHÉSION FILAMENTEUSE','KIJUJU · INCINÉRATEUR','furnace','Premier Uroboros de RE5 : filaments noirs et noyau orange. Sa sensibilité au feu ne lui donne aucun pouvoir pyrogène.',
 ['Fouet filamenteux','Masse d’Uroboros','Filaments rampants','Enveloppement du sujet','Allonge du noyau','Nappe filamenteuse','Progression organique','Dispersion de retrait','Absorption du premier sujet','Réassemblage organique'],[0,3,4],
 {'special':{'tag':'tentacle','reach':280,'damage':810},'specialDown':{'kind':'trap','tag':'snare','status':'slow','duration':240,'arm':34,'reach':88,'damage':350,'maxTraps':2},'specialForward':{'travel':4.1,'tag':'tentacle'},'specialBack':{'kind':'mobility','travel':-3.5,'damage':0},'super':{'level':'throw','reach':128,'damage':1830,'tag':'grapple','exposeSelf':140},'utility':{'kind':'heal','heal':350,'cost':20,'startup':42,'cooldown':300}}],
['uroboros-mkono','UROBOROS MKONO','BRAS EXTENSIBLE','Virus Uroboros',[310,238],.79,'COHÉSION MKONO','TRICELL · CHAMBRE DE TEST','furnace','Uroboros Mkono, distinct du premier sujet ; bras allongés, noyaux exposables et vulnérabilité au feu.',
 ['Frappe de Mkono','Bras de démolition','Bras rasant','Enserrement de Mkono','Allonge du bras','Étalement filamenteux','Percée de Mkono','Retrait des faisceaux','Convergence des bras','Recomposition de Mkono'],[0,3,4],
 {'special':{'tag':'tentacle','reach':370,'startup':30,'damage':1100},'specialDown':{'kind':'melee','tag':'tentacle','level':'low','reach':320},'specialForward':{'tag':'tentacle','travel':3.8},'specialBack':{'kind':'mobility','travel':-3.4,'damage':0},'super':{'tag':'tentacle','reach':390,'damage':2150,'exposeSelf':175},'utility':{'kind':'heal','heal':420,'cost':24,'startup':48,'cooldown':360}}],
['uroboros-aheri','UROBOROS AHERI','COLOSSUS À NOYAUX','Virus Uroboros / Excella Gionne',[355,280],.66,'MASSE ASSIMILÉE','NAVIRE · PONT SUPÉRIEUR','ship','Excella transformée après assimilation d’un charnier. Masse géante à noyaux ; rejet d’organismes filamenteux, pas de laser satellite intégré.',
 ['Appendice d’Aheri','Écrasement du pont','Fauchage d’Aheri','Enveloppement terminal','Rejet d’organismes','Filaments du pont','Convergence du charnier','Contraction du noyau','Marée d’Aheri','Rassemblement de masse'],[0,4],
 {'special':{'kind':'projectile','tag':'bio','count':3,'interval':12,'speed':7,'life':110,'damage':290,'reach':800,'exposeSelf':140},'specialDown':{'kind':'trap','tag':'snare','reach':100,'damage':480,'arm':45,'duration':270},'specialForward':{'kind':'melee','tag':'tentacle','reach':360,'damage':1160,'travel':1.5},'specialBack':{'kind':'buff','buff':'armor','duration':95,'hits':1,'damage':0},'super':{'kind':'melee','tag':'tentacle','reach':410,'damage':2410,'exposeSelf':210},'utility':{'kind':'recover','restore':28}}],
['uroboros-albert-wesker','ALBERT WESKER — UROBOROS','MUTATION DU VOLCAN','Virus expérimental de Wesker + Uroboros',[300,170],.91,'CONTRÔLE UROBOROS','VOLCAN · PLATEAU ROCHEUX','volcano','Wesker du combat final : bras filamenteux et débris métalliques intégrés au bras droit. Aucune arme de poing de sa forme humaine importée.',
 ['Lame du bras droit','Croisement filamenteux','Fauchage du volcan','Poigne Uroboros','Allonge métallique','Balayage de filaments','Percée terminale','Repli des bras','Tourbillon du volcan','Stabilisation du noyau'],[0,4,8],
 {'light':{'tag':'blade'},'heavy':{'tag':'tentacle','reach':180},'special':{'tag':'blade','reach':325,'damage':1080,'startup':27},'specialDown':{'tag':'tentacle','level':'low','reach':280},'specialForward':{'tag':'blade','travel':4.4},'specialBack':{'kind':'mobility','travel':-3.8,'damage':0},'super':{'tag':'tentacle','reach':345,'damage':2260,'exposeSelf':200},'utility':{'kind':'recover','restore':30}}]
]

def moves_for(spec,index):
 slug,name,role,bio,(h,w),speed,res,loc,scene,basis,names,canonical,overrides=spec
 output={}
 for j,slot in enumerate(SLOTS):
  kind='recover' if slot=='utility' else 'melee'
  m=dict(name=names[j],kind=kind,startup=[7,20,12,13,24,24,20,16,39,35][j]+index%3,
   active=[3,5,4,3,5,5,9,12,7,1][j],recovery=[14,27,20,33,29,27,31,24,52,25][j],
   damage=[310,710,415,880,810,720,830,0,1850,0][j]+(index*11 if j not in (7,9) else 0),
   reach=[96,156,140,110,210,185,160,100,250,0][j],height=min(190,max(84,h*.77)),
   level='low' if j==2 else 'throw' if j==3 else 'mid',tag='grapple' if j==3 else 'strike',
   cost=[0,0,0,0,22,18,20,14,25,0][j],meter=100 if j==8 else 0,cooldown=180 if j==9 else 0)
  m.update(overrides.get(slot,{}))
  if m['level']=='low' and m['kind']!='projectile':m['height']=62
  if m['kind']=='projectile':m.setdefault('speed',14);m.setdefault('life',85);m['active']=1
  if m['kind'] in ('recover','reload','heal','buff','mark','mobility'):m['damage']=0
  if m['kind']=='recover':m.setdefault('restore',30)
  evidence='canonical' if j in canonical else ('anatomical' if j in (0,1,2,3,5,6) else 'simulation')
  if slug=='uroboros-aheri' and slot=='special':evidence='simulation'
  m.update(id=f're5-{slug}::{slot}',slot=slot,lore=evidence,evidence=evidence,source=BASE+'enemies/'+slug,
   loreBasis=basis+' Famille d’action : '+names[j]+'.',adaptation=BOUNDARY,
   counterplay=('Garder bas ou sauter ; punir la récupération.' if m['level']=='low' else 'Reculer ou déchoper au départ ; la prise ne traverse pas une invulnérabilité.' if m['level']=='throw' else 'Interrompre le démarrage, éviter la trajectoire et punir la récupération.' if m['kind']=='projectile' else 'Lire le démarrage et punir la récupération ; aucun effet n’est instantané.'))
  if m.get('exposeSelf'):m['adaptation']+=' L’ouverture temporaire du noyau est une fenêtre de dégâts globale, pas une hitbox anatomique précise.'
  output[slot]=m
 return output

def apply():
 roster=load('data/roster.json');playable=load('data/playable.json');assets=load('data/asset-sources.json');portraits=load('data/catalog-portraits.json');missing=load('data/missing-bosses.json');stories=load('data/chronicles.json');finishers=load('data/finishers-v053.json');arenas=load('data/arenas.json')
 ids=['re5-'+s[0] for s in SPECS];basefighter=copy.deepcopy(roster['fighters'][0]);baseplayable=copy.deepcopy(playable[0]);basefinisher=copy.deepcopy(next(iter(finishers['profiles'].values())))
 roster['fighters']=[f for f in roster['fighters'] if f['uid'] not in ids]
 roster['stages']=[s for s in roster['stages'] if not s['id'].startswith('re5_060_')]
 playable=[p for p in playable if p['id'] not in ids];assets['fighters']=[p for p in assets['fighters'] if p['id'] not in ids];arenas=[s for s in arenas if not s['id'].startswith('re5_060_')]
 cm={f['id']:f for f in roster['catalog']};route=[];stmap={}
 for idx,spec in enumerate(SPECS):
  slug,name,role,bio,(h,w),speed,res,loc,scene,basis,names,canonical,overrides=spec;uid='re5-'+slug;source=BASE+'enemies/'+slug;image='assets/catalog/'+uid+'.png'
  assert uid in cm and (R/image).is_file(),uid
  f=copy.deepcopy(basefighter);f.update(uid=uid,id=uid,name=name,ep='Resident Evil 5 (2009)',source='RE5 · 2009',game='resident-evil-5',role=role,archetype='re5-'+slug,power=round(1+idx*.009,3),speed=speed,reach=1,portrait=image,sprite=image,reference=source,spriteSource=cm[uid].get('sourcePage',source),bioAgent=bio,morphology=basis,canonicalAttacks=[names[j] for j in canonical],boss=slug not in ['adjule','licker-beta','big-man-majini','reaper'],assetNote='Illustration de référence existante, parfois partielle ; sprite latéral animé définitif à produire.',releasePack='uroboros')
  f.pop('spriteCrop',None)
  f['visual']=dict(kind='quadruped' if h<150 else 'human',width=w,height=h,drawHeight=h,sourceFacing='front',asymmetric=True,fullBody=False,maxDrawWidth=430,morphology='reference',body='massive' if h>260 else 'reference',weapon='none')
  f['fidelity']=dict(status='lore-audited',visualIncarnation=f['ep'],rule='Incarnation RE5 séparée ; aucune compétence d’une autre forme héritée.',balanceBoundary=BOUNDARY,visualStatus='reference-provisional',verification='Familles d’actions sourcées ; animations et valeurs exactes non certifiées.')
  ammo=slug in ('jill-valentine-enemy','gatling-gun-majini');heat=slug=='chainsaw-majini'
  passive=dict(id='re5-'+slug,name=role,desc='La jauge '+res.lower()+' règle les techniques. Cette gestion chiffrée est propre au Versus.')
  if slug=='licker-beta':passive['markMelee']=True;passive['desc']='Le repérage acoustique marque à portée limitée ; ce ciblage reste une simplification, pas une simulation complète de l’ouïe.'
  biology={}
  if slug in ('uroboros','uroboros-mkono'):biology=dict(shell=.78,exposed=1.2,fire=1.4,exposeOnFire=150,noHealingWhileBurning=True);passive['regenBudget']=1100;passive['desc']='Le feu expose temporairement le noyau et interrompt le réassemblage. Vulnérabilité chiffrée adaptée au Versus.'
  if slug in ('reaper','popokarimu','ndesu','irving','u-8','uroboros-aheri','uroboros-albert-wesker'):biology=dict(shell=.82,exposed=1.24);passive['desc']='Les grandes actions ouvrent une fenêtre de vulnérabilité. Carapace/noyau modélisés globalement, sans hitbox anatomique 1:1.'
  if slug=='reaper':biology['shell']=.72
  if slug=='jill-valentine-enemy':passive['desc']='P30 explique les capacités physiques ; la réserve affichée compte seulement les munitions. Aucun poison ou pouvoir mental.'
  f['combat']=dict(key='re5_'+slug.replace('-','_'),uid=uid,role=role,resource=dict(kind='ammo' if ammo else 'heat' if heat else 'energy',label=res,max=100,regen=0 if ammo else .29,reload=0),passive=passive,biology=biology,moves=moves_for(spec,idx),links=[['light','heavy'],['heavy','special']],sources=[source],canonicalAttacks=f['canonicalAttacks'],fidelity=copy.deepcopy(f['fidelity']),evidence='lore-audited')
  if slug=='jill-valentine-enemy':f['combat']['sources'].append(BASE+'files/jill-valentine-file')
  if slug=='reaper':f['combat']['sources'].append(BASE+'files/regarding-the-mutant-organism-found-in-the-facilities')
  roster['fighters'].append(f)
  p=copy.deepcopy(baseplayable);p.update(id=uid,candidateId=uid,name=name,game=f['ep'],gameKey=f['game'],pathogen=bio,bioAgent=bio,sprite=image,portrait=image,localPath=image,assetUsage='reference',fullBodyValidated=False,referencePage=source,sourcePage=source,sources=f['combat']['sources'],canonicalAttacks=f['canonicalAttacks'],description=basis,assetNote=f['assetNote']);p.pop('alphaBox',None);p.pop('sha256',None)
  for field in ['width','height','bytes','size','format','crop','spriteCrop','originalWidth','originalHeight']:p.pop(field,None)
  playable.append(p);assets['fighters'].append(copy.deepcopy(p))
  for catalog in [roster['catalog'],portraits['catalog'],missing['entries']]:
   for c in catalog:
    if c['id']==uid:c.update(selected=True,playable=True,sprite=image,assetUsage='reference',fullBodyValidated=False,bioAgent=bio,canonicalAttacks=f['canonicalAttacks'],description=basis,assetNote=f['assetNote'],sources=f['combat']['sources'])
  stid='re5_060_'+slug.replace('-','_');stmap[uid]=stid;route.append(uid)
  st=dict(id=stid,name=loc,ep='RE5 · 2009',family=scene,weather='ember' if scene=='volcano' else 'dust',props=[],scope='Scénographie procédurale originale : thème du lieu, pas relevé géométrique 1:1.',background=None,artwork='re5-procedural',tint=None,representation='Décor 2D procédural ; reconstruction artistique, non canonique.',credit='Décor runtime original B.O.W. Protocol',re5Scene=scene,re5Seed=idx,reference=source)
  roster['stages'].append(st);arenas.append(copy.deepcopy(st))
  def panel(title,body,tile):return dict(title=title,place=loc,prop='none',camera='profile',paragraphs=[body],text=body,stage=stid,focus=uid,visual=dict(set='re',tile=tile,environment=loc))
  stories['stories'][uid]=dict(uid=uid,name=name,game=f['ep'],group='RE5 · 2009',title='DOSSIER TRICELL · '+role,evidence='simulation',status='authored',edition=VERSION,anchor=basis,meta=BOUNDARY,continuity='Simulation non canonique. Ne modifie ni le destin du sujet, ni la chronologie de RE5.',visualSet='re',narrativeVersion='RE '+VERSION,
   intro=[panel('Identification du sujet',basis,0),panel('Mesure biologique',passive['desc'],1),panel('Ouverture de l’essai',name+' est confronté à huit sujets de RE5 dans une simulation de laboratoire. Aucun dialogue des jeux n’est reproduit.',2)],
   outro=[panel('Essais terminés','Les huit confrontations sont enregistrées pour '+name+'.',3),panel('Rapport du laboratoire',passive['desc']+' '+BOUNDARY,4),panel('Archive conservée','Ce résultat de jeu n’est pas un nouvel événement canonique de Resident Evil 5.',5)],route=[])
  pr=copy.deepcopy(basefinisher);family='beast' if h<150 else 'capture';pr.update(uid=uid,fighterName=name,episode=f['ep'],source=f['source'],family=family,basis=basis,visual=f['visual'],power=f['power'],speed=speed,reach=1,evidence='simulation')
  for j,z in enumerate(pr['finishers']):
   n=names[[8,1,4,3][j]];z.update(id=f'{uid}::finisher{j+1}',name=n+' — Conclusion stylisée',family=family,description=name+' conclut la simulation : '+n+'.',loreBasis=basis,sourceMoves=[n],phases=['approach','pounce','impact','fall'] if family=='beast' else ['approach','grab','impact','fall'],canonical=False,evidence='simulation')
  finishers['profiles'][uid]=pr
 for idx,uid in enumerate(ids):
  st=stories['stories'][uid];opponents=[ids[(idx+offset)%len(ids)] for offset in range(1,9)]
  st['route']=[dict(index=k,opponent=op,stage=stmap[op],stageName=next(s['name'] for s in roster['stages'] if s['id']==stmap[op]),label='ESSAI TRICELL '+str(k+1),before='Confrontation de simulation : '+st['name']+' / '+next(f['name'] for f in roster['fighters'] if f['uid']==op)+'.',challenge='Lire les techniques et les ouvertures du dossier adverse.',after='Essai enregistré ; maintien de la séparation des incarnations.') for k,op in enumerate(opponents)]
 legacy=['re7-mia-winters-infected','re7-jack-baker','re7-jack-baker-scissor','re7-marguerite-baker','re7-lucas-baker','re7-eveline']
 for f in roster['fighters']:
  if f['uid'] in legacy:f['visual']['fullBody']=False;f['assetNote']='Composite provisoire de la v0.5.0 : anatomie et animation latérale non validées 1:1.';f['fidelity']['visualStatus']='composite-provisional'
 for collection in [playable,assets['fighters'],roster['catalog'],portraits['catalog'],missing['entries']]:
  for c in collection:
   if c.get('id') in legacy:c['fullBodyValidated']=False;c['assetUsage']='composite-provisional';c['assetNote']='Composite provisoire, pas un corps 1:1 validé.'
 stories['fighters']=copy.deepcopy(roster['fighters']);stories['stages']=copy.deepcopy(roster['stages']);N=len(roster['fighters']);ev=Counter(m['evidence'] for f in roster['fighters'] for m in f['combat']['moves'].values())
 counts=dict(fighters=N,stories=len(stories['stories']),duels=len(stories['stories'])*8,finishers=sum(len(x['finishers']) for x in finishers['profiles'].values()),loreProfiles=N,loreMoves=N*10,canonicalMoves=ev['canonical'],anatomicalMoves=ev['anatomical'],simulationMoves=ev['simulation'],catalog=len(roster['catalog']),paintedArenas=sum(bool(s.get('background')) for s in roster['stages']),proceduralArenas=16)
 roster['version']=VERSION;roster['counts'].update(counts);stories['version']=stories['sourceVersion']=VERSION;stories['counts'].update(counts);finishers.update(version=VERSION,fighterCount=N,finisherCount=counts['finishers']);finishers['familyCounts']=dict(Counter(x['family'] for x in finishers['profiles'].values()))
 roster['protocols']=dict(uroboros=dict(title='UROBOROS ASCENSION',ids=route,stages=stmap,description='16 sujets de RE5. Parcours fictif ; ordre fixe, y compris en duel miroir.'))
 for p,v in [('data/roster.json',roster),('data/playable.json',playable),('data/asset-sources.json',assets),('data/catalog-portraits.json',portraits),('data/missing-bosses.json',missing),('data/chronicles.json',stories),('data/finishers-v053.json',finishers),('data/arenas.json',arenas)]:write(p,v)
 write('data/coverage-v060.json',dict(version=VERSION,catalogScope='Catalogue existant, non exhaustif de toute la franchise',playable=N,remaining=[dict(id=c['id'],name=c['name'],source=c.get('sourcePage')) for c in roster['catalog'] if c['id'] not in {f['uid'] for f in roster['fighters']}],newReferenceOnly=ids,previousComposites=legacy))
 p=load('package.json');p['version']=VERSION;p['description']='Resident Evil — B.O.W. Protocol · Uroboros Ascension';p['scripts']['verify']='node tests/verify-lore.mjs && node tests/verify-engine.mjs && node tests/verify-pages.mjs && node tests/verify-ui.mjs && node tests/verify-v060.mjs';p['scripts']['docs:release']='python3 scripts/release-v060.py';write('package.json',p)
 print(json.dumps(counts,ensure_ascii=False))
if __name__=='__main__':apply()
