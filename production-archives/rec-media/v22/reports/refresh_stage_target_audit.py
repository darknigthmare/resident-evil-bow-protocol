import json
from pathlib import Path
B=Path('/workspace/scratch/39787b3268a6');V=B/'production-archives/rec-media/v22';I=json.loads((B/'production-archives/rec-media/v21/inventory/INVENTAIRE_COMPLET_V21_20261124.json').read_text());S=(B/'v22_work/references/stages/re-data-current.js').read_text();D=json.JSONDecoder()
reasons={
'spencer_hall':'Un master spencer.png existe. Le cadrage inspecté est une composition originale, avec escalier et architecture différents du hall RE1 HD visé par V1 ; qualification de la référence et des archives nécessaire avant remplacement.',
'spencer_lab':'Le laboratoire Arklay RE1 HD utilise nest.png, un laboratoire générique à cuves. Une salle exacte du laboratoire Arklay doit être choisie et référencée ; ne pas confondre NEST 2019.',
'rpd_hall':'Le suivi V5 atteste un ancien master RPD avec aperçu borné ; archive V3/V4 non récupérée. Ne pas régénérer comme prétendue absence. Couverture caméra restant à qualifier.',
'raccoon_street':'raccoon.png représente une rue originale ; V1 demande RE3 Remake 2020. Le tronçon exact et ses repères doivent être établis avant remplacement.',
'clock_tower':'Libellé source BEFFROI SAINT-MICHAEL, édition seulement RE3 ; risque de confusion RE3 1999 / place extérieure Remake 2020. Cette identité est distincte de clock_tower_plaza_2020.',
'nest':'Le suivi V5 atteste un master NEST existant avec calques non alignés ; archive V3/V4 non récupérée. Ne pas régénérer comme absence établie.',
'dead_factory':'Libellé source USINE DE TRAITEMENT, édition seulement RE3 ; l’usine du jeu original et NEST2 du remake sont différents. Une salle et une édition doivent être fixées par preuve.',
'rockfort':'La cour de Rockfort Code Veronica X utilise une rue de Raccoon City. V1 évoque cour de prison et miradors ; zone exacte de cour à référencer.',
'antarctic':'Le complexe antarctique Code Veronica X utilise nest.png. V1 évoque hangar industriel et glace ; choix précis du hangar nécessaire.',
'village_square':'village.png existe mais représente une place rurale originale ; V1 cible la place RE4 Remake 2023. Géométrie et repères du remake à qualifier.',
'salazar_castle':'castle.png existe mais représente une galerie originale ; V1 cible le grand hall RE4 Remake 2023, distinct de Ancient Chantry.',
'kijuju':'V21 possède déjà Public Assembly chapitre1-1. Réutilisation à envisager pour le quartier Kijuju de V1 ; pas de nouveau master identique à générer.',
'queen_zenobia':'Le suivi V5 atteste un master Queen Zenobia existant dont la caméra est trop basse et la piste horizontale non démontrée ; archive non récupérée. Pas de régénération comme absence.',
'edonia':'Libellé générique ZONE D’OPÉRATION RE6, sans district ni chapitre. Une rue de Raccoon City est utilisée ; localisation exacte à résoudre avant master certifié par source.',
'baker_house':'baker.png existe, mais son hall de bois à escalier courbe diffère du Main Hall du jeu. V1 cible le hall de la maison principale RE7 ; nécessite capture et nouvelle composition qualifiée.',
'dimitrescu':'castle.png est partagé avec RE4 et ne correspond pas au hall Village de V1. Le hall précis doit être référencé.',
'heisenberg':'factory.png existe comme fonderie originale, mais le lieu Village de V1 est générique. Salle exacte de la manufacture à désigner ; ne pas confondre la cour du boss.',
'ark':'src/re-data.js classe explicitement ce secteur sous REQUIEM. Aucun secteur exact ni capture de confinement vérifiée ; ne pas remplacer par NEST ni inventer une salle.',
'nest_escape_2019':'Ascenseur d’évacuation RE2 Remake 2019 du Super Tyrant ; utilise le laboratoire nest.png. Besoin spécifique distinct du master NEST annoncé.',
'clock_tower_plaza_2020':'Place de la tour RE3 Remake 2020 du combat Nemesis ; utilise une rue générique. Besoin spécifique distinct du beffroi non daté.',
'nest2_weapon_test_2020':'Salle de test d’armes NEST2 RE3 Remake 2020, combat final Nemesis ; utilise un laboratoire générique à cuves. Ne pas confondre la fosse d’élimination précédente.',
'village_lake_2023':'Lac du combat Del Lago RE4 Remake 2023 ; utilise la salle à manger de Queen Zenobia. Transformation en combat latéral exige expliciter le support et ne pas inventer une rive canonique.',
'castle_dungeon_2023':'Donjon du Garrador RE4 Remake 2023 ; utilise une galerie gothique générique, sans sa pierre, son cachot ni ses séparations de bois.',
'specimen_storage_2023':'Stockage de spécimens RE4 Remake 2023, laboratoire de Regeneradores ; nest.png ne démontre ni implantation ni cuves de cette salle.',
'ancient_chantry_2023':'Ancient Chantry RE4 Remake 2023, combat Salazar chapitre12 ; distinct du grand hall et du bitmap castle.png.',
'island_docks_2023':'Quais de chargement RE4 Remake 2023, duel Apex ; préciser les plateformes finales de Saddler chapitre16, sans confondre le débarcadère initial chapitre13.',
'dimitrescu_battlements_2021':'Bastions/tour du duel final Lady Dimitrescu dans Village ; utilise une galerie intérieure castle.png.',
'moreau_reservoir_2021':'Réservoir vidé et village submergé du duel Moreau dans Village ; village.png est une place européenne sèche générique.',
'heisenberg_yard_2021':'Cour du boss Heisenberg dans Village ; factory.png est une fonderie intérieure, scène différente.',
'edonia_crash_2012':'Site du crash enneigé RE6, distinct de la zone urbaine générique Edonia. Capture exacte de la zone Jake/Sherry à vérifier.',
'guest_house_attic_2017':'Grenier Mia RE7 distinct du hall Baker. Rendu Canvas original R14 déjà présent, explicitement non canonique ; nouveau PNG de référence complémentaire, aucune absence totale de décor.',
'baker_garage_2017':'Garage Jack RE7 distinct du hall Baker. Rendu Canvas original R14 déjà présent, explicitement non canonique ; nouveau PNG de référence complémentaire.',
'processing_area_morgue_2017':'Morgue du duel à la tronçonneuse Jack RE7 ; le hall Baker ne fournit ni fosse, ni étage grillagé, ni pilier central.',
'old_house_lantern_2017':'Libellé source GALERIE DE LA LANTERNE dans la vieille maison ; ne pas substituer automatiquement la serre du combat Marguerite. Passage/galerie exact à qualifier.',
'testing_area_2017':'Libellé source COULOIR PIÉGÉ RE7, et rendu Canvas original R14 déjà présent. Ne pas confondre grange Fat Molded, salle Happy Birthday ou laboratoire DLC.',
'eveline_corridor_2017':'Libellé source MAISON PRINCIPALE · CORRIDOR D’HALLUCINATION ; le combat final Eveline est associé à la maison d’hôtes. Correspondance exacte à résoudre avant production.'}
archive={'rpd_hall','nest','queen_zenobia'};native={'guest_house_attic_2017','baker_garage_2017','testing_area_2017'}
assets=json.loads((V/'reports/stages.json').read_text())['assets']
byid={a['runtime_id']:a for a in assets if a.get('runtime_id') and a['status']=='candidate_static_master'}
rows=[]
for r in I['stages']:
 if not r.get('bitmap_runtime'):continue
 i=S.find('{"id":"'+r['id']+'"');raw=D.raw_decode(S[i:])[0] if i>=0 else {}
 status='candidate_produced' if r['id'] in byid else ('ARCHIVE_RECOVERY_HOLD' if r['id'] in archive else ('EXISTING_V21_CANDIDATE_REUSE_REVIEW' if r['id']=='kijuju' else 'REFERENCE_REVIEW_OPEN'))
 rows.append({'runtime_id':r['id'],'name':raw.get('name',r['nom']),'runtime_edition_label':raw.get('ep'),'spec_v1_id':r.get('spec_v1_id'),'runtime_bitmap':r['bitmap_runtime'],'runtime_bitmap_visually_inspected':True,'native_canvas_r14_present':r['id'] in native,'status':status,'specific_need_or_hold_reason':reasons[r['id']],'v22_asset_id':byid.get(r['id'],{}).get('asset_id'),'historical_absence_certified':False,'archive_caveat':'V5 annonce21 masters V3/V4 au total ; fichiers non récupérés et couverture complète non connue. Aucun master dédié trouvé dans les arbres assets/ et production-archives/ inspectés au head29b004d3, sauf antécédents signalés.','repository_source':'https://github.com/darknigthmare/resident-evil-bow-protocol/blob/29b004d3ba9d03941e7e56a8f0871760be46a774/src/re-data.js'})
specs=[]
matched={r.get('spec_v1_id') for r in I['stages']}
for s in I['specifications_stages_v1_non_cumulees']:
 sid=s.get('id') or s.get('stage_id');
 if sid in matched:continue
 specs.append(s)
preserved=[{'runtime_id':r['id'],'v21_status':r.get('statut_v21'),'v21_media':r.get('medias_v21',[]),'reason':'V21/V5 conservé sans régénération V22.'} for r in I['stages'] if not r.get('bitmap_runtime')]
out={'schema':'REC_V22_STAGE_TARGET_AUDIT_1','head_inspected':'29b004d3ba9d03941e7e56a8f0871760be46a774','focused_runtime_target_count':len(rows),'runtime_targets':rows,'v1_unmatched_specs':specs,'preserved_runtime_targets':preserved,'preservation_note':'15 mappings V21, Reaper V5 et ShipDeck6-1 hors runtime conservés. STG_MISSILE_DECK et STG_LAVA se rapprochent des masters V21. Les5 autres specs sont confiées au parent.','asset_tree_complete':True,'asset_tree_truncated':False,'production_archives_tree_complete':True,'production_archives_tree_truncated':False,'whole_repository_tree_complete':False,'historical_archives_recovered':False,'audit_complete':False}
(V/'reports/stage_target_audit.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'runtime':len(rows),'preserved':len(preserved),'unmatchedspecs':len(specs),'generated':len(byid)}))
