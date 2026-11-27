#!/usr/bin/env python3
"""Assemble V25 metadata and a static gallery without rewriting any PNG."""
import hashlib
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BASE = '226fbba85ef7d9b248974eee8c455ec01cee95d4'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_urls(record):
    out = []
    values = record.get('sources', [])
    if isinstance(values, dict):
        values = list(values.values())
    if record.get('source_record'):
        values = [*values, record['source_record']]
    for value in values:
        if isinstance(value, str) and value.startswith(('http://', 'https://')):
            out.append(value)
        elif isinstance(value, dict):
            out.extend(value[k] for k in ('page_url', 'image_url', 'url') if value.get(k))
    return list(dict.fromkeys(out))


def main():
    records = []
    source_manifests = []
    for family, rel, review in [
        ('new_menu_keys', 'characters/manifest.json', 'reports/INDEPENDENT_CHARACTERS_V25.json'),
        ('gaze_correction', 'helena/manifest.json', 'reports/INDEPENDENT_HELENA_V25.json'),
        ('menu_direction_correction', 'claire/manifest.json', 'reports/INDEPENDENT_CLAIRE_CORRECTION_V25.json'),
    ]:
        p = ROOT / rel
        doc = json.loads(p.read_bytes())
        source_manifests.append({'path': rel, 'sha256': digest(p), 'assets': len(doc['assets'])})
        for source in doc['assets']:
            source_path = source['path']
            if family != 'new_menu_keys':
                path = str(Path(rel).parent / 'outputs' / Path(source_path).name)
            else:
                path = 'characters/' + source_path
            local = ROOT / path
            assert digest(local) == source['sha256'], path
            dims = source['dimensions']
            if isinstance(dims, dict):
                dims = [dims['width'], dims['height']]
            author_review = source.get('visual_review', {})
            limitations = source.get('limitations', author_review.get('limitations', []) if isinstance(author_review, dict) else [])
            record = {
                'asset_id': source['asset_id'], 'family': family, 'path': path,
                'name': source.get('name', source['asset_id']), 'edition': source['edition'],
                'state': source['state'], 'costume': source.get('costume'),
                'hero_id': source.get('hero_id'), 'status': source['status'],
                'catalogue_id': source.get('catalogue_id'),
                'candidate': True, 'dimensions': dims, 'mode': source['mode'],
                'file_bytes': source.get('file_bytes', source.get('bytes')),
                'sha256': source['sha256'], 'git_blob_sha': source['git_blob_sha'],
                'alpha_range': source['alpha_range'], 'sources': source_urls(source),
                'prompt': source.get('prompt'), 'source_manifest': rel,
                'source_manifest_sha256': digest(p), 'independent_review': review,
                'limitations': limitations, 'engine_admitted': False,
                'animation_complete': False, 'canonical_fidelity_1_1_certified': False,
                'post_generation_pixel_edits': False,
            }
            if family == 'gaze_correction':
                record['correction_of'] = 'REC_HELENA_RE6_DESELECT_KEY_V24'
                record['v24_original_retained'] = True
                record['automatic_replacement'] = False
                record['limitations'] = list(limitations) + ['La direction gauche est corrigée, mais des pixels sous le cou ont également changé ; aucune invariance locale stricte ni remplacement automatique de V24.']
            elif family == 'menu_direction_correction':
                record['correction_of'] = 'REC_CLAIRE_RE2R_MILITARY_DESELECT_KEY_V25'
                record['limitations'] = list(limitations) + ['Le regard gauche est corrigé ; des pixels du corps ont aussi été régénérés. Le premier essai reste conservé.']
            records.append(record)
    assert len(records) == 8 and len({r['asset_id'] for r in records}) == 8
    original = next(r for r in records if r['asset_id'] == 'REC_CLAIRE_RE2R_MILITARY_DESELECT_KEY_V25')
    corrected = next(r for r in records if r['family'] == 'menu_direction_correction')
    original['author_status'] = original['status']
    original['status'] = 'superseded_trial'
    original['candidate'] = False
    original['superseded_by'] = corrected['asset_id']
    original['consolidation_decision'] = 'Regard contraire à la consigne dans le premier passage ; correction gauche observée dans la revue complémentaire. Manifeste auteur intact.'
    summary = {
        'png': 8, 'new_menu_keys': 6, 'gaze_correction_candidates': 1,
        'targeted_correction_outputs': 2, 'superseded_trials': 1,
        'candidate_png': 7, 'total_png_bytes': sum(r['file_bytes'] for r in records),
        'new_costume_specific_menu_sequences': 2, 'new_costume_designs': 0,
        'new_character_identities': 0, 'completed_animations': 0,
        'engine_admissions': 0, 'one_to_one_certifications': 0,
    }
    manifest = {
        'schema': 'rec-v25-consolidated-assets-1', 'date': '2026-11-27', 'timezone': 'Europe/Paris',
        'base_commit': BASE, 'path_base': 'production-archives/rec-media/v25',
        'scope': 'Deux costumes officiels déjà produits en V22 reçoivent trois clés de menu chacun. Un candidat distinct corrige le regard Helena V24. Les archives précédentes ne sont pas réécrites.',
        'summary': summary, 'source_manifests': source_manifests, 'assets': records,
        'independent_reviews': ['reports/INDEPENDENT_CHARACTERS_V25.json', 'reports/INDEPENDENT_HELENA_V25.json', 'reports/INDEPENDENT_CLAIRE_CORRECTION_V25.json'],
        'blob_receipts': ['characters/GIT_BLOBS_V25.json', 'helena/GIT_BLOB.json', 'claire/GIT_BLOB.json'],
        'release_validation': 'reports/QA_V25.json', 'parent_ci': 'reports/CI_PARENT_V25.json',
        'progress': 'PROGRESS_V25.json',
    }
    (ROOT / 'ASSET_MANIFEST_V25.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    progress = {
        'schema': 'rec-v25-progress-1', 'date': '2026-11-27', 'base_commit': BASE,
        'baseline_inventory': '../v24/PROGRESS_V24.json', 'baseline_sha256': digest(ROOT.parent / 'v24/PROGRESS_V24.json'),
        'baseline_work_queue': '../v24/WORK_QUEUE_V24.md', 'delta': summary,
        'state_coverage': [
            {'hero': 'Claire Redfield', 'edition': 'Resident Evil 2 Remake (2019)', 'costume': 'Military', 'states': ['selected', 'confirm', 'deselect'], 'new_character': False, 'animation_complete': False},
            {'hero': 'Billy Coen', 'edition': 'Resident Evil Zero HD Remaster (2016)', 'costume': 'Wolf Force', 'states': ['selected', 'confirm', 'deselect'], 'new_character': False, 'animation_complete': False, 'not_interchangeable_with': 'Billy Prisoner, clés V23'},
        ],
        'helena': {'v24_issue': 'Regard vers la droite image au lieu de la gauche demandée.', 'v25_observed_fix': 'Tête et yeux maintenant vers la gauche image.', 'status': 'correction_candidate', 'whole_asset_qualified': False, 'v24_original_modified': False},
        'remaining': [
            'Qualifier les traits, motifs et accessoires depuis des vues natives détaillées ; les parties reconstruites ne sont pas certifiées.',
            'Raccorder marges, échelles, baselines, pivots et transitions ; les poses ne forment pas des animations complètes.',
            'Contrôler les contours sur un fond composé et dans le jeu ; aucune admission moteur V25.',
            'Les domaines costumes, héros, créatures, décors, projectiles et extensions restent distincts. Les autres besoins de V24 sont conservés.',
            'Foundry MB4, Altar 2F, Tower of Worship, récupération V19 et refus historiques restent ouverts avec leur portée antérieure.',
        ],
        'bible_and_extensions': 'Trois sources et matrice de 68 sections présentes dans la base V23 ; aucune modification V25.',
        'counting_note': 'V24 et V25 totalisent 31 PNG de production. Les 8 de V25 comprennent 6 états proposés pour deux costumes, une correction de regard Helena V24 et le premier essai Claire conservé. Ce ne sont pas 8 nouveaux états, héros ou costumes.',
    }
    (ROOT / 'PROGRESS_V25.json').write_text(json.dumps(progress, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    esc = html.escape
    previous_gallery = (ROOT.parent / 'v24/gallery.html').read_text(encoding='utf-8')
    css = re.search(r'<style>(.*?)</style>', previous_gallery, re.S).group(1)
    sections = []
    for family, title in [('new_menu_keys', 'Claire Military et Billy Wolf Force — premier passage'), ('menu_direction_correction', 'Claire — désélection corrigée'), ('gaze_correction', 'Correction ciblée Helena')]:
        sections.append(f'<section id="{family}"><h2>{title}</h2><div class="grid">')
        for a in [r for r in records if r['family'] == family]:
            w, h = a['dimensions']
            sources = ''.join(f'<li><a href="{esc(url, quote=True)}" rel="noreferrer">{esc(url)}</a></li>' for url in a['sources'])
            limits = ''.join(f'<li>{esc(item)}</li>' for item in a['limitations'])
            prompt = a['prompt'] if isinstance(a['prompt'], str) else json.dumps(a['prompt'], ensure_ascii=False)
            badge = 'Candidat · validation ouverte' if a['candidate'] else 'Essai remplacé · archive'
            card_class = 'card' if a['candidate'] else 'card trial'
            sections.append(f'''<article class="{card_class}" id="asset-{esc(a['asset_id'])}"><div class="asset portrait"><a href="{esc(a['path'])}"><img src="{esc(a['path'])}" width="{w}" height="{h}" alt="{esc(a['name'] + ' — ' + a['edition'] + ' — ' + a['state'] + ' — ' + badge, quote=True)}" loading="lazy"></a></div><div class="body"><p class="badge">{badge}</p><h3>{esc(a['name'])}</h3><p>{esc(a['edition'])}<br><strong>{esc(a['state'])}</strong> · {w} × {h}</p><details><summary>Sources, limites et prompt</summary><ul>{limits}</ul><h4>Références</h4><ul class="sources">{sources}</ul><p><a href="{esc(a['source_manifest'])}">Manifeste auteur</a> · <a href="{esc(a['independent_review'])}">Revue indépendante</a></p><p class="hash">SHA-256 : {a['sha256']}</p><details><summary>Prompt exécuté</summary><pre>{esc(prompt)}</pre></details></details></div></article>''')
        sections.append('</div></section>')
    gallery = f'''<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Resident Evil Combat — V25</title><style>{css}</style></head><body><header><p class="eyebrow">Resident Evil Combat · V25 · 27 novembre 2026</p><h1>Deux costumes, six nouvelles poses.</h1><p class="intro">Claire Military et Billy Wolf Force reçoivent des clés de sélection, confirmation et désélection. Le regard d’Helena est corrigé séparément. Le premier essai de désélection Claire est conservé à côté de sa correction.</p><div class="totals"><div class="total"><strong>8</strong>PNG natifs</div><div class="total"><strong>7</strong>candidats</div><div class="total"><strong>1</strong>essai remplacé</div><div class="total"><strong>0</strong>admission moteur</div></div><div class="notice">Costumes et éditions distincts. Les marges, les contours, les détails et les raccords restent à qualifier. Aucune certification 1:1 ni animation complète. Les corrections des regards ont aussi régénéré des pixels du corps ; les originaux sont conservés.</div><nav aria-label="Documents du lot"><a href="README.md">Notes V25</a><a href="ASSET_MANIFEST_V25.json">Manifeste</a><a href="PROGRESS_V25.json">Manquants</a><a href="reports/QA_V25.json">Contrôle</a><a href="../v24/gallery.html">Galerie V24</a></nav></header><main>{''.join(sections)}</main><footer>Galerie statique sans script ni requête externe automatique. PNG originaux intacts, damier CSS uniquement. Aucun rendu navigateur ou moteur vérifié.</footer></body></html>'''
    (ROOT / 'gallery.html').write_text(gallery, encoding='utf-8')
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == '__main__':
    main()
