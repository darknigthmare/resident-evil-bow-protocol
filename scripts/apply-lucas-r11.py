#!/usr/bin/env python3
"""Reviewed R11 profile migration. Only human Lucas changes; all moves are
marked SIMULATION pending exact primary-game sequence capture. No artwork write.
"""
from pathlib import Path
import copy,json
R=Path(__file__).resolve().parents[1]
p=R/'data/roster.json';d=json.loads(p.read_text());f=next(f for f in d['fighters'] if f['uid']=='re7-lucas-baker')
role='TECHNICIEN DES DISPOSITIFS — SIMULATION'
f['role']=f['combat']['role']=role
f['fidelity']['status']='source-review-partial'
f['fidelity']['rule']='Forme humaine distincte de la mutation finale. Les dispositifs et commandes ci-dessous sont une adaptation explicite du duel 2D, pas un moveset officiel certifié.'
f['fidelity']['balanceBoundary']='Valeurs, placement de charges, limite de trois dispositifs et déclenchements sont des règles originales de simulation. Pas de poison ni de noyau mutant importé dans ces commandes.'
f['fidelity']['visualIncarnation']=f['ep']
f['combat']['passive']={'id':'lucas-device-network-r11','name':'Réseau de dispositifs','desc':'Trois dispositifs au maximum, visibles et destructibles. La détonation ne soigne pas Lucas. Cette traduction 2D ne reconstitue pas les énigmes ni toutes les capacités du personnage original.','regenBudget':0}
f['combat']['resource']={'kind':'energy','label':'MATÉRIEL — JAUGE DE SIMULATION','max':100,'regen':0.24,'reload':0}
source='https://news.capcomusa.com/lets/browse/chris-redfield-returns-in-the-latest-video-for-not-a-hero-and-end-of-zoe'
f['combat']['sources']=[source,'https://news.capcomusa.com/lets/browse/the-first-banned-footage-dlc-for-resident-evil-7-biohazard-is-out-today',f['reference']]
f['combat']['evidence']='source-review-partial'
old=f['combat']['moves'];common={'cooldown':0,'cost':0,'meter':0,'level':'mid','tag':'strike'}
spec={
 'light':dict(name='Coup de clé — simulation',kind='melee',startup=7,active=3,recovery=13,damage=325,reach=100),
 'heavy':dict(name='Lancer de charge — simulation',kind='projectile',startup=16,active=1,recovery=27,damage=710,reach=480,cost=10,tag='explosive',fuse=40,gravity=.32,vy=-4,speed=7,life=100,bounces=1,radius=145),
 'low':dict(name='Balayage défensif — simulation',kind='melee',startup=12,active=4,recovery=23,damage=445,reach=140,level='low'),
 'throw':dict(name='Saisie du technicien',kind='melee',startup=9,active=3,recovery=34,damage=810,reach=86,level='throw',tag='grapple'),
 'special':dict(name='Charge télécommandée — pose',kind='trap',startup=31,active=1,recovery=39,damage=760,reach=135,cost=24,tag='explosive',lucasDevice='remote',remoteOnly=True,arm=30,duration=600,hp=160,maxTraps=3,blastRadius=150),
 'specialDown':dict(name='Fil-piège — pose',kind='trap',startup=21,active=1,recovery=30,damage=700,reach=145,cost=22,tag='explosive',lucasDevice='wire',remoteOnly=False,arm=35,duration=480,hp=140,maxTraps=3,triggerRadius=65,blastRadius=135),
 'specialForward':dict(name='Caisse piégée — pose',kind='trap',startup=26,active=1,recovery=35,damage=940,reach=150,cost=23,tag='explosive',lucasDevice='proximity',remoteOnly=False,arm=48,duration=480,hp=240,maxTraps=3,triggerRadius=50,blastRadius=160),
 'specialBack':dict(name='Repli du technicien',kind='mobility',startup=5,active=17,recovery=20,damage=0,reach=0,cost=13,tag='movement',travel=-7),
 'super':dict(name='Réseau à retardement — simulation',kind='trap',startup=34,active=1,recovery=48,damage=620,reach=110,cost=0,meter=50,tag='explosive',lucasDevice='timed',remoteOnly=False,arm=45,duration=420,hp=160,maxTraps=3,deviceCount=3,spacing=95,fuse=125,fuseInterval=18,blastRadius=140),
 'utility':dict(name='Mise à feu des charges armées',kind='detonate',startup=12,active=1,recovery=25,damage=0,reach=0,cost=0,tag='explosive',lucasDevice='remote-trigger',cooldown=18)
}
help={
 'heavy':'Charge projetée visible ; sa mèche de 40 ticks produit une seule explosion. Éloignez-vous du point de chute.',
 'special':'La pose ne blesse pas. Armement après 30 ticks ; UTILITAIRE déclenche uniquement vos charges télécommandées armées.',
 'specialDown':'Le fil bas détecte un passage au sol après armement. Sauter au-dessus ou détruire le boîtier au corps à corps. Explosion bloquable selon les règles de garde du prototype.',
 'specialForward':'La caisse attend son armement et une cible proche au sol. Détruire le boîtier ou rester hors zone.',
 'super':'Trois charges visibles, bornées par le même quota global ; mèches échelonnées. Se déplacer hors des zones ou détruire les boîtiers avant la détonation.',
 'utility':'Sans charge télécommandée armée, la commande ne crée aucun dégât ni soin et ne coûte pas de ressource. Les autres types de dispositifs ne sont pas déclenchés.',
 'specialBack':'Recul sans téléportation, soin ni trappe de décor inventée.'
}
f['combat']['moves']={}
for slot,v in spec.items():
 m={**common,**v,'id':f['uid']+'::'+slot,'slot':slot,'evidence':'simulation','lore':'simulation','loreBasis':'Rôle de Lucas humain et campagnes/modes séparés. La source primaire jointe confirme le contexte, pas chaque arme ou animation du duel. Relevé précis des séquences encore ouvert.','adaptation':f['fidelity']['balanceBoundary'],'source':source,'counterplay':help.get(slot,old[slot]['counterplay'])}
 f['combat']['moves'][slot]=m
f['combat']['fidelity']=copy.deepcopy(f['fidelity'])
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
print('R11: human Lucas updated, ten simulation commands; other fighter definitions unchanged.')
