#!/usr/bin/env python3
"""Assemble V23 metadata and the offline review gallery without changing PNG pixels."""
from pathlib import Path
from PIL import Image
import hashlib
import html
import json

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
BASE = '7c679b38c72ee4d34fd1c39d1dc8950dd4f506aa'
DATE = '2026-11-27'

def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def write_json(name, value):
    path = HERE / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def technical(relative):
    p = HERE / relative
    data = p.read_bytes()
    with Image.open(p) as im:
        im.load()
        assert im.mode == 'RGBA', (relative, im.mode)
        alpha = im.getchannel('A')
        low, high = alpha.getextrema()
        assert low == 0 and high > 128, relative
        bbox = alpha.point(lambda x: 255 if x >= 128 else 0).getbbox()
        hist = alpha.histogram()
        w, h = im.size
    margins = dict(left=bbox[0], top=bbox[1], right=w-bbox[2], bottom=h-bbox[3])
    return {
        'dimensions': [w, h], 'mode': 'RGBA', 'file_bytes': len(data),
        'sha256': hashlib.sha256(data).hexdigest(),
        'git_blob_sha': hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest(),
        'alpha_range': [low, high], 'fully_transparent_pixels': hist[0],
        'fully_opaque_pixels': hist[255], 'bbox_alpha_ge128': list(bbox),
        'margins_alpha_ge128_px': margins,
        'requested_eight_percent_margin_met': all(margins[k] >= .08*(w if k in ('left','right') else h) for k in margins),
        'anchor_proposal': {'x': (bbox[0]+bbox[2])/2, 'y': bbox[3],
                            'method': 'centre horizontal de la silhouette alpha>=128 / bas du contour',
                            'engine_approved': False},
        'image_pixels_modified_after_generation': False,
    }

v22 = json.loads((HERE.parent/'v22/ASSET_MANIFEST_V22.json').read_text())
sources = {a['asset_id']: a for a in v22['assets']}
prompt_jobs = []
for filename in ('barry_billy_seed.json','barry_billy_confirm_deselect.json','selected_cleanup.json'):
    prompt_jobs.extend(json.loads((HERE/'prompts'/filename).read_text()))
prompts = {j['id']: j for j in prompt_jobs}
common_limits = [
    'Geste de menu créé pour cette adaptation ; aucune source ne prouve une animation officielle Capcom identique.',
    'Une image par pose ; transitions, timing, pivots, échelle de jeu et admission moteur restent à produire/valider.',
    'Les contours gardent de fines franges colorées ; la correction de cadrage ne certifie pas leur nettoyage.',
    'Des variations de visage, de doigts, de détails et de taille de silhouette subsistent entre clés.',
]
configs = {
 'barry': {'prefix':'barry_rev2','hero':'REC_BARRY_REV2','name':'Barry Burton',
           'edition':'Resident Evil Revelations 2 (2015), tenue de mission fondée sur le rendu promotionnel 2014',
           'edition_key':'rerev2_2015_rescue_promo2014','source':'REC_BARRY_REV2_BASE_FULLBODY_FRONT_V22_01',
           'asymmetries':['Arme tenue à gauche anatomique ; petit objet non identifié dans la main droite.',
                          'Montre au poignet gauche ; placement des poches et de l’équipement conservé à vérifier sur modèle commercial.']},
 'billy': {'prefix':'billy_re0hd','hero':'REC_BILLY_RE0','name':'Billy Coen',
           'edition':'Resident Evil Zero HD Remaster (2016), tenue Prisoner',
           'edition_key':'re0_hd_2016_prisoner','source':'REC_BILLY_RE0HD_PRISONER_FULLBODY_FRONT_V22_01',
           'asymmetries':['Tatouage et pistolet à droite anatomique ; menotte ouverte au poignet gauche.',
                          'Ne ferme pas la fiche RE0 GameCube 2002 ni une orientation opposée.']},
}
notes = {
 'barry_selected':['Tête relevée et objet près du torse ; cadrage amélioré à la deuxième génération.',
                   'La silhouette complète et les équipements principaux restent visibles.'],
 'barry_confirm':['Inclinaison de la tête, buste prêt, petit objet descendu près de la ceinture.',
                  'Pose de confirmation discrète ; pas de changement d’arme ou de main.'],
 'barry_deselect':['Bras droit abaissé et épaules relâchées ; regard réel vers la droite de l’image.',
                   'La demande indiquait la gauche de l’image ; ce résultat ne valide pas cette direction demandée.'],
 'billy_selected':['Main gauche posée devant le bas du torse, menotte visible ; cadrage amélioré.',
                   'Le tatouage et le pistolet restent du côté droit anatomique.'],
 'billy_confirm':['Main gauche ouverte levée en signe discret ; menotte suspendue à ce même poignet.',
                  'Geste distinct, pistolet droit maintenu vers le bas.'],
 'billy_deselect':['Bras gauche abaissé, tête et regard vers la droite de l’image.',
                   'Corps entier, tenue et asymétries principales conservées.'],
}
assets = []
for subject, cfg in configs.items():
    source = sources[cfg['source']]
    source_rel = 'production-archives/rec-media/v22/' + source['path']
    source_sha = digest(ROOT/source_rel)
    for state in ('selected','confirm','deselect'):
        prompt_id = f'{subject}_{state}' + ('_v2' if state == 'selected' else '')
        path = f'assets/{cfg["prefix"]}_{state}_v23.png'
        ref = source_rel if state != 'selected' else f'production-archives/rec-media/v23/assets/trials/{cfg["prefix"]}_selected_initial_v23.png'
        item = {
            'asset_id':f'REC_{cfg["prefix"].upper()}_{state.upper()}_KEY_V23',
            'hero_id':cfg['hero'], 'name':cfg['name'], 'category':'animation_key',
            'state':state, 'edition':cfg['edition'], 'edition_key':cfg['edition_key'],
            'path':path, 'direction':'three_quarter_front', 'status':'animation_key_candidate',
            'source_kind':'generated_edit', 'tool':'image_gen.imagegen', 'generation_mode':'edit',
            'reference_asset':ref, 'reference_asset_sha256':digest(ROOT/ref),
            'v22_base_asset':source_rel, 'v22_base_sha256':source_sha,
            'sources':source['sources'], 'source_limitations':source['limitations'],
            'asymmetries':cfg['asymmetries'], 'prompt_id':prompt_id, 'prompt':prompts[prompt_id]['prompt'],
            'visual_review':notes[f'{subject}_{state}'], 'limitations':common_limits,
            'canonical_fidelity_1_1_certified':False, 'animation_complete':False, 'engine_admitted':False,
            'review_report':'reports/INDEPENDENT_VISUAL_REVIEW_V23.json',
            **technical(path),
        }
        if subject == 'barry' and state == 'confirm':
            item['recovery_note'] = 'PNG récupéré depuis les octets exacts de la réponse image_gen après échec temporaire de sauvegarde ; aucune modification de pixels.'
        assets.append(item)

rebecca = json.loads((HERE/'reports/rebecca.json').read_text())
for item in rebecca['assets']:
    item = dict(item)
    item['name'] = 'Rebecca Chambers'
    item['edition_key'] = 're0_hd_2016_stars'
    item['v22_base_asset'] = item['reference_asset']
    item['v22_base_sha256'] = item['reference_asset_sha256']
    item['source_kind'] = 'generated_edit'
    item.update(technical(item['path']))
    assets.append(item)

for subject, cfg in configs.items():
    source = sources[cfg['source']]
    path = f'assets/trials/{cfg["prefix"]}_selected_initial_v23.png'
    assets.append({
        'asset_id':f'REC_{cfg["prefix"].upper()}_SELECTED_INITIAL_TRIAL_V23',
        'hero_id':cfg['hero'], 'name':cfg['name'], 'category':'animation_key', 'state':'selected',
        'edition':cfg['edition'], 'edition_key':cfg['edition_key'], 'path':path,
        'status':'superseded_trial', 'superseded_by':f'assets/{cfg["prefix"]}_selected_v23.png',
        'source_kind':'generated_edit', 'tool':'image_gen.imagegen', 'generation_mode':'edit',
        'reference_asset':'production-archives/rec-media/v22/'+source['path'],
        'reference_asset_sha256':digest(HERE.parent/'v22'/source['path']),
        'sources':source['sources'], 'source_limitations':source['limitations'],
        'prompt':prompts[f'{subject}_selected']['prompt'],
        'limitations':['Premier essai conservé pour traçabilité : cadrage trop serré et écart de taille avec les clés suivantes.']+common_limits,
        'canonical_fidelity_1_1_certified':False, 'animation_complete':False, 'engine_admitted':False,
        **technical(path),
    })

assert len(assets) == 11
assert len({a['sha256'] for a in assets}) == 11
assert all(a['sha256'] != a['reference_asset_sha256'] for a in assets)
manifest = {
    'schema':'rec-v23-media-1', 'project':'Resident Evil Combat / B.O.W. Protocol',
    'date':DATE,'timezone':'Europe/Paris','repository':'darknigthmare/resident-evil-bow-protocol',
    'pull_request':24,'base_head':BASE,
    'v22_manifest_sha256':digest(HERE.parent/'v22/ASSET_MANIFEST_V22.json'),
    'summary':{'png_total':11,'candidate_keys':9,'superseded_trials':2,'identities':3,
               'complete_animations':0,'new_engine_admissions':0,'tool_refusals':0},
    'scope':'Clés visuelles de sélection, confirmation et désélection. Guide général et deux extensions intégrés séparément dans docs/combat-bible/.',
    'all_requested_content_complete':False, 'canonical_fidelity_1_1_certified':False,
    'historical_records_rewritten':False,'assets':assets,
}
write_json('ASSET_MANIFEST_V23.json',manifest)
write_json('reports/barry_billy.json',{'schema':'rec-v23-barry-billy-1','date':DATE,
    'base_commit':BASE,'assets':[a for a in assets if a['name']!='Rebecca Chambers'],
    'summary':{'png_total':8,'candidate_keys':6,'superseded_trials':2,'refusals':0}})

families=[]
for hero in ('REC_BARRY_REV2','REC_BILLY_RE0','REC_REBECCA_RE0'):
    keys=[a for a in assets if a['hero_id']==hero and a['status']=='animation_key_candidate']
    families.append({'hero_id':hero,'edition_key':keys[0]['edition_key'],
        'keys':[{k:a[k] for k in ('asset_id','state','path','dimensions','bbox_alpha_ge128','anchor_proposal')} for a in keys],
        'sequence_complete':False,'timeline_implemented':False,
        'pending':['Fixer une échelle et un ancrage communs après revue de costume et de proportions.',
                   'Nettoyer les contours avec une source visuelle qualifiée.',
                   'Produire transitions et retour sans saut ; une sélection manuelle de clés ne les remplace pas.',
                   'Tester annulation, changement rapide de sélection, chargement tardif et animations réduites dans le montage réel.']})
write_json('SELECTION_KEYS_V23.json',{'schema':'rec-selection-key-map-1','date':DATE,'families':families})

queue={
    'schema':'rec-v23-continuation-1','base_inventory':'../v22/inventory/INVENTAIRE_COMPLET_V22_20261124.json',
    'date':DATE,'new_completed_scope':'9 clés fixes candidates + intégration documentaire des 68 sections ; aucune fermeture de personnage complet.',
    'tasks':[
       {'id':'REC-V23-GUIDES','status':'integrated_documentation','path':'../../../docs/combat-bible/README.md','scope':'Guide général + deux extensions sources et applications Resident Evil.'},
       {'id':'REC-V23-KEYS','status':'produced_reviewed_candidates','path':'ASSET_MANIFEST_V23.json','scope':'Trois états × trois incarnations ; 2 essais remplacés séparés.'},
       {'id':'REC-V23-UNLOCK','status':'isolated_prototype','path':'prototype/index.html','scope':'Droits/découverte/disponibilité/compatibilité ; démonstration, pas progression du jeu.'},
       {'id':'REC-V23-ANIMATION','status':'open','path':'SELECTION_KEYS_V23.json','scope':'Transitions, taille, pivots, nettoyage alpha, événements et raccord dans le moteur.'},
       {'id':'REC-V23-TAG','status':'specified_not_implemented','scope':'Assistance, tag, supers duo et finishers ; aucune nouvelle simulation ni replay de tag.'},
       {'id':'REC-V23-REWARDS','status':'specified_not_connected','scope':'Persistance réelle, backend de droits et éventuels abonnements ; aucun achat opérationnel.'},
       {'id':'REC-V19-RECOVERY','status':'historical_recovery_open','scope':'Lepotitsa, Shrieker, Zombie Dog C, Ubistvo : archives non retrouvées, ne pas compter comme publiées.'},
       {'id':'REC-V22-REMAINING','status':'historical_backlog_preserved','scope':'Autres personnages, costumes, stages et 44 actions projectile restent régis par leur inventaire V22 ; aucune fermeture par ces clés de menu.'},
    ],
    'fidelity_scope':'Les gestes sont des adaptations compatibles ; HD2016 ne certifie pas GameCube2002. Les sources pré-sortie Barry ne certifient pas tous les détails commerciaux2015.',
}
write_json('WORK_QUEUE_V23.json',queue)

template=(HERE/'galerie.template.html').read_text(encoding='utf-8')
data=json.dumps(manifest,ensure_ascii=False).replace('</','<\\/')
(HERE/'galerie.html').write_text(template.replace('__MANIFEST__',data),encoding='utf-8')
print(json.dumps(manifest['summary'],ensure_ascii=False))
