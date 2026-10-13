#!/usr/bin/env python3
"""Build release notes from executed results, without inflating roster completion."""
from pathlib import Path
import json,html,hashlib
R=Path(__file__).resolve().parents[1]
def read(p):return json.loads((R/p).read_text(encoding='utf8'))
def save(p,v):(R/p).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
p=read('package.json');d=read('data/roster.json');e=read('data/catalog-expansion-v070.json');assert p['version']==d['version']=='0.7.2'
suites={}
for key,file in [('engine','engine-results'),('pages','pages-results'),('ui','ui-results'),('re5','v060-results'),('continuity','v061-results'),('catalog','v070-results'),('journal','v071-results'),('spatial','v072-results')]:
 r=read('tests/'+file+'.json');f=r.get('failed',r.get('failures',0));assert f==0,(key,f);n=r['passed'] if 'passed' in r else r['checks']-f;suites[key]={'passed':n,'failed':f}
a=read('docs/DELIVERY_AUDIT_v0.7.2.json');assert not a['missing'];total=sum(s['passed'] for s in suites.values())
man={'version':'0.7.2','codename':'Zones critiques','productionCounts':d['counts'],'annexCounts':e['counts'],'annexDataVersion':e['version'],'scope':{'main':115,'experimental':231,'contextual':43,'catalog':389,'newCharacters':0,'spatialIncarnations':5,'spatialZones':8,'finalAnimationsAdded':0},'verification':{'passed':total,'failed':0,'suites':suites,'delivery':{k:v for k,v in a.items() if k!='routes'},'browser':{'executed':False,'reason':'Local Chromium HTTP navigation returned ERR_BLOCKED_BY_ADMINISTRATOR; no alternate network access attempted. Native Canvas and controlled DOM are separate tests.'}},'compatibility':{'contextJournal':'Exact v0.7.1 source/data/contract preserved; checkpoints remain compatible.','mainReplay':'New runtime contract; old files are preserved but require their original combat version.'},'limits':['Spatial rectangles are authored collision-space approximations, not Capcom hitboxes.','Only five exact RE5 incarnations opt into eight zones. Other old biology profiles retain their global rules.','No new skeletal animations, final sprites, limb destruction or phase scripts.','231 experimental fighters and 43 contextual exercises remain outside campaign progression.','Community lore references are cited, not an exhaustive primary-source certification.','PR and Drive archives do not mean main is merged or Vercel promoted.']}
save('docs/RELEASE_MANIFEST_v0.7.2.json',man)
notes=f'''# B.O.W. Protocol v0.7.2 — Zones critiques

## Intégration et périmètre
Cette PR réunit les corrections du Journal des essais (#8, fusionné dans la branche catalogue après la fusion de #7) et cette nouvelle passe vers main.
115 combattants principaux + 231 prototypes isolés + 43 exercices = 389 identités. Aucun nouveau sujet ou pouvoir canonique n’a été ajouté. Les définitions des combattants et les 274 dossiers sont conservées.

## Changements
- Cinq incarnations RE5 disposent de huit volumes critiques : Uroboros, Mkono, Reaper, Popokarimu et U-8.
- La fenêtre d’exposition ne suffit plus : la trajectoire doit rencontrer une zone au bon endroit et depuis le bon côté. Le reste du corps conserve sa résistance.
- Prises, dégâts non localisés et explosions n’empruntent pas un bonus critique global. Le feu conserve son multiplicateur thermique et interrompt le soin d’Uroboros/Mkono.
- Les rectangles suivent la collision, la posture, l’orientation et la hauteur, indépendamment de la déformation de l’illustration provisoire.
- Les projectiles utilisent leur segment de déplacement réel : correction des faux contacts diagonaux et du segment/du côté de garde pendant le retour.
- Les deux laboratoires permettent de préparer explicitement une ouverture de 600 frames et de fixer la cible de face ou de dos. Ces paramètres ne sont jamais des récompenses ni des règles imposées à une campagne.
- Pause du laboratoire à la perte du focus ; retour textuel du nombre d’impacts localisés.
- Affichage des limites spatiales dans les movesets et des numéros de version corrigés.
- Audit local des 389 identités : routes exclusives, ressources fournies, module de collision chargé, absence de promotion des prototypes.

## Tests exécutés
{total} contrôles réussis, 0 échec : '''+', '.join(f'{k} {v["passed"]}' for k,v in suites.items())+'''.
Le contrôle local couvre 13 pages et 555 fichiers liés. Les tests antérieurs sont relancés avec les nouvelles règles spatiales, y compris les duels CPU. Les coordonnées restent des approximations de gameplay. La vérification HTTP Chromium est bloquée par l’environnement ; aucun contrôle navigateur réel récent n’est revendiqué.

## Sauvegardes
Le journal des exercices et son contrat v0.7.1 sont inchangés octet par octet. Les replays du moteur principal utilisent un nouveau contrat ; les anciens restent conservés et doivent être ouverts avec leur version d’origine. Aucune sauvegarde n’est supprimée.

## Limites
Les zones critiques ne sont configurées que pour les cinq incarnations listées ; elles ne constituent ni un démembrement ni toutes les phases des boss originaux. La queue, la gueule et les noyaux sont des rectangles de collision schématiques ; les sprites ne sont pas rendus anatomiquement définitifs par ces rectangles. Les cartes, commandes, frames et coefficients du versus restent adaptés. Les 35 références sommaires de l’annexe et les animations finales restent à documenter/produire.

## Jouer
Extraire la source, lancer npm start puis ouvrir l’adresse affichée. Laboratoire : sélectionner une cible RE5 concernée ; cocher « ouverture préparée » pour inspecter ses volumes, ajuster le côté et la distance. Cette case est une fixture de test explicite, jamais une preuve d’exposition canonique.

Les références et choix d’adaptation sont consignés dans docs/SOURCES_SPATIAL_v072.md.
'''
(R/'docs/RELEASE_NOTES_v0.7.2.md').write_text(notes,encoding='utf8')
intro='''# Resident Evil — B.O.W. Protocol

## v0.7.2 — Zones critiques

115 combattants principaux, 231 prototypes isolés, 43 exercices contextuels. Le catalogue compte 389 identités, pas 389 combattants 1:1 finalisés.

Cinq profils RE5 disposent de zones critiques localisées ; le calcul des trajectoires, les laboratoires et l’intégration du journal sont corrigés.

```sh
npm start
```

```sh
npm install --no-save --package-lock=false @napi-rs/canvas@0.1.80
npm run verify
npm run build
```

Voir `docs/RELEASE_NOTES_v0.7.2.md`, le manifeste et `docs/DELIVERY_AUDIT_v0.7.2.json`.

L’annexe et le journal contextuel gardent leur version de données 0.7.1 : leur contrat n’a pas changé. Le moteur principal porte la nouvelle empreinte de combat.

Les illustrations sont provisoires et les règles de combat adaptées. Aucune nouvelle animation originale ou extraite n’est revendiquée. Fangame non officiel ; Resident Evil appartient à ses ayants droit dont Capcom.
'''
(R/'README.md').write_text(intro,encoding='utf8');(R/'docs/README_FR.md').write_text(intro,encoding='utf8')
(R/'docs/README_FR.html').write_text('<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>B.O.W. Protocol 0.7.2</title><body style="background:#102029;color:#e3e8da;font:16px/1.6 Arial;max-width:950px;margin:40px auto;padding:20px"><a href="../index.html" style="color:#cbe2bc">← MENU</a><h1>Zones critiques — v0.7.2</h1><pre style="white-space:pre-wrap">'+html.escape(notes)+'</pre></body></html>',encoding='utf8')
print(json.dumps({'version':'0.7.2','passed':total,'scope':man['scope']}))
