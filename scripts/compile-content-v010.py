"""Compile editable Resident Evil reference records into CQC v0.60 contracts.

The source representations, combat adaptation and fictional simulation text
are explicitly separate. No roster count or animation claim is hard-coded.
"""
from pathlib import Path
import json, re, copy, sys, hashlib

R=Path(__file__).resolve().parents[1]
compact=lambda v:json.dumps(v,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
read=lambda p,default:json.loads((R/p).read_text()) if (R/p).exists() else default
catalog=read('data/catalog-portraits.json',{'catalog':[]})['catalog']
playable=read('data/playable.json',[])
if not playable:raise SystemExit('No reviewed whole-body playable records. Supply data/playable.json.')
curation=read('data/curation.json',{})
if isinstance(curation,list):curation={x['id']:x for x in curation}

GROUPS={
'resident-evil':'RE1 · 1996','resident-evil-remake':'RE1 · 2002',
'resident-evil-zero':'RE0','resident-evil-2':'RE2 · 1998','resident-evil-2-remake':'RE2 · 2019',
'resident-evil-3-nemesis':'RE3 · 1999','resident-evil-3-remake':'RE3 · 2020',
'resident-evil-code-veronica':'CODE: VERONICA','resident-evil-4':'RE4 · 2005',
'resident-evil-4-remake':'RE4 · 2023','resident-evil-5':'RE5','resident-evil-6':'RE6',
'resident-evil-7':'RE7','resident-evil-village':'VILLAGE','resident-evil-revelations':'REVELATIONS',
'resident-evil-revelations-2':'REVELATIONS 2','resident-evil-outbreak':'OUTBREAK',
'resident-evil-outbreak-file-2':'OUTBREAK FILE #2','resident-evil-requiem':'REQUIEM'}

def classify(row):
    n=row['name'].lower(); g=row.get('gameKey',''); ident=row['id'].lower()
    if 'nemesis' in n:return 'nemesis' if not re.search('stage [23]|second|third',n) else 'mutant'
    if 'licker' in n:return 'licker'
    if 'hunter' in n or 'sweeper' in n:return 'hunter'
    if any(x in n for x in ['cerberus','zombie dog','adjule','colmillos','fenrir','orthrus','hyena','lioness','garmr']):return 'quadruped'
    if any(x in n for x in ['lycan','vârcolac','varcolac']):return 'lycan'
    if any(x in n for x in ['molded','afflicted','rotten']):return 'molded'
    if any(x in n for x in ['regenerator','regenerador','iron maiden','pale head']):return 'regenerator'
    if any(x in n for x in ['wesker','krauser']):return 'elite'
    if 'dimitrescu' in n and not any(x in n for x in ['bela','cassandra','daniela','mutated']):return 'dimitrescu'
    if any(x in n for x in ['tyrant','thanatos']):return 'tyrant'
    if re.search(r'^g(?:\b|\s|\-)|birkin',n):return 'birkin'
    if any(x in n for x in ['plant','ivy','vines','tentacle']):return 'plant'
    if any(x in n for x in ['yawn','worm','snake','grave digger','adder']):return 'serpent'
    if any(x in n for x in ['neptune','alligator','del lago','irving','brzak']):return 'aquatic'
    if any(x in n for x in ['spider','spinner','tiger','deimos','chimera','plague','reaper','novistador','centurion','stinger']):return 'insect'
    if any(x in n for x in ['crow','bat','wasp','moth','samca','kipepeo','meset']):return 'flying'
    if any(x in n for x in ['executioner','salvador','chainsaw','garrador','uria','gigante','ndesu','ogroman','ironhead','brute']):return 'executioner'
    if any(x in n for x in ['soldat','sturm','heisenberg']):return 'soldat'
    if any(x in n for x in ['zombie','ganado','majini','villager','zealot','j\'avo','bloodshot','moroaic']):return 'infected'
    if any(x in n for x in ['jack baker','marguerite','lucas','eveline']):return 'molded'
    return 'mutant'

ARCH={
'nemesis':('TRAQUEUR',1.24,.88,1.2,285,120,['Poing du traqueur','Marteau écrasant','Balayage tentaculaire','Capture de la cible','Fouet tentaculaire','Écrasement au sol','Saisie tentaculaire','Recul de poursuite','Traque sans répit']),
'tyrant':('TYRANT',1.28,.76,1.22,300,120,['Poing massif','Griffe perforante','Balayage de griffe','Étreinte du Tyrant','Charge du Tyrant','Frappe au sol','Saisie écrasante','Pas de retrait','Assaut du Tyrant']),
'hunter':('ASSAUT',1.04,1.21,1.1,195,105,['Entaille','Griffes croisées','Ras du sol','Saisie griffue','Bond prédateur','Fauchage','Percée de griffes','Rebond arrière','Lacération du Hunter']),
'licker':('EMBUSCADE',.99,1.15,1.3,112,160,['Griffe rasante','Lacération','Griffes au sol','Étreinte griffue','Langue perforante','Balayage rampant','Bond du Licker','Repli rampant','Déchaînement prédateur']),
'quadruped':('PRÉDATEUR',.92,1.25,.94,96,148,['Morsure','Morsure profonde','Attaque aux chevilles','Morsure d’ancrage','Bond de prédation','Attaque rasante','Morsure en course','Repli rapide','Assaut de la bête']),
'lycan':('CHASSEUR',1.03,1.17,1.05,224,108,['Griffe','Frappe sauvage','Fauchage','Morsure','Bond sauvage','Balayage','Agrippement','Recul de chasse','Furie du Lycan']),
'molded':('FONGIQUE',1.04,.82,1.12,220,108,['Griffe mycélienne','Frappe de masse','Fauchage','Étreinte','Percée mycélienne','Frappe basse','Saisie','Reflux','Déferlement mycélien']),
'regenerator':('RÉGÉNÉRATION',1.0,.75,1.2,250,98,['Main extensible','Frappe distendue','Balayage extensible','Morsure','Allonge parasite','Pression basse','Agrippement','Retrait','Convergence parasite']),
'elite':('ASSAUT ÉLITE',1.08,1.3,1.02,230,78,['Frappe précise','Coup engagé','Balayage','Prise tactique','Percée','Fauchage rapide','Assaut rapproché','Esquive','Assaut supérieur']),
'dimitrescu':('TRAQUEUSE',1.23,.78,1.32,325,122,['Entaille','Griffes allongées','Fauchage','Étreinte','Percée de griffes','Balayage de griffes','Saisie dominante','Retrait','Jugement de Dimitrescu']),
'birkin':('MUTATION G',1.3,.8,1.24,300,142,['Frappe mutée','Bras hypertrophié','Balayage du bras','Étreinte G','Assaut muté','Impact tellurique','Saisie G','Retrait instable','Instabilité G']),
'plant':('VÉGÉTAL',1.02,.68,1.4,238,160,['Fouet végétal','Tige massive','Racines','Enlacement','Tentacule','Ronces rampantes','Capture végétale','Rétraction','Croissance incontrôlée']),
'serpent':('REPTILE',1.13,.89,1.3,160,205,['Morsure','Morsure profonde','Fauchage de queue','Constriction','Détente','Queue rasante','Enroulement','Repli','Prédation du serpent']),
'aquatic':('AQUATIQUE',1.28,.68,1.22,185,235,['Morsure','Mâchoires','Coup de queue','Capture','Charge amphibie','Queue rasante','Morsure de saisie','Recul','Prédation aquatique']),
'insect':('ARTHROPODE',1.04,1.08,1.18,156,162,['Griffe','Mandibules','Pattes tranchantes','Capture','Bond arthropode','Balayage','Saisie des pattes','Repli','Déchaînement arthropode']),
'flying':('AÉRIEN',.83,1.32,.92,100,106,['Attaque brève','Frappe en vol','Rase-mottes','Agrippement','Piqué','Rase-mottes engagé','Piqué de capture','Écart aérien','Attaque plongeante']),
'executioner':('COLOSSE',1.33,.7,1.27,305,138,['Frappe','Abattage','Fauchage','Saisie brutale','Percée du colosse','Impact au sol','Étreinte écrasante','Recul lourd','Exécution du colosse']),
'soldat':('BIO MÉCANIQUE',1.2,.82,1.2,278,130,['Frappe métallique','Perforation','Fauchage','Saisie mécanique','Charge mécanique','Balayage lourd','Perforation rapprochée','Retrait moteur','Surcharge mécanique']),
'infected':('INFECTÉ',.95,.9,1.02,218,84,['Frappe','Frappe engagée','Attaque basse','Morsure','Ruée','Fauchage','Agrippement','Retrait','Frénésie infectée']),
'mutant':('MUTANT',1.15,.87,1.15,275,140,['Frappe organique','Masse organique','Fauchage','Agrippement','Assaut organique','Impact au sol','Saisie organique','Retrait','Déferlement organique'])}

def move(name,kind='melee',**kw):
    m={'name':name,'kind':kind,'startup':10,'active':4,'recovery':20,'damage':450,'reach':100,'level':'mid','cost':0,'meter':0,'cooldown':0,'tag':'strike','counterplay':'Garder la distance, bloquer la frappe puis punir sa récupération.','lore':'adaptation'}
    m.update(kw);return m

def infection(row,typ):
    n=row['name'].lower();g=row.get('gameKey','')
    if typ=='nemesis':return 'Virus T · parasite NE-α'
    if typ=='birkin':return 'Virus G'
    if 'lisa trevor' in n:return 'Expérimentations multiples · spécimen Lisa Trevor'
    if 'veronica' in g and any(w in n for w in ['alexia','steve','nosferatu']):return 'Virus t-Veronica'
    if g in ['resident-evil-4','resident-evil-4-remake']:return 'Las Plagas'
    if g=='resident-evil-5':
        if 'uroboros' in n:return 'Uroboros'
        if 'wesker' in n:return 'Virus expérimental de Wesker'
        if 'licker' in n:return 'Virus T'
        if 'jill' in n:return 'Contrôle chimique · P30'
        return 'Las Plagas · variantes du programme Kijuju'
    if g=='resident-evil-6':return 'Virus C'
    if g=='resident-evil-7':return 'Moisissure · programme série E'
    if g=='resident-evil-village':return 'Moisissure / expérimentation Cadou'
    if g=='resident-evil-revelations':return 'Virus t-Abyss'
    if g=='resident-evil-revelations-2':return 'Programme t-Phobos / Uroboros · selon spécimen'
    if g=='resident-evil-requiem':return 'Dossier ARK · agent à confirmer par spécimen'
    return 'Virus T'

fighters=[]
for row in playable:
    extra=curation.get(row['id'],{})
    row={**row,**extra};typ=row.get('archetypeKey') or classify(row)
    role,power,speed,reach,h,w,names=ARCH[typ]; names=list(names)
    n=row['name'].lower()
    if typ=='elite' and 'wesker' in n:names=['Coup droit','Coup surpuissant','Balayage','Prise de domination','Percée surhumaine','Fauchage éclair','Saisie du Wesker','Esquive éclair','Assaut surhumain']
    if typ=='elite' and 'krauser' in n:names=['Coup de couteau','Entaille','Coupe basse','Prise tactique','Lame du bras' if 'mutat' in n else 'Estoc du couteau','Fauchage','Saisie','Retrait','Assaut de Krauser']
    if typ=='executioner' and any(x in n for x in ['chainsaw','salvador']):names[1]='Coup de tronçonneuse';names[4]='Charge à la tronçonneuse';names[8]='Tronçonnage'
    if 'garrador' in n:names[1]='Griffes d’acier';names[4]='Charge aveugle';names[8]='Lacération d’acier'
    if 'executioner' in n:names[1]='Hache du bourreau';names[4]='Fauchage de la hache';names[8]='Abattage du bourreau'
    if 'verdugo' in n:names=['Griffe','Queue perforante','Fauchage de queue','Étreinte','Percée du Verdugo','Queue rasante','Saisie griffue','Retrait prédateur','Chasse du Verdugo']
    if row['id']=='re2-g':names=['Frappe du tuyau','Tuyau engagé','Balayage au tuyau','Saisie G','Assaut au tuyau','Impact au sol','Étreinte du grand bras','Repli instable','Déchaînement G']
    if 'bandersnatch' in n:names=['Frappe du bras droit','Bras extensible','Balayage du bras','Saisie du bras','Extension du bras droit','Fauchage extensible','Capture étirée','Traction arrière','Assaut du Bandersnatch']
    if 'alexia' in n:names=['Frappe mutée','Entaille','Balayage','Saisie incendiaire','Sang incendiaire','Flamme rampante','Étreinte brûlante','Repli','Éruption t-Veronica']
    if 'mimicry' in n:names=['Fouet de sangsues','Bras-fouet','Sangsues rampantes','Enlacement','Fouet extensible','Colonie rasante','Capture de la colonie','Dispersion','Déferlement de sangsues']
    if 'rachael' in n:names=['Griffe','Frappe distendue','Balayage','Étreinte','Allonge de l’Ooze','Frappe basse','Saisie de l’Ooze','Retrait','Déchaînement t-Abyss']
    if row.get('moveNames'):names=(row['moveNames']+names)[0:9]
    resource={'kind':'energy','label':'ENDURANCE','max':100,'regen':.28,'reload':0}
    passive={'id':'survival','name':'Instinct de survie','desc':'Les techniques partagent une réserve d’endurance qui se recharge hors dépense.'}
    if typ in ['regenerator','molded','birkin']:passive={'id':'regeneration','name':'Récupération organique','desc':'L / H récupère une partie des blessures récentes ; le budget de récupération est limité.','regenBudget':900}
    moves={
      'light':move(names[0],startup=7,active=3,recovery=13,damage=315,reach=85,height=min(180,h*.77)),
      'heavy':move(names[1],startup=16,active=5,recovery=25,damage=680,reach=135,height=min(205,h*.86)),
      'low':move(names[2],startup=12,active=4,recovery=23,damage=430,reach=128,level='low',counterplay='Garde basse ou saut. Une garde debout ne suffit pas.'),
      'throw':move(names[3],startup=9,active=3,recovery=32,damage=790,reach=80,level='throw',tag='grapple',counterplay='Reculer, sauter ou déchoper pendant la fenêtre de prise.'),
      'special':move(names[4],startup=17,active=5,recovery=27,damage=660,reach=190,cost=18,travel=3,tag='tentacle' if typ in ['nemesis','licker','plant'] else 'strike'),
      'specialDown':move(names[5],startup=22,active=6,recovery=30,damage=710,reach=162,level='low',cost=22),
      'specialForward':move(names[6],startup=13,active=3,recovery=35,damage=930,reach=115,level='throw',tag='grapple',cost=22,travel=2,counterplay='Quitter la portée de la prise ou sauter avant son activation.'),
      'specialBack':move(names[7],'mobility',startup=4,active=17,recovery=19,damage=0,reach=0,travel=-6,cost=12,tag='movement',counterplay='Suivre le retrait et attaquer sa sortie ; ce mouvement ne donne pas d’invincibilité permanente.'),
      'super':move(names[8],startup=28,active=8,recovery=45,damage=2150,reach=222,meter=50,travel=4,tag='tentacle' if typ=='birkin' else 'strike',counterplay='Anticiper le départ très visible, bloquer puis punir la longue récupération.'),
      'utility':move('Reprendre souffle','recover',startup=40,active=1,recovery=19,damage=0,reach=0,restore=36,tag='recovery',counterplay='Mettre la pression avant la fin de la récupération.')}
    if typ in ['licker','plant']:
        moves['special'].update(reach=280,startup=22,travel=0,tag='tentacle')
    if typ in ['quadruped','lycan','hunter','insect']:
        moves['special'].update(startup=18,travel=6,reach=135,launchSelf=-6)
    if typ in ['regenerator','molded','birkin']:
        moves['utility']=move('Récupération organique','heal',startup=46,active=1,recovery=23,damage=0,reach=0,cost=18,heal=350,tag='recovery',counterplay='Interrompre avant activation ; seules les blessures récupérables peuvent être régénérées.')
    if typ=='elite' and 'wesker' in n:
        moves['specialBack'].update(blink=-100,travel=-2,cost=24)
    if row['id']=='re3r-nemesis':
        moves['special']=move('Lance-roquettes','projectile',startup=37,active=1,recovery=46,damage=1050,reach=800,cost=32,speed=11,life=100,height=190,tag='rocket',knock=11,counterplay='Le tir a un long départ. Se baisser sous sa trajectoire, sauter avec le bon timing ou bloquer ; punir la récupération à courte portée.')
    if row['id']=='re7-molded-fat':
        moves['special']=move('Vomi corrosif','projectile',startup=32,active=1,recovery=42,damage=610,reach=560,cost=25,speed=8,life=72,height=125,tag='poison',status='poison',duration=120,counterplay='Éviter la trajectoire par un saut, ou fermer la distance pendant la préparation du vomissement.')
    if row['id']=='revillage-karl-heisenberg':
        moves['special']=move('Projection de métal','projectile',startup=29,active=1,recovery=34,damage=640,reach=700,cost=24,speed=13,life=80,height=140,tag='metal',counterplay='Bloquer le projectile ou sauter, puis avancer pendant la récupération.')
    if row['id']=='revillage-mutated-miranda':
        moves['special']=move('Projection fongique','projectile',startup=30,active=1,recovery=36,damage=620,reach=700,cost=24,speed=8,life=100,height=155,tag='organic',counterplay='Changer de hauteur ou bloquer puis approcher. La projection n’est pas imparable.')
    if 'alexia' in n:
        moves['special']=move('Sang incendiaire','projectile',startup=28,active=1,recovery=35,damage=610,reach=700,cost=25,speed=9,life=90,height=110,tag='fire',status='burn',duration=120,counterplay='Sauter au-dessus du projectile ou bloquer, puis approcher pendant sa récupération.')
    if row['id']=='re6-strelat':
        moves['special']=move('Projection d’aiguilles','projectile',startup=26,active=1,recovery=35,damage=285,reach=680,cost=25,speed=12,life=75,height=90,tag='organic',count=3,interval=7,counterplay='Garder pendant toute la rafale ou changer de hauteur, puis punir la récupération.')
    if row['id'] in ['re4-novistador','re2-poison-ivy','rerev2-splasher']:
        label='Projection de pus' if 'splasher' in n else 'Projection acide'
        moves['special']=move(label,'projectile',startup=29,active=1,recovery=34,damage=570,reach=640,cost=24,speed=9,life=80,height=105,tag='poison',status='poison',duration=110,counterplay='Sauter, bloquer ou interrompre le départ avant la projection.')
    if row['id'] in ['rerev-farfarello','rerev2-glasp']:
        moves['specialBack']=move('Camouflage','buff',startup=23,active=1,recovery=27,damage=0,reach=0,cost=30,buff='cloak',duration=145,hits=1,tag='organic',counterplay='Suivre le déplacement et attaquer : le camouflage ne rend pas invincible et disparaît à l’attaque.')
    if row['id']=='recv-albinoid-adult':
        moves['special'].update(name='Décharge électrique',tag='electric',status='shock',reach=245,travel=0,startup=23)
    if row['id']=='recv-bandersnatch':moves['special'].update(reach=290,travel=0,startup=24,tag='tentacle')
    # Anatomical origins are descriptive. Timing, damage and resources are
    # original balancing values, never claimed to be extracted RE frame data.
    for slot,m in moves.items():m.update(id=row['id']+'::'+slot,slot=slot)
    visual={'kind':'quadruped' if typ in ['quadruped','licker','serpent','aquatic','insect'] else 'human',
      'height':h,'width':w,'drawHeight':h,'sourceFacing':row.get('sourceFacing',1),
      'asymmetric':any(x in n for x in ['nemesis','tyrant','birkin','bandersnatch']) or typ=='birkin',
      'fullBody':True,'primary':'#767365','secondary':'#383834','accent':'#bf554c','skin':'#92857b',
      'weapon':'none','body':'massive' if h>270 else 'athletic',**row.get('visual',{})}
    summary=row.get('morphology') or row.get('description') or f"{row['name']} — représentation de {row['game']}. Consulter l’image et la source de cet épisode pour les détails anatomiques."
    summary=' '.join(summary) if isinstance(summary,list) else summary
    f={'uid':row['id'],'id':row['id'],'name':row['name'].upper(),'ep':row['game'],
      'source':GROUPS.get(row.get('gameKey'),row.get('gameKey','RE')),'game':row.get('gameKey','resident-evil'),
      'role':role,'archetype':typ,'power':power,'speed':speed,'reach':reach,'color':'#765a55','accent':'#dda898',
      'visual':visual,'portrait':row.get('portrait',row['sprite']),'sprite':row['sprite'],
      'reference':row.get('sourcePage'),'spriteSource':row.get('spriteSource',row.get('sourcePage')),
      'assetNote':row.get('assetNote','Rendu statique de référence ; animation de combat adaptée au moteur 2D.'),
      'bioAgent':row.get('bioAgent') or infection(row,typ),'morphology':summary,'canonicalAttacks':row.get('canonicalAttacks',[]),
      'boss':row.get('boss',typ in ['nemesis','tyrant','birkin','dimitrescu','executioner','elite','mutant']),
      'combat':{'key':'re_'+typ,'role':role,'resource':resource,'passive':passive,'moves':moves,
        'weapon':'none','uid':row['id'],'fighterName':row['name'],'incarnation':row['game'],
        'basis':summary,'sources':[row.get('sourcePage','')],'evidence':'adaptation',
        'scope':'Morphologie référencée dans l’épisode indiqué ; timings, dégâts, déplacements, projections et finishers adaptés pour ce jeu de combat.',
        'limitations':['Une pose de référence statique ne constitue pas une animation extraite du jeu original.','Les formes et épisodes restent séparés.','Les duels croisés sont des simulations non canoniques.'],
        'normalsNote':'Les coups sont adaptés à la morphologie du spécimen.',
        'links':[['light','heavy']],'counterplay':[m['counterplay'] for m in moves.values()]}}
    fighters.append(f)

STAGE_DEFS=[
('spencer_hall','MANOIR SPENCER · HALL','RE1','mansion','mist','#211a16'),
('spencer_lab','LABORATOIRE ARKLAY','RE1','laboratory','none','#152521'),
('rpd_hall','R.P.D. · HALL CENTRAL','RE2','police','dust','#29241d'),
('raccoon_street','RACCOON CITY · RUES','RE3','street','rain','#202330'),
('clock_tower','BEFFROI SAINT-MICHAEL','RE3','clocktower','rain','#282025'),
('nest','NEST · CONFINEMENT','RE2','laboratory','none','#1b2630'),
('dead_factory','USINE DE TRAITEMENT','RE3','factory','mist','#2b241a'),
('rockfort','ROCKFORT · COUR DU COMPLEXE','CODE: VERONICA','prison','rain','#26232c'),
('antarctic','BASE ANTARCTIQUE','CODE: VERONICA','laboratory','snow','#223443'),
('village_square','VILLAGE · PLACE CENTRALE','RE4','village','mist','#353026'),
('salazar_castle','CHÂTEAU SALAZAR','RE4','castle','dust','#34291e'),
('kijuju','KIJUJU · QUARTIER URBAIN','RE5','village','dust','#483621'),
('queen_zenobia','QUEEN ZENOBIA','REVELATIONS','ship','mist','#142a30'),
('edonia','EDONIA · ZONE D’OPÉRATION','RE6','street','snow','#292e32'),
('baker_house','PROPRIÉTÉ BAKER','RE7','mansion','rain','#282315'),
('dimitrescu','CHÂTEAU DIMITRESCU','VILLAGE','castle','snow','#352a23'),
('heisenberg','USINE HEISENBERG','VILLAGE','factory','ash','#352c20'),
('ark','ARK · SECTEUR DE CONFINEMENT','REQUIEM','laboratory','none','#272828')]
arena_manifest=read('data/arenas.json',[])
am={x['id']:x for x in arena_manifest}
stages=[{'id':i,'name':name,'ep':ep,'family':family,'weather':weather,
 'sky':[col,'#1a1818','#08090a'],'props':[],'scope':'Reconstitution de simulation inspirée du lieu ; géométrie 2D adaptée.',**am.get(i,{})}
 for i,name,ep,family,weather,col in STAGE_DEFS]

def stage_for(f):
    g=f['game'];n=f['name'].lower()
    if 'nemesis' in n:return 'raccoon_street'
    if 'dimitrescu' in n:return 'dimitrescu'
    if 'heisenberg' in n or 'soldat' in n:return 'heisenberg'
    if 'revelations' in g:return 'queen_zenobia'
    if 'requiem' in g:return 'ark'
    if 'village' in g:return 'dimitrescu'
    if g.endswith('-7'):return 'baker_house'
    if g.endswith('-6'):return 'edonia'
    if g.endswith('-5'):return 'kijuju'
    if 'evil-4' in g:return 'salazar_castle' if any(x in n for x in ['verdugo','garrador','salazar']) else 'village_square'
    if 'veronica' in g:return 'rockfort'
    if 'evil-2' in g:return 'rpd_hall' if f['archetype'] in ['licker','tyrant','infected'] else 'nest'
    if 'evil-3' in g:return 'raccoon_street'
    return 'spencer_hall'

SM={s['id']:s for s in stages};stories={};challenges={}
for idx,f in enumerate(fighters):
    st=stage_for(f);nm=f['name'];uid=f['uid']
    def card(title,text,phase,k,stage=st):
        return {'title':title,'place':SM[stage]['name'],'prop':'none','camera':'wide' if k==0 else 'profile',
          'paragraphs':[text],'text':text,'stage':stage,'focus':uid,'visual':{'set':'re','tile':k+(3 if phase=='outro' else 0),'environment':SM[stage]['name']}}
    intro=[card('Ouverture du dossier',f"Le dossier {nm} est chargé depuis les archives de {f['ep']}. {f['morphology']}",'intro',0),
      card('Protocole d’observation',f"La simulation confronte ce spécimen à huit profils adverses. Les données biologiques du dossier indiquent : {f['bioAgent']}. Les affrontements qui suivent sont une reconstitution fictive du laboratoire, sans modifier l’histoire de son épisode.",'intro',1),
      card('Mise en confinement',f"Les portes se verrouillent dans {SM[st]['name']}. {f['combat']['moves']['special']['name']} permet de contrôler l’approche ; {f['combat']['moves']['specialBack']['name']} ouvre un repli. Le premier essai peut commencer.",'intro',2)]
    pool=[x for x in fighters if x['uid']!=uid]
    pool.sort(key=lambda x:(x['game']!=f['game'],not x['boss'],(fighters.index(x)-idx)%max(1,len(fighters))))
    route=[];challenges[uid]=[]
    labels=['Prise de contact','Mesure de la portée','Pression du prédateur','Rupture de la garde','Réserve organique','Épreuve de mobilité','Résistance au trauma','Confinement terminal']
    for k in range(8):
        opponent=pool[k%len(pool)];sid=st if k%2==0 else stage_for(opponent)
        cue=f"Observer {opponent['combat']['moves']['special']['name']}. {opponent['combat']['moves']['special']['counterplay']}"
        route.append({'index':k,'opponent':opponent['uid'],'stage':sid,'stageName':SM[sid]['name'],
          'label':labels[k],'before':f"Essai {k+1}/8 : {nm} face à {opponent['name']}, référence {opponent['ep']}. Le secteur {SM[sid]['name']} est isolé pour mesurer {labels[k].lower()}.",
          'challenge':cue,'after':f"Le profil {opponent['name']} est neutralisé dans la simulation. Les capteurs enregistrent les impacts et la dépense de ressources de {nm}. "+('Le protocole est complet.' if k==7 else 'Le confinement suivant est préparé.')})
        challenges[uid].append({'index':k,'kind':'action','speaker':None,'speakerUid':None,'opponentUid':opponent['uid'],'sourceText':cue,'review':'simulation','reason':'Consigne du laboratoire ; aucune parole attribuée à la créature.'})
    outro=[card('Huit essais achevés',f"Les huit confrontations du dossier {nm} sont enregistrées. Ce résultat débloque le compte rendu et la relecture des scènes de ce parcours.",'outro',0),
      card('Rapport biologique',f"Profil observé : {f['role']}. L’essai a mobilisé {f['combat']['moves']['special']['name']}, {f['combat']['moves']['specialForward']['name']} et {f['combat']['moves']['super']['name']}. Ces techniques demeurent des adaptations de combat équilibrées pour cette simulation.",'outro',1),
      card('Dossier scellé',f"La projection de {nm} se dissipe. Le spécimen de référence appartient toujours à {f['ep']}. L’archive garde la trace du parcours ; un autre dossier peut maintenant être ouvert.",'outro',2)]
    stories[uid]={'uid':uid,'name':nm,'game':f['game'],'group':f['ep'],'title':'Dossier '+nm,
      'evidence':'adaptation','status':'Simulation non canonique','edition':'structured',
      'intro':intro,'outro':outro,'route':route,'continuity':'Confrontations fictives de données biologiques ; aucun crossover présenté comme un événement canonique.',
      'anchor':f['morphology'],'meta':f['assetNote'],'visualSet':'re','narrativeVersion':'RE 0.1.0'}

finishers={};families={}
for f in fighters:
    typ=f['archetype'];family='beast' if typ in ['quadruped','lycan','licker','serpent','insect','flying','aquatic'] else 'blade' if typ in ['hunter','dimitrescu'] else 'mechanical' if typ=='soldat' else 'capture'
    slots=['neutral','down','forward','back'];source_slots=['super','specialDown','specialForward','heavy'];fs=[]
    for k,slot in enumerate(slots):
        name=f['combat']['moves'][source_slots[k]]['name']
        fs.append({'id':f['uid']+'::finisher'+str(k+1),'index':k,'slot':slot,
          'commandP1':['O','↓ + O','AVANT + O','ARRIÈRE + O'][k],
          'commandP2':['Y','S + Y','AVANT + Y','ARRIÈRE + Y'][k],
          'name':name+' — Conclusion','family':family,'tone':'stylized','duration':210+k*16,
          'camera':['close','wide','low','orbit'][k],
          'description':f"{f['name']} conclut le duel avec {name.lower()}. Séquence adaptée à la simulation.",
          'loreBasis':f['morphology'],'sourceMoves':[name],'phases':['approach','pounce' if family=='beast' else 'grapple','impact','fall'],
          'victimRule':'any','rating':'stylized','gore':False,'canonical':False,'evidence':'adaptation'})
    finishers[f['uid']]={'uid':f['uid'],'fighterName':f['name'],'episode':f['ep'],'source':f['source'],
      'family':family,'tone':'stylized','basis':f['morphology'],'evidence':'adaptation','finishers':fs,
      **{k:f[k] for k in ['color','accent','visual','power','speed','reach']}}
    families[family]=families.get(family,0)+1

groups=[{'id':g,'name':GROUPS.get(g,g)} for g in dict.fromkeys(x['game'] for x in fighters)]
counts={'fighters':len(fighters),'stories':len(stories),'authored':0,'structured':len(stories),'duels':len(stories)*8,
 'introPanels':len(stories)*3,'outroPanels':len(stories)*3,'paragraphs':len(stories)*6,'illustratedPortraits':len(fighters),
 'paintedArenas':sum(bool(s.get('background')) for s in stages),'catalog':len(catalog),'finishers':len(fighters)*4}
data={'version':'0.1.0','sourceEngine':'CQC Versus Legacy 0.60','fighters':fighters,'stages':stages,
 'catalog':catalog,'counts':counts,'groups':groups,'assetPolicy':'Portraits and full-body renders are separate. Renders are static; movement and attack effects are adapted.'}
storydata={'schema':'re.bow.chronicles.content/1','version':'0.1.0','sourceVersion':'CQC 0.60','counts':counts,
 'fighters':fighters,'stages':stages,'groups':groups,'stories':stories,'visualMethod':'Reference render composition',
 'presentation':{'schema':'re.bow.presentation/1','version':'0.1.0','challenges':challenges},'revision060':{'reviewed':[]}}
fin={'version':'0.1.0','fighterCount':len(fighters),'finishersPerFighter':4,'finisherCount':len(fighters)*4,
 'familyCounts':families,'toneCounts':{'stylized':len(fighters)},'profiles':finishers,'routes':[],
 'design':{'windowFrames':300,'inputs':{'P1':['O','↓ + O','AVANT + O','ARRIÈRE + O'],'P2':['Y','S + Y','AVANT + Y','ARRIÈRE + Y']},
 'modes':['off','stylized','cinematic'],'default':'stylized','gore':False,'note':'Conclusions de simulation, non canoniques.'}}
(R/'src/re-data.js').write_text('window.RE_DATA='+compact(data)+';\n')
(R/'src/chronicles-data-v060.js').write_text('window.CQC55_DATA='+compact(storydata)+';\n')
(R/'src/finishers-v053.js').write_text('globalThis.CQC_FINISHERS_053='+compact(fin)+';\n')
(R/'data/roster.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
(R/'data/chronicles.json').write_text(json.dumps(storydata,ensure_ascii=False,indent=2))
print(json.dumps(counts))
