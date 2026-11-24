"""Build a V22 review package from actual native outputs and versioned evidence.

No pixels, historical records, runtime files or source references are modified.
Run from the repository root, or pass --v21-dir when using a detached copy.
"""
from pathlib import Path
from PIL import Image
import argparse
import collections
import copy
import hashlib
import html
import json
import re

BASE = Path(__file__).absolute().parent
PREFIX = 'production-archives/rec-media/v22/'
parser = argparse.ArgumentParser()
parser.add_argument('--v21-dir', type=Path, default=BASE.parent / 'v21')
parser.add_argument('--allow-in-progress', action='store_true')
args = parser.parse_args()
V21 = args.v21_dir
REPORT_NAMES = ('stages', 'stages_extra', 'creatures', 'costumes', 'projectiles', 'humans')
reports = {name: json.loads((BASE/'reports'/f'{name}.json').read_text()) for name in REPORT_NAMES}
in_progress = [name for name, r in reports.items() if not r.get('generation_complete')]
if in_progress and not args.allow_in_progress:
    raise SystemExit('Reports not finalized: ' + ', '.join(in_progress))

def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

def url_list(row):
    result = []
    for key in ('sources', 'references', 'source_urls'):
        for ref in row.get(key, []) or []:
            value = ref if isinstance(ref, str) else ref.get('url') or ref.get('page_url') or ref.get('source_page')
            if value and value.startswith(('https://', 'http://')) and value not in result:
                result.append(value)
    for key in ('source_page',):
        value = row.get(key)
        if value and value.startswith(('https://', 'http://')) and value not in result:
            result.append(value)
    return result

def as_list(value):
    return value if isinstance(value, list) else ([value] if value else [])

assets, refusals, holds = [], [], []
for name, report in reports.items():
    for row in report.get('assets', []):
        relative = row['path'].removeprefix(PREFIX)
        assert relative.startswith('assets/') and '..' not in relative
        path = BASE / relative
        raw = path.read_bytes()
        sha256 = hashlib.sha256(raw).hexdigest()
        git_sha = hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
        assert git_sha == row['git_blob_sha'], (relative, 'Git blob mismatch')
        assert sha256 == row['sha256'], (relative, 'SHA256 mismatch')
        with Image.open(path) as im:
            im.load()
            dimensions, mode = list(im.size), im.mode
            assert dimensions == row['dimensions'], (relative, 'dimensions mismatch')
            if 'A' in im.getbands():
                alpha = im.getchannel('A')
                alpha_range = list(alpha.getextrema())
                assert alpha_range[0] == 0 and alpha_range[1] > 0, (relative, 'no usable alpha')
                transparent_pixels = alpha.histogram()[0]
                bbox = list(alpha.point(lambda v: 255 if v >= 128 else 0).getbbox() or ())
            else:
                alpha_range, transparent_pixels, bbox = None, None, None
        status_raw = row.get('status', '').lower()
        status = ('rejected_trial' if 'trial' in status_raw or 'rejected' in status_raw
                  else 'visual_study' if 'study' in status_raw else 'static_candidate')
        category = {'stages':'stage', 'stages_extra':'stage', 'creatures':'creature',
                    'costumes':'costume', 'projectiles':'projectile', 'humans':'character'}[name]
        display_name = row.get('name') or ' — '.join(filter(None, [row.get('character'), row.get('costume')])) or row['asset_id']
        if name == 'projectiles':
            display_name = {'REC_OBJ_RE4R_2023_BOLT_RIGHT_V22':'Carreau simple — Bolt Thrower de Leon',
                            'REC_OBJ_RE0_MOLOTOV_UNLIT_V22':'Cocktail Molotov non allumé — RE0',
                            'REC_FX_ALEXIA_CVX_FLAME_STUDY_V22_01':'Flamme d’Alexia — étude CVX'}.get(row['asset_id'], display_name)
        limits = as_list(row.get('limitations', row.get('limits', row.get('review', [])))) + as_list(row.get('additional_limitations'))
        assets.append({
            'asset_id':row['asset_id'], 'name':display_name, 'category':category,
            'edition':row.get('edition', row.get('game', '')), 'costume':row.get('costume'),
            'direction':row.get('observed_direction') or row.get('direction'),
            'runtime_id':row.get('runtime_id'), 'spec_id':row.get('spec_id') or row.get('v1_stage_spec'),
            'uid':row.get('uid'), 'catalogue_id':row.get('catalogue_id'), 'hero_id':row.get('hero_id'),
            'v1_actions':row.get('v1_actions', []), 'path':relative,
            'status':status, 'source_report_status':row.get('status'),
            'dimensions':dimensions, 'mode':mode, 'file_bytes':len(raw),
            'alpha_range':alpha_range, 'fully_transparent_pixels':transparent_pixels,
            'bbox_alpha_ge128':bbox, 'sha256':sha256, 'git_blob_sha':git_sha,
            'sources':url_list(row), 'prompt':row.get('prompt'),
            'review_report':f'reports/{name}.json', 'limitations':limits,
            'canonical_fidelity_1_1_certified':False, 'engine_admitted':False,
            'animation_complete':False, 'image_pixels_modified_after_generation':False
        })
    for row in report.get('refusals', []):
        item = copy.deepcopy(row)
        item.update(review_report=f'reports/{name}.json', image_created=False, retry_performed=False)
        if not item.get('request_id'):
            match = re.search(r'request ID ([0-9a-f-]{36})', json.dumps(item))
            if match: item['request_id'] = match.group(1)
        refusals.append(item)
    for row in report.get('source_holds', []):
        item = copy.deepcopy(row)
        item['review_report'] = f'reports/{name}.json'
        holds.append(item)

assert len({a['path'] for a in assets}) == len(assets), 'Duplicate PNG path'
assert len({a['asset_id'] for a in assets}) == len(assets), 'Duplicate asset ID'
reported = {a['path'] for a in assets}
actual = {str(p.relative_to(BASE)) for p in (BASE/'assets').glob('*.png')}
unreported = sorted(actual-reported)
assert not reported-actual
if not args.allow_in_progress: assert not unreported, ('Unreported PNG', unreported)

def selected(category=None, status='static_candidate'):
    return [a for a in assets if (category is None or a['category']==category) and (status is None or a['status']==status)]

summary = {
    'png_outputs':len(assets), 'static_candidates':len(selected()),
    'visual_studies':len(selected(status='visual_study')), 'rejected_trials':len(selected(status='rejected_trial')),
    'by_category':dict(collections.Counter(a['category'] for a in assets)),
    'by_category_and_status':{cat:dict(collections.Counter(a['status'] for a in selected(cat, None))) for cat in ('stage','creature','character','costume','projectile')},
    'tool_refusals_no_png':len(refusals), 'hold_records':len(holds),
    'runtime_stages_with_v22_candidate':len({a['runtime_id'] for a in selected('stage') if a['runtime_id']}),
    'v1_extra_specs_with_v22_candidate':len({a['spec_id'] for a in selected('stage') if a['spec_id']}),
    'creature_uids_with_v22_candidate':len({a['uid'] for a in selected('creature')}),
    'costume_variants_with_v22_candidate':len({a['catalogue_id'] for a in selected('costume') if not str(a['catalogue_id']).startswith('COST_ANNEX_')}),
    'costume_annex_variants_with_v22_candidate':len({a['catalogue_id'] for a in selected('costume') if str(a['catalogue_id']).startswith('COST_ANNEX_')}),
    'hero_sheets_with_v22_candidate':len({a['hero_id'] for a in selected('character') if a['hero_id']}),
    'engine_admitted':0, 'canonical_1_1_certified':0, 'completed_animations':0,
    'png_archive_before_v22':171, 'png_archive_after_v22':171+len(assets)
}
manifest = {
    'schema':'rec.media.v22/1', 'project':'Resident Evil Combat', 'date':'2026-11-24', 'timezone':'Europe/Paris',
    'repository':'darknigthmare/resident-evil-bow-protocol', 'pull_request':24,
    'base_head_before_v22':'29b004d3ba9d03941e7e56a8f0871760be46a774',
    'generation_reports_finalized':not in_progress, 'reports_in_progress':in_progress,
    'all_requested_content_complete':False, 'summary':summary, 'assets':assets,
    'tool_refusals':refusals, 'source_holds':holds, 'unreported_in_progress_png':unreported,
    'scope':'Native static review assets and qualified remaining work. No complete-franchise claim.',
    'source_policy':'Inspected source images inform production; third-party reference bitmaps are not redistributed in this package.',
    'historical_records_rewritten':False
}
write_json(BASE/'ASSET_MANIFEST_V22.json', manifest)

inventory = copy.deepcopy(json.loads((V21/'inventory/INVENTAIRE_COMPLET_V21_20261124.json').read_text()))
inventory.update(schema='rec.inventory.v22/1', media_head_avant_v22=manifest['base_head_before_v22'],
                 perimetre='Inventaire V21 conservé et observations V22 ajoutées. Les populations se recoupent ; aucune exhaustivité de franchise ni fidélité 1:1 certifiée.')
inventory['livraison_v22'] = manifest
inventory['synthese']['livraisons_v22'] = summary
inventory['synthese']['total_png_archives_documentes_apres_v22'] = summary['png_archive_after_v22']
inventory['synthese']['fidelite_1_1_certifiee'] = False
stage_audit = json.loads((BASE/'reports/stage_target_audit.json').read_text())
costume_audit = json.loads((BASE/'inventory/costumes-38-reconciliation.json').read_text())
projectile_audit = json.loads((BASE/'inventory/projectiles-vfx-16-families.json').read_text())
inventory['stage_audit_v22'] = stage_audit
inventory['catalogue_costumes_v22'] = costume_audit
inventory['projectile_families'] = projectile_audit['families']
inventory['projectile_actions'] = projectile_audit['actions']
inventory['projectile_audit_v22'] = projectile_audit
stage_by_id = {r['runtime_id']:r for r in stage_audit['runtime_targets']}
hold_by_uid = {r['uid']:r for r in reports['creatures']['source_holds']}
refusal_by_uid = {r['uid']:r for r in reports['creatures']['refusals'] if r.get('uid')}

def attach(row, matches, default_note, hold=None, refusal=None):
    candidates = [a for a in matches if a['status']=='static_candidate']
    row['medias_v22'] = [PREFIX+a['path'] for a in candidates]
    row['essais_v22'] = [PREFIX+a['path'] for a in matches if a['status']=='rejected_trial']
    row['etudes_v22'] = [PREFIX+a['path'] for a in matches if a['status']=='visual_study']
    row['statut_v22'] = 'candidat_statique_produit' if candidates else 'refus_outil_sans_png' if refusal else 'reference_a_reunir' if hold else 'historique_conserve'
    row['note_v22'] = 'Une ou plusieurs images statiques candidates sont disponibles. Vues, détails, animations et intégration restent à valider.' if candidates else default_note
    if hold: row['attente_v22'] = hold; row['note_v22'] = hold.get('reason_fr') or hold.get('reason') or hold.get('specific_need_or_hold_reason') or default_note
    if refusal: row['refus_v22'] = refusal
    row['fidelite_1_1_validee'] = False

for row in inventory['stages']:
    matches = [a for a in assets if a['runtime_id']==row['id']]
    audit = stage_by_id.get(row['id'])
    attach(row, matches, audit.get('specific_need_or_hold_reason', '') if audit else 'État V21/V5 conservé sans régénération V22.')
    if audit:
        row['audit_v22'] = audit
        if not matches: row['statut_v22'] = audit.get('status', 'historique_conserve')
for row in inventory['specifications_stages_v1_non_cumulees']:
    matches = [a for a in assets if a['spec_id']==row['id']]
    if not matches and row.get('catalogue_match'):
        matches = [a for a in assets if a['runtime_id']==row['catalogue_match']]
    attach(row, matches, 'Spécification V1 conservée ; rapprochement runtime et archives à lire séparément.')
    row['medias_historiques_rapproches_v22'] = []
    audit = stage_by_id.get(row.get('catalogue_match'))
    extra = next((r for r in stage_audit['v1_unmatched_specs'] if r['id']==row['id']), None)
    if not matches and audit:
        row['statut_v22'] = audit['status']
        row['note_v22'] = audit.get('specific_need_or_hold_reason', row['note_v22'])
        row['audit_v22'] = audit
        if row['id']=='STG_KIJUJU':
            row['medias_historiques_rapproches_v22'] = ['production-archives/rec-media/v21/assets/REC_STAGE_RE5_PUBLIC_ASSEMBLY_MASTER_V21_01.png']
    if not matches and extra and extra.get('v22_status','').startswith('preserved_v21'):
        row['statut_v22'] = extra['v22_status']
        row['note_v22'] = extra['note']
        old = extra.get('existing_asset_path') or 'production-archives/rec-media/v21/assets/'+extra['existing_asset_id']+'.png'
        row['medias_historiques_rapproches_v22'] = [old]
        row['note_v22'] += ' Master historique : '+Path(old).name
for row in inventory['bow']:
    uid = row['uid']
    attach(row, [a for a in assets if a['uid']==uid], 'État historique conservé ; compléter les vues, références et animations selon le besoin déjà documenté.', hold_by_uid.get(uid), refusal_by_uid.get(uid))
    reviewed = next((r for r in reports['creatures'].get('examined_targets', []) if r.get('uid')==uid), None)
    reviewed = reviewed or hold_by_uid.get(uid) or refusal_by_uid.get(uid) or next((r for r in reports['creatures']['assets'] if r.get('uid')==uid), {})
    row['declaration_runtime_v22'] = reviewed.get('runtime_existing_media', {})
for section in ('heroes','extensions','costumes_base','costume_targets_v5','recovery'):
    for row in inventory[section]:
        hero_id = row['id'].removesuffix('__COSTUME') if section in ('heroes','costumes_base') else None
        human_matches = [a for a in selected('character', None) if hero_id and a['hero_id']==hero_id]
        attach(row, human_matches, 'État historique conservé. Une variante de costume V22 ne valide pas automatiquement la tenue de base ni une nouvelle incarnation.')
        if section == 'recovery': row['note_v22'] = 'Archives annoncées restant à récupérer et comparer ; aucune absence globale déduite.'
variants = costume_audit['variants']
for row in inventory['heroes']:
    related_ids = {v['id'] for v in variants if v.get('fiche_v1')==row['id']}
    row['variantes_costume_v22'] = [PREFIX+a['path'] for a in selected('costume') if a['catalogue_id'] in related_ids]

annex_path = BASE/'inventory/costumes-fan-design-annexe.json'
annex = json.loads(annex_path.read_text()) if annex_path.exists() else {}
inventory['annexe_costumes_v22'] = annex
character_path = BASE/'inventory/characters-v1-reconciliation.json'
character_audit = json.loads(character_path.read_text()) if character_path.exists() else {}
if not args.allow_in_progress:
    assert character_audit and annex, 'Final character reconciliation and costume annex are required'
inventory['audit_personnages_v22'] = character_audit
for section in ('heroes', 'extensions'):
    mapping = {r['id']:r for r in character_audit.get(section, [])}
    for row in inventory[section]:
        reviewed = mapping.get(row['id'])
        if reviewed:
            row['audit_personnage_v22'] = reviewed
            row['raccord_catalogue_v22'] = reviewed.get('runtime_match_kind', '')
            row['correspondances_runtime_v22'] = reviewed.get('runtime_matches', [])
            row['note_rapprochement_v22'] = reviewed.get('note_v22', '')
        hold = next((r for r in reports['humans'].get('source_holds', []) if r.get('hero_id')==row['id']), None)
        if hold and not row['medias_v22']:
            row['attente_v22'] = hold
            row['statut_v22'] = 'SOURCE_HOLD'
            row['note_v22'] = hold.get('reason_fr') or hold.get('reason')

qualification_labels = {
    'candidat_statique_produit':'Candidat statique produit',
    'static_candidate':'Candidat statique', 'candidate_produced':'Candidat produit',
    'refus_outil_sans_png':'Refus outil — aucun PNG',
    'reference_a_reunir':'Référence complète à réunir',
    'historique_conserve':'Historique conservé',
    'SOURCE_HOLD':'Référence complète à réunir', 'source_hold':'Référence complète à réunir',
    'ARCHIVE_RECOVERY_HOLD':'Archive à récupérer', 'RECOVERY_HOLD':'Archive à récupérer',
    'EXISTING_V21_CANDIDATE_REUSE_REVIEW':'Candidat V21 — réutilisation à examiner',
    'preserved_v21_extra':'Master V21 conservé', 'preserved_v21_candidate':'Candidat V21 conservé',
    'partial_candidate':'Candidat partiel — séquences à produire',
    'visual_study_only':'Étude visuelle uniquement',
    'partial_static_candidate':'Candidat statique partiel',
    'base_overlap':'Recoupe la tenue de base',
    'BASE_OVERLAP':'Recoupe la tenue de base'
}
qualification_labels.update({
    'new_static_candidate':'Nouveau candidat statique',
    'new_tool_refusal_not_retried':'Refus outil — non relancé',
    'existing_v21_not_regenerated':'Existant V21 conservé',
    'historical_refusal_left_preserved_not_retried':'Refus historique gauche conservé',
    'base_incarnation_overlap_not_regenerated':'Recoupe la tenue de base',
    'effect_study_only':'Étude d’effet uniquement',
    'partial_candidate_and_refusal':'Candidat partiel et refus conservé',
    'simulation_and_source_hold':'Simulation à définir / référence à réunir'
})
inventory['qualification_labels_v22'] = qualification_labels
inventory['recovery_note_v22'] = 'Après interruption du calcul, les 80 PNG natifs ont été récupérés depuis leurs blobs Git et vérifiés identiques. Les rapports finaux et l’inventaire ont été reconstitués depuis les checkpoints, prompts et décisions conservés ; leurs nouvelles empreintes sont enregistrées.'
inventory['source_hashes']['v21_inventory_sha256'] = hashlib.sha256((V21/'inventory/INVENTAIRE_COMPLET_V21_20261124.json').read_bytes()).hexdigest()
inventory['source_hashes']['v22_manifest_sha256'] = hashlib.sha256((BASE/'ASSET_MANIFEST_V22.json').read_bytes()).hexdigest()
inventory['limites_v22'] = [
    'La fidélité 1:1 n’est certifiée pour aucun asset ; le cadrage, la pose et certaines surfaces sont reconstruits.',
    'Les fichiers sont statiques : zéro animation complète et zéro admission dans le moteur pour V22.',
    'Un PNG, une pose, un costume, une incarnation, un UID et une action sont des unités différentes.',
    'Les sources identifiées ou téléchargées ne sont pas toutes des références complètes ; les états de revue sont conservés par entrée.',
    'Les archives V3/V4 et les médias annoncés V12/V13/V19 restent partiellement non récupérés.',
    'Le catalogue de 38 variantes couvre huit incarnations ciblées, pas tous les costumes de la franchise.',
    'Les demandes refusées ne sont ni relancées sous une autre formulation, ni comptées comme des images livrées.'
]
write_json(BASE/'inventory/INVENTAIRE_COMPLET_V22_20261124.json', inventory)

def cell(value):
    if isinstance(value, (list, dict)): value = json.dumps(value, ensure_ascii=False)
    return str('—' if value is None or value=='' else value).replace('|', '\\|').replace('\n', '<br>')

def table(headers, rows):
    return '| '+' | '.join(headers)+' |\n| '+' | '.join('---' for _ in headers)+' |\n'+ '\n'.join('| '+' | '.join(cell(v) for v in row)+' |' for row in rows)+'\n'

def short_paths(paths):
    return '<br>'.join(Path(p).name for p in paths) or '—'

lines = [f'# Resident Evil Combat — inventaire complet V22\n\nÉtat du 24 novembre 2026. **{len(assets)} PNG V22 documentés ; aucune fidélité 1:1 ni animation complète certifiée.**\n',
         'Les listes ci-dessous distinguent les fichiers produits et les besoins restants. Les états historiques sont conservés dans le JSON et les onglets V21 du classeur.\n',
         '## Livraisons V22\n', table(['Catégorie','Candidats','Études','Essais'], [[cat,summary['by_category_and_status'][cat].get('static_candidate',0),summary['by_category_and_status'][cat].get('visual_study',0),summary['by_category_and_status'][cat].get('rejected_trial',0)] for cat in summary['by_category_and_status']]),
         table(['Asset','Nom / édition','État','Raccord','PNG'], [[a['asset_id'],a['name']+' — '+a['edition'],a['status'],a['runtime_id'] or a['spec_id'] or a['uid'] or a['catalogue_id'] or ', '.join(a['v1_actions']) or 'Complément d’arsenal',f"[PNG](../{a['path']})"] for a in assets]),
         '## Stages — 52 entrées runtime\n\nLe bitmap runtime et les masters candidats sont deux états distincts. Les 16 entrées RE5/V5/V21 sont conservées.\n',
         table(['ID','Lieu','État V22','Candidats V22','Besoin / observation'], [[r['id'],r['nom'],r['statut_v22'],short_paths(r['medias_v22']),r['note_v22']] for r in inventory['stages']]),
         '## Spécifications V1 — 24 lignes, non cumulables avec les arènes runtime\n',
         table(['ID','Lieu / édition','Raccord catalogue','Candidats V22','Observation'], [[r['id'],r['name']+' — '+r['edition'],r.get('catalogue_match'),short_paths(r['medias_v22']),r['note_v22']] for r in inventory['specifications_stages_v1_non_cumulees']]),
         '## Personnages / B.O.W. — 346 UID suivis\n\nLes 129 attentes de source V21 sont réexaminées dans le rapport creatures.json. Les 61 états de refus historiques restent conservés. Une entrée de catalogue ne prouve pas une absence globale.\n',
         table(['UID','Nom / édition','État historique','Observation V22','Candidats V22','Besoin ou motif précis'], [[r['uid'],r['nom']+' — '+r['edition'],r['statut'],r['statut_v22'],short_paths(r['medias_v22']),r['note_v22']] for r in inventory['bow']]),
         '## Personnages V1 — 24 fiches de finition\n',
         table(['ID','Personnage / édition','Corps V22','Raccord catalogue','Costumes V22 associés','Observation / besoin'], [[r['id'],r['nom']+' — '+r['edition'],short_paths(r.get('medias_v22',[])),r.get('raccord_catalogue_v22'),short_paths(r.get('variantes_costume_v22',[])),r.get('note_rapprochement_v22') or r['besoin']] for r in inventory['heroes']]),
         '## Extensions proposées — 60 lignes à dédoublonner\n\nAucune de ces propositions n’est automatiquement un nouveau personnage confirmé.\n',
         table(['ID','Nom / édition','État','Raccord catalogue','Observation / besoin'], [[r['id'],r['nom']+' — '+r['edition'],r['statut'],r.get('raccord_catalogue_v22'),r.get('note_rapprochement_v22') or r['besoin']] for r in inventory['extensions']]),
         '## Costumes — 38 variantes ciblées\n',
         table(['ID','Personnage / costume','Édition','État V22','PNG V22','Preuve / limites'], [[r['id'],r['personnage']+' — '+r['nom_releve'],r['edition'],r.get('status_v22'),short_paths([a['path'] if isinstance(a,dict) else a for a in r.get('v22_assets',[])]),r.get('note_v22') or r.get('statut_documentaire')] for r in variants]),
         '## Annexe — quatre Fan Design T-shirts\n\nQuatre motifs du pack RE0 HD sont documentés séparément des 38 variantes principales. Les descriptions ne sont pas présentées comme des noms officiels individuels.\n',
         table(['ID','Motif / description','PNG','Limites'], [[a['catalogue_id'],a['name'],f"[PNG](../{a['path']})",a['limitations']] for a in selected('costume') if str(a['catalogue_id']).startswith('COST_ANNEX_')]),
         '## Tenues de base — 24 descriptions\n',
         table(['ID','Personnage / édition','Description','Besoin'], [[r['id'],r['nom']+' — '+r['edition'],r['description'],r['besoin']] for r in inventory['costumes_base']]),
         '## Projectiles / VFX — 16 familles, 44 actions\n\nAucune famille ni action n’est complète. Le carreau simple de Leon est un complément distinct du carreau explosif d’Ada.\n',
         table(['Famille','Nom','Actions','État V22','Motif / reste à produire'], [[r['id'],r['nom'],len(r['actions']),r['statut_v22'],r['note_v22']] for r in inventory['projectile_families']]),
         table(['Action','Personnage / édition','Famille','Candidat / étude V22','État / motif'], [[r['id'],r['combattant']+' — '+r['edition'],r['famille_id'],short_paths(r.get('medias_v22',[])+r.get('etudes_v22',[])),r.get('note_famille_v22')] for r in inventory['projectile_actions']]),
         '## Refus V22 — aucun PNG\n',
         table(['Demande','Cible','Request ID','Rapport'], [[r.get('asset_id') or r.get('uid'),r.get('name') or r.get('costume') or r.get('edition'),r.get('request_id'),r['review_report']] for r in refusals]),
         '## Archives annoncées à récupérer\n',
         table(['Lot','Archive','Quantité annoncée','Observation'], [[r['lot'],r['nom'],r['quantite_annoncee'],r['observation']] for r in inventory['recovery']]),
         '## Limites de validation\n\n'+'\n'.join('- '+x for x in inventory['limites_v22'])+'\n',
         '## Sources\n\nChaque image possède ses liens et limites dans [ASSET_MANIFEST_V22.json](../ASSET_MANIFEST_V22.json). Les audits complets sont dans [stages](../reports/stage_target_audit.json), [créatures](../reports/creatures.json), [costumes](costumes-38-reconciliation.json) et [projectiles / VFX](projectiles-vfx-16-families.json). Les documents V21 restent consultables dans le dépôt à leur chemin historique.\n']
(BASE/'inventory/INVENTAIRE_COMPLET_V22_20261124.md').write_text('\n'.join(lines))

labels = {'stage':'Décors', 'creature':'Créatures', 'character':'Personnages', 'costume':'Costumes', 'projectile':'Projectiles / VFX'}
status_labels = {'static_candidate':'Candidat statique', 'visual_study':'Étude visuelle', 'rejected_trial':'Essai écarté'}
cards = []
for a in assets:
    e = html.escape
    refs = ''.join(f'<li><a href="{e(u,quote=True)}" target="_blank" rel="noreferrer">{e(u)}</a></li>' for u in a['sources'])
    limits = ''.join('<li>'+e(str(v))+'</li>' for v in a['limitations'])
    search = e(' '.join(str(v or '') for v in [a['name'],a['edition'],a['asset_id'],a['direction'],a['runtime_id'],a['uid'],a['catalogue_id']]).lower(),quote=True)
    cards.append(f'''<article class="card {a['category']}" data-category="{a['category']}" data-status="{a['status']}" data-search="{search}"><a class="picture" href="{a['path']}" target="_blank"><img src="{a['path']}" alt="{e(a['name'],quote=True)}" loading="lazy"></a><div class="info"><p class="eyebrow">{labels[a['category']]} · {e(a['direction'] or 'Vue unique')}</p><h2>{e(a['name'])}</h2><p>{e(a['edition'])}</p><p class="badge">{status_labels[a['status']]}</p><p class="dimensions">{a['dimensions'][0]} × {a['dimensions'][1]} px · {a['mode']}</p><details><summary>Références et limites</summary><ul>{limits}</ul><h3>Sources consultées</h3><ul class="sources">{refs}</ul><p class="hash">SHA-256 : {a['sha256']}</p><a href="{a['review_report']}">Rapport complet</a></details></div></article>''')
# Keep the already-reviewed V21 gallery's layout and interactions, extending its filters.
previous = (V21/'galerie.html').read_text()
style = re.search(r'<style>(.*?)</style>', previous, re.S).group(1)
style += '\nselect{padding:10px;border:1px solid #40464e;border-radius:8px;background:#20252b;color:#f2f4f5;font:inherit;margin:10px 0}.hash{overflow-wrap:anywhere;font-size:11px}.picture img{object-fit:contain}.stage .picture img{object-fit:contain}'
buttons = ''.join(f'<button type="button" data-filter="{key}" aria-pressed="{str(key=="all").lower()}">{value}</button>' for key,value in [('all','Tout'),*labels.items()])
page = f'''<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Resident Evil Combat — V22</title><style>{style}</style></head><body><header><p class="eyebrow">Production V22 · 24 novembre 2026</p><h1>Resident Evil Combat</h1><p>{summary['png_outputs']} PNG · {summary['static_candidates']} candidats statiques · {summary['visual_studies']} étude(s) · {summary['rejected_trials']} essai(s) · {len(refusals)} refus sans image.</p><p>Chaque sortie conserve sa taille native, ses références et ses limites. Fidélité 1:1, animations, calques et intégration restent à valider.</p><nav><a class="link" href="inventory/Resident_Evil_Combat_Inventaire_V22_20261124.xlsx">Inventaire Excel</a><a class="link" href="inventory/INVENTAIRE_COMPLET_V22_20261124.md">Liste complète</a><a class="link" href="ASSET_MANIFEST_V22.json">Manifeste</a><a class="link" href="https://github.com/darknigthmare/resident-evil-bow-protocol/pull/24">PR #24</a></nav></header><main><section class="toolbar" aria-label="Filtres"><label for="search">Rechercher un asset</label><input id="search" type="search" placeholder="Nom, édition, lieu ou identifiant…"><div class="filters">{buttons}</div><label for="status">Qualification </label><select id="status"><option value="all">Toutes les sorties</option value="static_candidate">Candidats statiques</option><option value="visual_study">Études visuelles</option><option value="rejected_trial">Essais écartés</option></select><p id="result" aria-live="polite"></p></section><section class="grid" aria-label="Images générées">{''.join(cards)}</section><p id="empty" hidden>Aucune image ne correspond à ces filtres.</p></main><footer>Ouvrir le PNG pour voir la sortie entière. Les essais et les études restent séparés des candidats. Aucun fichier de référence tiers n’est redistribué ici.</footer><script>
const cards=[...document.querySelectorAll('.card')],buttons=[...document.querySelectorAll('[data-filter]')],search=document.querySelector('#search'),status=document.querySelector('#status');let category='all';const norm=s=>s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();function update(){{let n=0;const q=norm(search.value.trim());for(const c of cards){{const show=(category==='all'||category===c.dataset.category)&&(status.value==='all'||status.value===c.dataset.status)&&norm(c.dataset.search).includes(q);c.hidden=!show;if(show)n++}}document.querySelector('#result').textContent=n+' image'+(n>1?'s':'')+' affichée'+(n>1?'s':'')+' / '+cards.length;document.querySelector('#empty').hidden=n>0}}for(const b of buttons)b.addEventListener('click',()=>{{category=b.dataset.filter;for(const item of buttons)item.setAttribute('aria-pressed',String(item===b));update()}});search.addEventListener('input',update);status.addEventListener('change',update);update();
</script></body></html>'''
(BASE/'galerie.html').write_text(page)

readme = f'''# Resident Evil Combat — V22

**{summary['png_outputs']} PNG natifs documentés : {summary['static_candidates']} candidats statiques, {summary['visual_studies']} étude(s) et {summary['rejected_trials']} essai(s) écarté(s).** {len(refusals)} demandes refusées n’ont produit aucun PNG. État du 24 novembre 2026 ; continuation de la [PR #24](https://github.com/darknigthmare/resident-evil-bow-protocol/pull/24), head antérieur à V22 `29b004d3ba9d03941e7e56a8f0871760be46a774`.

## Consulter les résultats

- [Galerie filtrable](galerie.html), à ouvrir avec le dossier `assets` à côté.
- [Inventaire complet lisible](inventory/INVENTAIRE_COMPLET_V22_20261124.md).
- [Classeur Excel](inventory/Resident_Evil_Combat_Inventaire_V22_20261124.xlsx).
- [Inventaire structuré](inventory/INVENTAIRE_COMPLET_V22_20261124.json).
- [Manifeste des sorties](ASSET_MANIFEST_V22.json) et [contrôle d’intégrité](reports/INTEGRITY_V22.json).

## Ce que ce lot apporte

{table(['Catégorie','Candidats','Études','Essais'], [[labels[cat],summary['by_category_and_status'][cat].get('static_candidate',0),summary['by_category_and_status'][cat].get('visual_study',0),summary['by_category_and_status'][cat].get('rejected_trial',0)] for cat in summary['by_category_and_status']])}
Les masters de scènes complètent {summary['runtime_stages_with_v22_candidate']} entrées runtime et {summary['v1_extra_specs_with_v22_candidate']} spécifications V1 supplémentaires. Les incarnations et costumes gardent leur édition précise. Les objets de RE0, RE2 remake, RE4 remake, RE5 et Code Veronica ne sont pas substitués les uns aux autres.

## Ce qui reste ouvert

Les listes détaillées couvrent 52 arènes runtime, 24 spécifications de scène V1, 346 UID suivis, 24 fiches de finition, 60 propositions d’extension, 24 tenues de base, 38 variantes de costume ciblées, quatre motifs Fan Design séparés et 44 actions réparties en 16 familles de projectiles/VFX. Ces unités se recoupent : aucun total global de « manquants » ni pourcentage d’achèvement de franchise n’est calculé. Les 32 PNG de costumes comprennent 28 variantes principales et quatre annexes.

Les fichiers sont des candidats de revue. **Zéro asset V22 est certifié 1:1, animé complètement ou admis dans le moteur.** Les décors ont été adaptés à un cadrage latéral ; les calques, les collisions, les zones cachées et la continuité des animations restent à produire ou vérifier. Les sources tronquées, les éditions incertaines et les archives annoncées non récupérées sont explicitement signalées.

Les 61 états de refus historiques B.O.W. et les autres refus documentés sont conservés. Les nouvelles demandes refusées ne sont pas reformulées pour être relancées. Les études et essais restent archivés sans augmenter la couverture candidate.

## Intégrité et historique

Chaque PNG est décodé et vérifié par dimensions, SHA-256 et SHA de blob Git. Les sprites possèdent un alpha utile ; les résidus éventuels sont signalés sans retouche silencieuse. Les sorties natives sont copiées inchangées. Les références tierces sont documentées par URL, sans redistribution de leurs bitmaps.

Les fichiers V21 et antérieurs, le moteur, les gardes et les workflows restent inchangés. La PR demeure en brouillon ; le relevé final de publication documente l’état CI observé. La garde cumulative avait un échec antérieur sur `production-archives/rec-media/CI_CHECKPOINT2_20261120.json` ; cela ne vaut pas validation CI du présent lot.

Les 80 PNG ont été restaurés à l’identique depuis leurs blobs Git après une interruption du calcul. Les rapports et l’inventaire ont été reconstitués depuis les checkpoints et les données de génération conservées ; leurs nouvelles empreintes ne sont pas confondues avec celles des fichiers temporaires antérieurs.

## Reproduire l’assemblage

Exécuter `python production-archives/rec-media/v22/assemble_delivery.py` depuis le dépôt une fois tous les rapports finalisés. Le classeur est produit séparément par `inventory/build_workbook.mjs` avec le runtime `@oai/artifact-tool`. Les scripts ne modifient aucun pixel ni aucun document historique.
'''
(BASE/'README.md').write_text(readme)
integrity = {'date':'2026-11-24','result':'PROVISIONAL' if in_progress else 'PASS',
             'verified_images':len(assets),'all_reports_finalized':not in_progress,'unreported_in_progress_png':unreported,
             'checks':['Every reported PNG decodes','Native dimensions match reports','SHA-256 matches reports','Git blob matches native bytes','Transparent sprites have useful alpha','Unique asset paths and IDs'],
             'not_tested':['Gameplay','Runtime integration','Complete animation','Geometric or pixel-level canonical 1:1 fidelity']}
write_json(BASE/'reports/INTEGRITY_V22.json', integrity)
print(json.dumps({'summary':summary,'reports_in_progress':in_progress,'unreported_in_progress_png':unreported},ensure_ascii=False,indent=2))
