"""Rebuild the V1 character reconciliation from restored, versioned evidence.

This recovery edition performs a metadata audit. It does not regenerate media,
decode PNGs, change historical records, or claim byte identity with the lost report.
Run from the repository/workspace root after the generation reports are restored.
"""
from pathlib import Path
from collections import Counter
import hashlib
import json

ROOT = Path.cwd()
BASE = Path(__file__).absolute().parent.parent
PREFIX = 'production-archives/rec-media/v22/'
HEAD = '29b004d3ba9d03941e7e56a8f0871760be46a774'
INPUTS = {
    'v1': ROOT/'audit_production/production_v1_extracted.json',
    'v21': BASE.parent/'v21/inventory/INVENTAIRE_COMPLET_V21_20261124.json',
    'runtime': ROOT/'audit_repository/re-data-parsed-recovered.json',
    'runtime_js': ROOT/'audit_repository/re-data-current-recovered.js',
    'decisions': BASE/'inventory/characters-v1-match-decisions.json',
    'assets_tree': BASE/'reports/repository_assets_tree_snapshot.json',
    'archives_tree': BASE/'reports/repository_production_tree_snapshot.json',
    'v5': BASE/'reports/production_status_v5_snapshot.json',
    'humans': BASE/'reports/humans.json',
    'creatures': BASE/'reports/creatures.json',
    'costumes': BASE/'reports/costumes.json',
    'costume_audit': BASE/'inventory/costumes-38-reconciliation.json',
}
data = {k:json.loads(p.read_text()) for k,p in INPUTS.items() if k!='runtime_js'}
v1,v21,runtime,decisions = (data[k] for k in ('v1','v21','runtime','decisions'))
catalog={r['id']:r for r in runtime['catalog']}
fighters={r['uid']:r for r in runtime['fighters']}
assert len(catalog)==389 and len(fighters)==115 and set(fighters)<=set(catalog)
assert len(decisions)==26
historical={r['id']:r for section in ('heroes','extensions') for r in v21[section]}
bow={r['uid']:r for r in v21['bow']}
trees={}
for key,prefix in [('assets_tree','assets/'),('archives_tree','production-archives/')]:
    assert data[key]['truncated'] is False
    trees.update({prefix+r['path']:r for r in data[key]['tree'] if r.get('type')=='blob'})

def fullpath(path):
    return path if path.startswith('production-archives/') else PREFIX+path

def asset_record(row,relation,report):
    p=fullpath(row['path'])
    return {k:v for k,v in {
        'asset_id':row['asset_id'],'path':p,'relation':relation,
        'edition':row.get('edition') or row.get('game'),'status':row.get('status'),
        'sha256':row.get('sha256'),'git_blob_sha':row.get('git_blob_sha'),
        'report':PREFIX+'reports/'+report+'.json','hero_id':row.get('hero_id'),
        'uid':row.get('uid'),'catalogue_id':row.get('catalogue_id'),
        'dimensions':row.get('dimensions'),'source_page':row.get('source_page'),
        'local_file_present_at_reconstruction':(ROOT/p).exists(),
        'integrity_evidence':'Empreintes du rapport restauré ; aucun nouveau décodage PNG dans cette reconstruction.',
        'engine_admitted':False,'animation_complete':False,'canonical_one_to_one_certified':False,
    }.items() if v is not None}

def archive_record(path,relation,evidence,edition=None):
    tree=trees.get(path)
    trial='/essais/' in path or 'trial' in path.lower()
    return {'path':path,'relation':relation,'edition':edition,
            'status':'rejected_trial' if trial else 'historical_static_media',
            'evidence':evidence,'git_tree_path_verified':bool(tree),
            'git_blob_sha':tree.get('sha') if tree else None,'bytes':tree.get('size') if tree else None,
            'visually_reinspected_in_this_character_audit':False,
            'closes_base_incarnation':False,'animation_complete':False}

KNOWN={
    'RES_PARKER_LUCIANI':[(f'v21/assets/parker_revelations_hd2013_wetsuit_{d}.png','same_edition_static_candidate','Revelations HD PC 2013') for d in ('left','right')],
    'RES_JESSICA_SHERAWAT':[(f'v21/assets/jessica_revelations_hd2013_scuba_{d}.png','same_edition_static_candidate' if 'trial' not in d else 'rejected_trial','Revelations HD PC 2013') for d in ('left','portrait','right','right_trial01')],
    'RES_RAYMOND_VESTER':[(f'v5/{folder}/REC_RAYMOND_REVHD_PC2013_{name}.png','same_edition_static_candidate' if folder=='assets' else 'rejected_trial','Revelations HD PC 2013') for folder,name in [('assets','IDLE_LEFT_V5_01'),('assets','PORTRAIT_V5_03'),('essais','PORTRAIT_V5_01'),('essais','PORTRAIT_V5_02')]],
    'REC_ALCINA_RE8':[(f'v5/{folder}/REC_ALCINA_VILLAGE_IDLE_LEFT_V5_{n}.png','same_edition_static_candidate' if folder=='assets' else 'rejected_trial','Village 2021') for folder,n in [('assets','02'),('essais','01')]],
    'RES_LUIS_SERRA_NAVARRO':[('v21/assets/luis_re4_original2005_right.png','different_edition_2005_not_2023','Resident Evil 4 original 2005')],
    'REC_CHRIS_RE5':[(f'v21/assets/REC_CHRIS_RE5_SAFARI_IDLE_{d}_V21_01.png','alternative_costume_not_base','RE5 Safari 2009') for d in ('LEFT','RIGHT')],
    'REC_JILL_RE3R':[(f'v14/assets/REC_JILL_VALENTINE_RE5_BATTLESUIT_FULLBODY_{d}_V14_01.png','different_edition_and_costume_RE5_not_RE3R','RE5 P30 2009') for d in ('LEFT','RIGHT')],
}
V5_REFUSALS={
    'sheva_business_left':('REC_SHEVA_RE5','alternative_costume_business_not_base'),
    'moira_left':('RES_MOIRA_BURTON','same_incarnation_direction_left'),
    'chris_re5_left':('REC_CHRIS_RE5','same_incarnation_direction_left'),
    'wesker_re5_human_right':('REC_WESKER_RE5','same_incarnation_direction_right'),
    'carlos_re3_remake_left':('REC_CARLOS_RE3R','same_incarnation_direction_left'),
}
NOTES={
    'RES_ETHAN_WINTERS':'La fiche V1 impose de ne pas inventer le visage. Distinguer le modèle du jeu 2017 de Village 2021 et des vues non officielles.',
    'RES_ZOE_BAKER':'Distinguer Zoe humaine du récit principal et les états spécifiques des DLC Gold ; son rôle narratif V1 ne confirme pas un combattant nouveau.',
    'RES_JOE_BAKER':'Documenter le modèle complet de End of Zoe dans RE7 Gold 2017, avec la tenue et l’équipement de cette incarnation.',
    'RES_MORPHEUS_D_DUVALL':'La fiche demande la mutation électrique de Dead Aim, pas automatiquement sa forme humaine ; fixer la phase et ses références entières.',
    'RES_HYPNOS_T_TYPE':'Les phases anatomiques de Survivor restent distinctes ; une simple identité V1 ne fixe aucune phase exacte.',
    'RES_SERGEI_VLADIMIR':'La forme humaine de The Umbrella Chronicles et sa mutation ont des besoins distincts.',
    'RES_IVAN':'Fixer la variante de Tyrant Ivan et son équipement dans The Umbrella Chronicles ; ne pas assimiler les autres Tyrants.',
    'RES_JAVIER_HIDALGO':'Séparer Javier humain, son rôle narratif et les organismes du boss de The Darkside Chronicles.',
    'RES_ASHLEY_GRAHAM':'V1 vise RE4 Remake 2023 : choisir sa tenue source, conserver son rôle coopératif et ne pas inventer un arsenal.',
    'RES_MARCHAND':'V1 vise le Marchand de RE4 Remake 2023 ; son rôle boutique/épreuves ne prouve pas un nouveau combattant à générer.',
    'RES_GRACE_ASHCROFT':'La fiche V1 est réservée à Requiem : fixer les références commerciales de cette incarnation, la tenue et l’arsenal avant conception. Ne pas assimiler Alyssa.',
    'RES_ALFRED_ASHFORD':'Fixer Alfred dans CODE Veronica X 2001 ; les références de CODE Veronica 2000 ou d’une autre édition ne ferment pas automatiquement la cible.',
    'RES_SAMUEL_JORDAN':'V4 annonce 12 frames droites de Samuel, non récupérées ici. Récupérer, identifier et comparer cette animation annoncée avant toute nouvelle série.',
    'RES_LUIS_SERRA_NAVARRO':'Le candidat V21 est Luis original 2005. Luis RE4 Remake 2023 demeure un besoin d’édition à qualifier, avec récupération des archives et vue complète 2023 avant décision de génération.',
    'REC_REBECCA_RE0':'Le candidat V22 utilise RE0 HD Remaster 2016. V1 cite RE0 original 2002 avec référence HD à verrouiller ; cette décision d’édition reste explicite.',
    'REC_BILLY_RE0':'Le candidat V22 utilise RE0 HD Remaster 2016. V1 cite RE0 original 2002 avec référence HD à verrouiller ; cette décision d’édition reste explicite.',
}

def runtime_record(uid,relation):
    r=catalog[uid];f=fighters.get(uid,{})
    paths=list(dict.fromkeys(p for p in (r.get('portrait'),r.get('sprite'),f.get('portrait'),f.get('sprite')) if p))
    return {'uid':uid,'name':r['name'],'edition':r['game'],'relation':relation,
            'selected_in_fighters':uid in fighters,'source_page':r.get('sourcePage'),
            'media':[{'path':p,'git_tree_path_verified':p in trees,'git_blob_sha':trees.get(p,{}).get('sha')} for p in paths],
            'reported_asset_usage':r.get('assetUsage'),'reported_asset_status':r.get('assetStatus'),
            'scope':'Correspondance d’identité/édition d’après les libellés ; anatomie, détails, pose et fidélité non recertifiés.'}

variants={r['id']:r for r in data['costume_audit']['variants']}
hero_holds={r['hero_id']:r for r in data['humans'].get('source_holds',[]) if r.get('hero_id')}
creature_holds={r['uid']:r for r in data['creatures'].get('source_holds',[]) if r.get('uid')}
HERO_HOLD_DETAIL={
    'REC_SHERRY_RE6':'Fixer la tenue agent (Edonia/Chine), puis obtenir des vues entières du modèle commercial : veste, col, ceinture, holster, pantalon et chaussures. Les captures inspectées sont tronquées, petites ou masquées ; les autres galeries identifiées n’ont pas fourni de référence exploitable dans cette collecte.',
    'REC_JAKE_RE6':'Fixer la tenue mercenaire (Edonia/Chine), puis obtenir une vue entière lisible : tête, encolure, vêtements, gants, ceinture et chaussures. Les captures inspectées sont tronquées, petites ou masquées ; les autres galeries identifiées n’ont pas fourni de référence exploitable dans cette collecte.',
    'REC_PIERS_RE6':'Obtenir la forme humaine BSAA avant mutation, tenue Edonia ou Chine explicitement choisie ; corps entier avec équipement et deux bras humains visibles. Les captures inspectées sont tronquées, petites ou masquées ; les autres galeries identifiées n’ont pas fourni de référence exploitable dans cette collecte.',
}
def hero_hold_reason(rid):
    h=hero_holds[rid]
    return HERO_HOLD_DETAIL.get(rid) or h.get('reason') or h.get('reason_fr') or h.get('specific_need_or_hold_reason') or 'Référence complète de la forme et de la tenue à qualifier.'

def build_row(row):
    rid=row['id'];hist=historical[rid]
    match=decisions.get(rid,{'kind':'NOT_LISTED_IN_FIGHTERS_OR_CATALOGUE','exact':[],'related':[],
        'note':'Aucun raccord d’identité observé dans les 115 fighters et les 389 entrées du catalogue inspectés. Cela ne prouve pas une absence dans les autres modules ou archives.'})
    exact,related=match['exact'],match['related']
    for uid in exact+related:assert uid in catalog,(rid,uid)
    refs=[]
    if hist.get('statut')=='refus historique':
        refs.append({'source':'V21 conservant V1/V5','relation':'same_requested_incarnation','status':'HISTORICAL_REFUSAL','reason':hist.get('historique'),'retry_authorized_by_this_audit':False})
    for r in data['v5']['prioritized_character_gaps']:
        mapped=V5_REFUSALS.get(r['id'])
        if mapped and mapped[0]==rid and r['status']=='tool_refusal':
            refs.append({'source':'V5','relation':mapped[1],'status':r['status'],'attempt':r.get('attempt'),'retry_authorized_by_this_audit':False})
    if rid=='REC_KRAUSER_RE4R':
        refs.append({'source':'V5 held_character_gaps','relation':'same_requested_incarnation','status':'historical_explicit_refusal','reason':'Aucune relance, y compris costume alternatif ou recadrage.','retry_authorized_by_this_audit':False})
    for uid in exact+related:
        b=bow.get(uid,{})
        if b.get('refus_historique_conserve'):
            refs.append({'source':'V18–V21 BOW','uid':uid,'relation':'exact_incarnation' if uid in exact else 'related_edition_or_form','status':b.get('statut_v18'),'reason':b.get('besoin'),'retry_authorized_by_this_audit':False})
    archives=[archive_record('production-archives/rec-media/'+p,rel,'Rapports V5/V21 et arbre Git production vérifié',ed) for p,rel,ed in KNOWN.get(rid,[])]
    seen={a['path'] for a in archives}
    for uid in exact+related:
        for a in bow.get(uid,{}).get('medias_references',[]):
            p=a['chemin']
            if p not in seen:
                seen.add(p);archives.append(archive_record(p,'same_edition_static_candidate' if uid in exact else 'related_form_or_edition_static_media','Raccord UID explicite dans le registre BOW V21',catalog[uid]['game']))
    linked=[]
    for a in data['humans']['assets']:
        if a.get('hero_id')==rid:
            rel='HD2016_reference_for_V1_2002_to_lock' if rid in ('REC_REBECCA_RE0','REC_BILLY_RE0') else 'same_edition_base_static_candidate'
            linked.append(asset_record(a,rel,'humans'))
    for a in data['creatures']['assets']:
        if a.get('uid') in exact+related:
            linked.append(asset_record(a,'same_catalogue_incarnation_static_candidate' if a['uid'] in exact else 'one_related_form_only','creatures'))
    costumes=[];annex_costumes=[];costume_refusals=[]
    for a in data['costumes']['assets']:
        if variants.get(a.get('catalogue_id'),{}).get('fiche_v1')==rid:
            costumes.append(asset_record(a,'alternative_costume_not_base_completion','costumes'))
        elif rid=='REC_REBECCA_RE0' and a.get('character')=='Rebecca Chambers' and a.get('catalogue_id','').startswith('COST_ANNEX_FAN_DESIGN_'):
            annex_costumes.append(asset_record(a,'HD2016_fan_design_annex_not_base_completion','costumes'))
    for a in data['costumes'].get('refusals',[]):
        if variants.get(a.get('catalogue_id'),{}).get('fiche_v1')==rid:
            costume_refusals.append({k:a.get(k) for k in ('asset_id','catalogue_id','status','character','costume')})
    holds=[]
    if rid in hero_holds:
        holds.append({**hero_holds[rid],'specific_need_restored_from_pre_loss_review':hero_hold_reason(rid)})
    for uid in exact+related:
        if uid in creature_holds:
            h=creature_holds[uid]
            holds.append({k:h[k] for k in ('uid','status','reason','reason_fr','specific_need_or_hold_reason','source_page','reference_visually_inspected','full_body_qualified') if k in h})
    strong=any(r['relation'] in ('same_requested_incarnation','exact_incarnation','same_incarnation_direction_left','same_incarnation_direction_right') for r in refs)
    archive_candidates=[a for a in archives if a['relation']=='same_edition_static_candidate' and a['status']!='rejected_trial']
    if strong:
        status,decision='HISTORICAL_REFUSAL_PRESERVED','Conserver le refus documenté, les médias déjà attestés et sa portée exacte ; aucune relance proposée.'
    elif rid in hero_holds:
        status,decision='SOURCE_HOLD',hero_hold_reason(rid)
    elif linked:
        if rid in ('REC_REBECCA_RE0','REC_BILLY_RE0'):
            status,decision='V22_STATIC_CANDIDATE_HD_EDITION_TO_LOCK',NOTES[rid]
        elif any(a['relation']=='one_related_form_only' for a in linked):
            status,decision='V22_FORM_CANDIDATE_ONLY','Une forme candidate V22 est rattachée ; les autres états ou postures restent distincts.'
        else:
            status,decision='V22_STATIC_CANDIDATE','Vue statique V22 rattachée à cette fiche ; aucune animation complète ni admission moteur déduite.'
    elif archive_candidates:
        status,decision='ARCHIVE_STATIC_CANDIDATE_PRESENT','Des vues statiques de la même incarnation sont attestées dans les archives ; les récupérer et vérifier avant de produire un doublon.'
    elif rid=='RES_SAMUEL_JORDAN':
        status,decision='ARCHIVE_RECOVERY_HOLD',NOTES[rid]
    elif exact:
        status,decision='EXACT_CATALOGUE_INCARNATION_PRESENT','L’incarnation est déjà identifiée dans le catalogue ; évaluer ses vues et le besoin concret sans créer une nouvelle identité.'
    elif related:
        status,decision='FORM_OR_EDITION_RECONCILIATION',match['note']
    elif archives:
        status,decision='OTHER_EDITION_ARCHIVE_PRESENT',NOTES.get(rid,'Un média d’une autre incarnation est attesté ; il ne ferme pas cette fiche.')
    else:
        status,decision='NOT_OBSERVED_IN_AUDITED_LISTS_ARCHIVE_REVIEW_REQUIRED','Pas de raccord observé dans les listes et arbres inspectés ; récupérer V3/V4 et documenter l’incarnation avant de conclure à une nouvelle image nécessaire.'
    notes=[match['note']]
    if rid in NOTES:notes.append(NOTES[rid])
    if hist.get('historique'):notes.append(hist['historique'])
    if rid=='RES_MOTHER_MIRANDA':notes.append('Le candidat V22 représente la tenue cérémonielle frontale ; il ne clôt pas la forme mutée ni toutes les postures biologiques.')
    if costume_refusals:notes.append('Des refus V22 concernent des costumes précis ; ils restent séparés de la tenue de base.')
    if not exact and not related and archive_candidates:
        notes.append('L’absence de raccord dans re-data est compensée par des médias d’archive attestés ; cette proposition ne doit pas être comptée comme personnage neuf.')
    if strong:
        remaining='Conserver le refus et revoir uniquement les fichiers déjà disponibles ; ne pas relancer la demande refusée.'
    elif rid in hero_holds:remaining=hero_hold_reason(rid)
    elif rid=='RES_SAMUEL_JORDAN':remaining=NOTES[rid]
    elif linked or archive_candidates:
        remaining='Vérifier les vues candidates, l’édition et le costume exacts ; identifier les directions réellement absentes après récupération des archives, puis animation et intégration comme travaux distincts.'
    elif related or archives:
        remaining=NOTES.get(rid,match['note'])+' Récupérer V3/V4 et réunir une référence complète de la forme/édition retenue avant toute décision de génération.'
    else:
        remaining=NOTES.get(rid,f"Fixer la tenue et les vues de {row['name']} dans {row['edition']}.")+' Comparer V3/V4 et les autres modules non inspectés ; la source d’identité V1 ne vaut pas référence anatomique complète.'
    if refs and not strong:remaining+=' Les refus des autres formes, éditions ou costumes restent conservés ; aucune relance implicite.'
    return {
        'id':rid,'name':row['name'],'edition':row['edition'],'source_sheet':row['source_sheet'],'source_row':row['source_row'],
        'v1_signature':row.get('signature'),'v1_costume':row.get('costume'),'v1_source_ids':row.get('source_ids'),'v1_source_text':row.get('source_text'),
        'historical_status_v21':hist.get('statut'),'historical_note_v21':hist.get('historique'),
        'status_v22':status,'decision':decision,'runtime_match_kind':match['kind'],
        'runtime_matches':[runtime_record(u,'same_incarnation_label') for u in exact]+[runtime_record(u,'related_form_or_edition') for u in related],
        'archive_matches':archives,'v22_candidates':[a for a in linked if a['relation']!='one_related_form_only'],
        'v22_related_form_candidates':[a for a in linked if a['relation']=='one_related_form_only'],
        'v22_alternative_costumes':costumes,'v22_annex_costumes':annex_costumes,
        'historical_refusals':refs,'v22_related_costume_refusals':costume_refusals,'v22_source_holds':holds,
        'note_v22':' '.join(notes),'remaining_need':remaining,
        'new_identity_confirmed':False,'global_absence_confirmed':False,'manque_image_confirme':False,
        'new_generation_ready_by_this_audit':False,'canonical_one_to_one_certified':False,
        'animation_complete_certified':False,'engine_admitted_by_this_audit':False,
    }

heroes=[build_row(r) for r in v1['fighters']]
extensions=[build_row(r) for r in v1['extension_candidates']]
rows=heroes+extensions
assert len(heroes)==24 and len(extensions)==60 and len({r['id'] for r in rows})==84
assert all(a['git_tree_path_verified'] for r in rows for a in r['archive_matches'])
assert all(p['git_tree_path_verified'] for r in rows for m in r['runtime_matches'] for p in m['media'])
finalized=all(data[k].get('generation_complete') is True for k in ('humans','creatures','costumes'))
summary={
    'v1_hero_sheets':24,'v1_extension_proposals':60,'v1_rows_total':84,
    'selected_fighters':115,'catalogue_entries':389,'fighters_catalogue_overlap':115,'fighters_catalogue_union':389,
    'exact_catalogue_incarnation_rows':sum(bool(decisions.get(r['id'],{}).get('exact')) for r in rows),
    'related_incarnation_only_rows':sum(bool(decisions.get(r['id'],{}).get('related')) and not bool(decisions.get(r['id'],{}).get('exact')) for r in rows),
    'no_runtime_catalogue_match_observed_rows':sum(not r['runtime_matches'] for r in rows),
    'status_counts':dict(Counter(r['status_v22'] for r in rows)),
    'heroes_status_counts':dict(Counter(r['status_v22'] for r in heroes)),
    'extensions_status_counts':dict(Counter(r['status_v22'] for r in extensions)),
    'v22_human_candidates':sum(sum(a['report'].endswith('/humans.json') for a in r['v22_candidates']) for r in heroes),
    'v22_human_candidates_using_HD2016_for_V1_2002':sum(sum(a['relation']=='HD2016_reference_for_V1_2002_to_lock' for a in r['v22_candidates']) for r in heroes),
    'v22_related_form_candidates_for_heroes':sum(len(r['v22_related_form_candidates']) for r in heroes),
    'v22_form_candidates_for_extensions':sum(len(r['v22_related_form_candidates']) for r in extensions),
    'linked_main_costume_candidates':sum(len(r['v22_alternative_costumes']) for r in rows),
    'linked_annex_costume_candidates':sum(len(r['v22_annex_costumes']) for r in rows),
    'rows_with_any_historical_refusal':sum(bool(r['historical_refusals']) for r in rows),
    'rows_with_same_incarnation_archive_candidates':sum(any(a['relation']=='same_edition_static_candidate' and a['status']!='rejected_trial' for a in r['archive_matches']) for r in rows),
    'v21_historical_bow_refusal_states_preserved':sum(bool(r.get('refus_historique_conserve')) for r in v21['bow']),
    'global_missing_characters_confirmed':0,'new_identities_confirmed':0,'new_generation_ready_from_this_audit':0,
    'canonical_one_to_one_certifications':0,'complete_animation_certifications':0,
    'counting_note':'Correspondances, médias, costumes et refus sont des dimensions différentes et se recoupent ; ne pas les additionner.',
}
if finalized:
    assert summary['v22_human_candidates']==5
    assert summary['linked_main_costume_candidates']==28 and summary['linked_annex_costume_candidates']==4
    assert len(data['creatures']['assets'])==15
out={
    'schema':'rec.characters.v1-reconciliation.v22/1','date':'2026-11-24',
    'repository':'darknigthmare/resident-evil-bow-protocol','base_commit_inspected':HEAD,
    'scope':'Rapprochement des 24 fiches V1 et 60 extensions contre les 115 fighters, les 389 entrées du catalogue, les arbres assets/production complets par sous-arbre et les registres V5/V21/V22. Audit de métadonnées ; aucune nouvelle certification visuelle.',
    'complete_for_v1_rows':True,'generation_reports_finalized':finalized,
    'all_franchise_characters_audited':False,'new_generation_attempted':False,
    'recovery':{
        'reconstructed':True,'date':'2026-11-24','byte_identical_to_lost_final_report':False,
        'reason':'Le volume de travail a été vidé après la revue finale. Ce fichier a été reconstruit à partir des sources conservées, du checkpoint GitHub et des rapports restaurés.',
        'lost_final_json_sha256_for_trace_only':'68963a024d98a51c9816ccbaaee299ed315c26616ee449485a840581bc9c9228',
        'recovered_26_decisions_git_blob_sha':'2cb018cfe625ff843ee4f9f1fb296f5ec307108f',
        'checkpoint4':'380f66021171914be5f9fc55a137cc576ff2c74e',
        'runtime_source_url':f'https://raw.githubusercontent.com/darknigthmare/resident-evil-bow-protocol/{HEAD}/src/re-data.js',
        'original_assembly_review_recreated':False,'new_png_decoding_performed':False,
        'note':'L’ancien SHA constitue une trace de la version perdue, jamais l’empreinte du présent fichier reconstruit.',
    },
    'summary':summary,'heroes':heroes,'extensions':extensions,
    'archive_recovery_limits':{
        'v3_v4':data['v5']['old_archives'],
        'backup_scope':'La branche de secours atteste un portrait Alcina et RECOVERY.md, pas les archives complètes.',
        'samuel_v4':'12 frames droites annoncées, non récupérées et non vérifiées ici.',
        'whole_repository_recursive_tree_complete':False,
        'inspected_subtrees_complete':['assets/','production-archives/'],
        'other_modules_status':'Les autres modules n’ont pas été intégralement récupérés ; absence dans re-data ne vaut pas absence globale.',
        'v12_v13_v19':'Médias annoncés non intégralement récupérés ; aucune nouvelle absence déduite.',
    },
    'historical_bow_refusal_uids_preserved':[r['uid'] for r in v21['bow'] if r.get('refus_historique_conserve')],
    'source_evidence':{k:{'path':str(p.relative_to(ROOT)) if p.is_relative_to(ROOT) else str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for k,p in INPUTS.items()},
    'dynamic_reports_snapshot':{k:{'generation_complete':data[k].get('generation_complete'),'asset_count':len(data[k].get('assets',[])),'report_recovery':data[k].get('recovery')} for k in ('humans','creatures','costumes')},
    'generation_qualification_result':'Aucune nouvelle génération n’est déclarée prête sur la seule base de cette recherche de présence. Luis 2023 n’est pas fermé par Luis 2005 ; Sherry/Jake/Piers gardent leurs attentes documentées ; les autres propositions exigent récupération et référence complète.',
    'limits':[
        'Le catalogue de 389 contient les 115 fighters ; leur union n’est pas 504.',
        'Les 24 fiches et 60 extensions peuvent correspondre à des incarnations déjà existantes.',
        'Image de catalogue, corps statique, pose, costume et animation complète restent des unités différentes.',
        'Les références historiques ne sont pas recertifiées visuellement par cette reconstruction.',
        'Les archives V3/V4 non récupérées empêchent toute certification d’absence globale.',
        'Les refus historiques de forme, édition, direction et costume restent visibles ; aucune relance proposée.',
    ],
}
target=BASE/'inventory/characters-v1-reconciliation.json'
target.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
def cell(v):return str(v or '—').replace('|','\\|').replace('\n',' ')
md=['# Réconciliation personnages V1 — V22 reconstruite','',
    '**Version reconstruite après perte du volume de travail.** Elle conserve les sources et les décisions récupérées ; elle ne revendique pas l’identité de bytes avec le fichier final perdu ni son ancien SHA.',
    '',f"État des rapports cités : {'tous finalisés' if finalized else 'snapshot provisoire ; relancer après restauration complète'}. Aucun PNG redécodé, aucune génération nouvelle.",
    '', '24 fiches et 60 propositions confrontées à 389 entrées de catalogue, dont 115 fighters sélectionnés. Aucun nouveau personnage ni manque global certifié.',
    '', '## Compteurs','', '```json',json.dumps(summary,ensure_ascii=False,indent=2),'```','']
for title,section in [('24 fiches V1',heroes),('60 extensions V1',extensions)]:
    md.extend(['## '+title,'','| ID | Nom et édition | Décision V22 | Raccords catalogue | Archives attestées | Candidats V22 | Besoin restant |','| --- | --- | --- | --- | --- | --- | --- |'])
    for r in section:
        links=', '.join(a['asset_id'] for a in r['v22_candidates'])
        if r['v22_related_form_candidates']:links+=' ; autres formes : '+', '.join(a['asset_id'] for a in r['v22_related_form_candidates'])
        vals=[r['id'],r['name']+' — '+r['edition'],r['status_v22'],', '.join(a['uid']+' ('+a['relation']+')' for a in r['runtime_matches']),', '.join(Path(a['path']).name for a in r['archive_matches']),links,r['remaining_need']]
        md.append('| '+' | '.join(cell(v) for v in vals)+' |')
    md.append('')
md.extend(['## Limites','']+['- '+s for s in out['limits']]+[''])
(BASE/'inventory/characters-v1-reconciliation.md').write_text('\n'.join(md))
print(json.dumps({'generation_reports_finalized':finalized,'summary':summary,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()},ensure_ascii=False,indent=2))
