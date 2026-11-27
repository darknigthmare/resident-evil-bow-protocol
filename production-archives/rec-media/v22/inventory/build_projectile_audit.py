from pathlib import Path
import copy
import json

V22 = Path(__file__).absolute().parents[1]
V21 = V22.parent / 'v21'
baseline = json.loads((V21 / 'inventory/INVENTAIRE_COMPLET_V21_20261124.json').read_text())
report_path = V22 / 'reports/projectiles.json'
report = json.loads(report_path.read_text())

# These reviews concern the project's 16 families and 44 designed actions.
# They do not turn inventory renders into evidence of an in-flight game model.
reviews = {
 'FX_BALISTIQUE': ('source_hold', 'Les 18 actions regroupent plusieurs éditions, armes et phases de tir. Le modèle d’arme exact et les séquences départ/impact ne sont pas verrouillés par les intitulés V1. Une balle générique inventée ne validerait pas ces actions.', []),
 'FX_FUSIL': ('source_hold', 'Quatre actions de fusil restent à documenter par l’arme et les images départ/impact propres à chaque jeu. Aucun cône lumineux générique présenté comme effet canonique.', []),
 'OBJ_GRENADE': ('partial_candidate_and_refusal', 'Candidat RE5 V21 conservé pour Chris uniquement. Le rendu natif RE2R a été inspecté, puis la génération de la grenade RE2R a été refusée; aucun PNG, aucune relance. Jill/Carlos RE3R, vol, rotations et explosions restent non produits.', ['https://www.evilresource.com/resident-evil-2-remake/weaponry/hand-grenade', 'https://www.evilresource.com/resident-evil-5/weaponry/hand-grenade']),
 'OBJ_GRENADE_INCENDIAIRE': ('source_hold', 'L’action de Claire doit être rapprochée des Flame Rounds du GM 79 de RE2R. La référence d’inventaire inspectée montre les munitions groupées; elle ne valide pas un projectile séparé en vol ni le feu d’impact. Ne pas y substituer la grenade RE5.', ['https://www.evilresource.com/resident-evil-2-remake/weaponry/flame-rounds']),
 'FX_ELECTRIQUE_PROJECTILE': ('simulation_and_source_hold', 'Le Spark Shot et ses Needle Cartridges RE2R sont identifiés. Le chargeur inspecté montre seulement une partie des aiguilles. Le projectile lent de V1 est une règle de simulation; corps entier, câble et séquence électrique restent à documenter.', ['https://www.evilresource.com/resident-evil-2-remake/weaponry/spark-shot', 'https://www.evilresource.com/resident-evil-2-remake/weaponry/needle-cartridges']),
 'OBJ_BOUTEILLE_INCENDIAIRE': ('partial_static_candidate', 'Un objet RE0 entier non allumé a été généré depuis le rendu d’inventaire inspecté. La plateforme du rendu et le détail HD ne sont pas certifiés. Vol, rotation, allumage, éclatement et feu au sol restent manquants.', ['https://www.evilresource.com/resident-evil-zero/weaponry/molotov-cocktail']),
 'FX_LAMPE': ('simulation_and_source_hold', 'L’éclat local de lampe de Barry est une proposition de simulation V1. La référence de phase, la forme et les durées exactes ne sont pas verrouillées; aucun effet plein écran inventé.', []),
 'OBJ_GRAPPIN': ('source_hold', 'L’article de Capcom confirme le grappin d’Ada Separate Ways 2023 et ses usages. Le téléchargement de sa capture a renvoyé HTTP403; tête complète et attache du câble n’ont pas pu être inspectées. Le lanceur seul ne suffit pas à valider le projectile.', ['https://blog.playstation.com/2023/09/14/resident-evil-4-dlc-separate-ways-launches-sept-21-re4-vr-mode-arrives-as-free-dlc-this-winter/']),
 'OBJ_CARREAU_EXPLOSIF': ('source_hold', 'Les Blast Arrows d’Ada Separate Ways 2023 sont identifiées. Le rendu inspecté montre un carquois et des empennages rouges, mais cache les pointes et une partie des tiges. Le carreau bleu du Bolt Thrower de Leon généré en V22 est distinct et ne clôt pas cette action.', ['https://www.evilresource.com/resident-evil-4-remake/separate-ways/weaponry/blast-arrows', 'https://www.evilresource.com/resident-evil-4-remake/separate-ways/weaponry/blast-crossbow']),
 'FX_BATON_ELECTRIQUE': ('source_hold', 'Le Stun Rod de Sherry RE6 est identifié et son rendu d’inventaire entier mais très peu défini a été inspecté. La charge électrique et l’impact local ne sont pas visibles dans ce rendu; pas d’effet générique présenté comme copie du jeu.', ['https://www.evilresource.com/resident-evil-6/weaponry/stun-rod']),
 'OBJ_ROQUETTE': ('source_hold', 'La cible V1 est Nemesis forme1 RE3R 2020. L’étude de roquette RE5 V21 reste hors raccord. Une vue complète du projectile RE3R en vol, avec ses phases propres, manque toujours à la validation.', ['https://www.windowscentral.com/resident-evil-3-remake-screenshots']),
 'OBJ_FERRAILLE': ('simulation_and_source_hold', 'Le fragment projeté par Heisenberg humain est une spécification de combat V1. Aucun fragment précis de référence n’est verrouillé; ne pas le confondre avec les masses de la forme mutée.', []),
 'FX_MAGNETIQUE': ('simulation_and_source_hold', 'Le champ local est une règle de simulation. Sa forme visuelle n’est pas un objet canonique démontré; les références de Heisenberg humain doivent être fixées avant création 1:1.', []),
 'OBJ_MINE_FER': ('simulation_and_source_hold', 'La mine de fer de Heisenberg est une adaptation V1. Les Attachable Mines RE4R et Mine Rounds RE3R trouvées dans les catalogues sont d’autres objets; elles ne sont pas raccordées à cette fiche.', ['https://www.evilresource.com/resident-evil-4-remake/weaponry/attachable-mines', 'https://www.evilresource.com/resident-evil-3-remake/weaponry/mine-rounds']),
 'OBJ_FLECHE_EXPLOSIVE': ('source_hold', 'La flèche de l’EJF-338 de Krauser RE4R est distincte du carreau d’Ada et du Bolt Thrower de Leon. Identité de l’arme repérée, mais aucune image entière de la flèche de cette édition n’a été qualifiée. La page image consultée était inaccessible.', ['https://residentevil.fandom.com/wiki/EJF-338_Compound_Bow', 'https://residentevil.fandom.com/wiki/Explosive_Arrows']),
 'FX_FLAMMES_ALEXIA': ('effect_study_only', 'Une étude de flamme isolée est disponible. La capture PS2 2001 documente la transformation; la capture complémentaire près de la main n’explicite pas la plateforme. Elles n’établissent pas les quatre phases d’attaque V1. Aucune frame extraite ni animation complète certifiée.', ['https://www.mobygames.com/game/3720/resident-evil-code-veronica-x/screenshots/ps2/798467/', 'https://www.gamepro.de/artikel/top-10-resident-evil-bosse-aller-zeiten,3367330.html'])
}
families = []
action_family = {}
for old in baseline['projectile_families']:
    row = copy.deepcopy(old)
    status, note, urls = reviews[row['id']]
    row['statut_v22'] = status
    row['note_v22'] = note
    row['sources_v22_urls'] = urls
    row['medias_v22'] = [a['path'] for a in report['assets'] if a.get('status') == 'static_candidate' and set(a.get('v1_actions', [])) & set(row['actions'])]
    row['etudes_v22'] = [a['path'] for a in report['assets'] if a.get('status') == 'effect_study' and set(a.get('v1_actions', [])) & set(row['actions'])]
    row['refus_v22'] = [r for r in report['refusals'] if set(r.get('v1_actions', [])) & set(row['actions'])]
    row['famille_complete'] = False
    row['fidelite_1_1_validee'] = False
    row['engine_admitted'] = False
    families.append(row)
    for action in row['actions']:
        assert action not in action_family
        action_family[action] = row
actions = []
for old in baseline['projectile_actions']:
    row = copy.deepcopy(old)
    fam = action_family[row['id']]
    row['family_id_v22'] = fam['id']
    row['statut_famille_v22'] = fam['statut_v22']
    row['note_famille_v22'] = fam['note_v22']
    row['medias_v22'] = [a['path'] for a in report['assets'] if a.get('status') == 'static_candidate' and row['id'] in a.get('v1_actions', [])]
    row['etudes_v22'] = [a['path'] for a in report['assets'] if a.get('status') == 'effect_study' and row['id'] in a.get('v1_actions', [])]
    row['refus_v22'] = [r for r in report['refusals'] if row['id'] in r.get('v1_actions', [])]
    row['action_complete'] = False
    row['fidelite_1_1_validee'] = False
    actions.append(row)
assert len(families) == 16 and len(actions) == 44
assert len({a['id'] for a in actions}) == 44
doc = {
 'schema': 'rec.projectiles.vfx.audit.v22/1',
 'date': '2026-11-24', 'timezone': 'Europe/Paris',
 'scope': '16 familles et 44 actions V1, sans les assimiler à 44 PNG absents; sources historiques et V21 conservées.',
 'audit_complete_for_listed_families': True,
 'all_requested_assets_generated': False,
 'native_png_v22': len(report['assets']),
 'static_candidates_v22': sum(a['status']=='static_candidate' for a in report['assets']),
 'effect_studies_v22': sum(a['status']=='effect_study' for a in report['assets']),
 'tool_refusals_no_png_v22': len(report['refusals']),
 'families_complete': 0, 'actions_complete': 0, 'fidelity_1_1_certified': 0,
 'families': families, 'actions': actions,
 'additional_arsenal_candidates': [a for a in report['assets'] if not a.get('v1_actions')],
 'historical_refusals_preserved': 'Refus grenade incendiaire RE5 / flash RE5 V21 conservés dans l’inventaire cumulatif; aucune relance en V22.',
 'reference_rule': 'URL et intitulé identifient une piste; seule une image réellement inspectée qualifie sa partie visible. Les sources citées comme inaccessibles ne sont pas des références visuelles validées.'
}
(V22/'inventory/projectiles-vfx-16-families.json').write_text(json.dumps(doc,ensure_ascii=False,indent=2))
report['family_audit_path'] = 'inventory/projectiles-vfx-16-families.json'
report['generation_complete'] = True
report['all_requested_assets_generated'] = False
report['source_holds'] = [{'family_id':f['id'],'status':f['statut_v22'],'reason':f['note_v22'],'actions':f['actions'],'source_urls':f['sources_v22_urls']} for f in families if not f['famille_complete']]
report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2))
lines = ['# Projectiles et VFX — audit V22', '', doc['scope'], '', '**3 PNG : 2 objets candidats et 1 étude de flamme. 1 refus sans PNG. Aucun jeu d’animation complet ni fidélité 1:1 certifiée.**', '', '| Famille | Actions V1 | État V22 | Travail restant / décision |', '|---|---:|---|---|']
for f in families:
    lines.append('| '+f['nom']+' | '+str(len(f['actions']))+' | '+f['statut_v22']+' | '+f['note_v22'].replace('|','/')+' |')
lines += ['', '## Raccords à préserver', '', '- Le carreau bleu RE4R de Leon est un complément d’arsenal; il ne remplace pas les Blast Arrows rouges d’Ada.', '- Le Molotov RE0 est un objet statique non allumé; les phases de vol et d’impact restent à créer.', '- La grenade RE5 V21 ne remplace ni la grenade RE2R refusée ni les grenades RE3R.', '- L’étude de roquette RE5 V21 ne remplace pas la roquette de Nemesis RE3R.', '- Les effets de simulation d’Heisenberg et de la lampe de Barry ne sont pas des objets canoniques 1:1 déjà établis.', '', 'Les 44 raccords individuels, les URLs et les états V21 conservés se trouvent dans projectiles-vfx-16-families.json.', '']
(V22/'inventory/projectiles-vfx-16-families.md').write_text('\n'.join(lines))
print(json.dumps({'families':len(families),'actions':len(actions),'png':len(report['assets']),'refusals':len(report['refusals']),'complete_families':0}))
