#!/usr/bin/env python3
"""Bind the six R33 lots and append seven sheets without rewriting R31 history."""
import argparse
from collections import Counter
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
from urllib.parse import parse_qs, urlencode, urlsplit
from zipfile import ZipFile

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
MODULE = Path('modules/fidelity-r33')
BASELINE = 'docs/BOW_FIDELITE_R31.xlsx'
PRIOR = 'docs/R31_TRACKING.json'
REPORT_INDEX = 'docs/R33_REPORT_INDEX.json'
SHEETS = ('Synthèse R33', 'Chantiers R33', 'Catalogue R33', 'Lots R33', 'Ajouts R33', 'Recette R33', 'Sources R33')
FIELDS = ('r33_lots', 'r33_workstreams', 'r33_summary', 'r33_artifacts', 'r33_source_editions', 'r33_has_additions', 'r33_limits')
LOTS = (
    ('sprites', 'r33_generated_assets', ('R20-10', 'G-RENDU')),
    ('native', 'r33_native_motion', ('R20-09', 'G-COMMANDES', 'G-CINEMATIQUES', 'G-MANCHES')),
    ('evidence', 'r33_source_evidence', ('G-AUDIO', 'G-PERIMETRE', 'G-PREUVES', 'G-ECHELLE', 'G-VICTIMES')),
    ('persistence', 'r33_saves_replays', ('G-SAUVES', 'G-REPLAYS')),
    ('validation', 'root', ('G-PERF', 'G-ACCESS')),
)
TRACKING_TASKS = ('G-LIVRAISON', 'G-RECETTE')
SPEC = importlib.util.spec_from_file_location('r33_frozen_helpers', ROOT / 'scripts/fidelity-progress-r31.py')
PREVIOUS = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PREVIOUS)
UTIL = PREVIOUS.UTIL
read, sha, raw, write = PREVIOUS.read, PREVIOUS.sha, PREVIOUS.raw, PREVIOUS.write
text_list = PREVIOUS.text_list
UI_INPUTS = ['scripts/fidelity-progress-r33.py', *(str(MODULE / name) for name in ('index.html', 'dashboard.js', 'dossier-link.js'))]


def local(name, root=ROOT):
    if (not isinstance(name, str) or not name or re.search(r'[\\%?#:\x00-\x1f\x7f]', name)
            or name.startswith('/') or any(part in ('', '.', '..') for part in name.split('/'))):
        raise ValueError('Evidence must be a local checkout path')
    path = (Path(root) / name).resolve()
    if not path.is_relative_to(Path(root).resolve()) or not path.is_file():
        raise ValueError('Missing or external evidence: ' + name)
    return path


def binding(name, root=ROOT):
    path = local(name, root)
    return {'path': name, 'bytes': path.stat().st_size, 'sha256': sha(path)}


def checked(record, root=ROOT):
    if not isinstance(record, dict):
        raise ValueError('Evidence needs a path and SHA-256')
    actual = binding(record.get('path'), root)
    if record.get('sha256') != actual['sha256'] or 'bytes' in record and record['bytes'] != actual['bytes']:
        raise ValueError('Evidence hash or size mismatch: ' + actual['path'])
    return actual


def href(name):
    return os.path.relpath(name, MODULE).replace(os.sep, '/')


def artifact(item, uid, root):
    actual = binding(item.get('path'), root)
    if not actual['path'].startswith(('assets/', 'modules/', 'docs/')):
        raise ValueError('Identity evidence must stay in published assets, modules or docs')
    if any(key in item and item[key] != actual[key] for key in ('bytes', 'sha256')):
        raise ValueError('Identity artifact bytes differ: ' + actual['path'])
    for key, maximum in (('label', 2000), ('kind', 1000)):
        if not isinstance(item.get(key), str) or not item[key].strip() or len(item[key]) > maximum:
            raise ValueError('An identity artifact needs a bounded kind and label')
    edition = item.get('sourceEdition', '')
    if not isinstance(edition, str) or len(edition) > 2000:
        raise ValueError('An artifact needs a bounded source edition')
    if item.get('canonicalFidelityCertified') is True or item.get('originalGameFrameCertified') is True:
        raise ValueError('An observation cannot certify global fidelity or an original game frame')
    parameter = item.get('identityParameter')
    if parameter is not None and parameter not in ('id', 'uid', 'subjectId', 'identity'):
        raise ValueError('Unknown exact-identity query parameter')
    route = item.get('href', actual['path'] + ('?' + urlencode({parameter: uid}) if parameter else ''))
    if not isinstance(route, str) or len(route) > 4096 or re.search(r'[\\\x00-\x1f\x7f]', route):
        raise ValueError('An identity route must stay with its bound local artifact')
    parsed = urlsplit(route)
    query = parse_qs(parsed.query, keep_blank_values=True)
    if (parsed.scheme or parsed.netloc or parsed.path != actual['path']
            or any(any(value != uid for value in query[key]) for key in ('id', 'uid', 'subjectId', 'identity') if key in query)):
        raise ValueError('An identity route cannot substitute another incarnation or file')
    return {**actual, 'label': item['label'], 'kind': item['kind'], 'sourceEdition': edition, 'href': route}


def collect_lots(root=ROOT, allow_pending=False):
    root = Path(root)
    known = {row['id'] for row in read('data/roster.json', root)['catalog']}
    lots, inputs, pending = [], [], []
    for lot_id, owner, tasks in LOTS:
        name = (MODULE / lot_id / 'delivery.json').as_posix()
        shell = {'id': lot_id, 'owner': owner, 'taskIds': list(tasks), 'path': name}
        if not (root / name).is_file():
            pending.append(name)
            lots.append({**shell, 'state': 'EN ATTENTE', 'summary': 'Lot attribué ; preuves attendues.',
                'advances': ['Le lot a un responsable explicite.'], 'remaining': ['Livrer les fichiers et leurs preuves propres au chantier.'],
                'manifests': [], 'resources': [], 'identities': [], 'counts': {}, 'taskUpdates': {}})
            continue
        value = read(name, root)
        assigned = value.get('workstreams', value.get('taskIds', []))
        if (value.get('schema') != 're.bow.fidelity-lot-r33/1' or value.get('release', 'R33') != 'R33'
                or value.get('lotId', value.get('id')) != lot_id or not isinstance(assigned, list)
                or set(assigned) != set(tasks) or len(assigned) != len(tasks)
                or value.get('canonicalFidelityCertified') is not False
                or not isinstance(value.get('summary'), str) or not value['summary'].strip()):
            raise ValueError('Invalid R33 lot identity, owner scope or certification: ' + name)
        advances = text_list(value.get('advances'), 'Lot advances')
        remaining = text_list(value.get('remaining'), 'Lot remaining criteria')
        updates = value.get('taskUpdates', {})
        if not isinstance(updates, dict) or set(updates) - set(tasks):
            raise ValueError('Scoped task updates cannot escape their assigned lot')
        for update in updates.values():
            if not isinstance(update, dict):
                raise ValueError('A scoped task update needs observations')
            for key in ('advances', 'remaining'):
                if key in update:
                    text_list(update[key], 'Task ' + key)
        manifests = value.get('sourceFiles', value.get('manifests', []))
        if (not isinstance(manifests, list) or not manifests or len(manifests) > 256
                or len({row['path'] for row in manifests}) != len(manifests)):
            raise ValueError('A delivered lot needs unique bound manifests or sources')
        manifests = [checked(row, root) for row in manifests]
        if not any(row['path'].startswith(('modules/fidelity-r33/', 'docs/R33_')) for row in manifests):
            raise ValueError('A new lot cannot consist only of earlier evidence')
        resources = []
        for item in value.get('resources', []):
            local(item.get('path'), root)
            if not isinstance(item.get('label'), str) or not item['label'].strip():
                raise ValueError('A resource needs a human-readable label')
            resources.append({'path': item['path'], 'label': item['label']})
        rows = value.get('identities', [])
        if not isinstance(rows, list) or len(rows) > len(known):
            raise ValueError('Lot identities must be bounded')
        identities = {}
        for row in rows:
            uid = row.get('id', row.get('uid'))
            if uid not in known or uid in identities or not isinstance(row.get('summary'), str) or len(row['summary']) > 10000:
                raise ValueError('Lot additions need unique exact catalogue identities')
            items = row.get('artifacts', [])
            if not isinstance(items, list) or len(items) > 256:
                raise ValueError('Identity evidence must fit the bounded Dossier index')
            identities[uid] = {'id': uid, 'summary': row['summary'], 'artifacts': [artifact(item, uid, root) for item in items]}
        # A flat list is accepted for producers that naturally emit one record per source.
        for item in value.get('artifacts', []):
            uid = item.get('uid', item.get('subjectId', item.get('identity')))
            if uid not in known:
                raise ValueError('Flat evidence needs an exact catalogue identity')
            row = identities.setdefault(uid, {'id': uid, 'summary': value['summary'], 'artifacts': []})
            row['artifacts'].append(artifact(item, uid, root))
        for row in identities.values():
            keys = [(item['path'], item['href'], item['kind']) for item in row['artifacts']]
            if len(keys) != len(set(keys)) or len(keys) > 256:
                raise ValueError('Identity evidence must be unique and bounded')
        inputs += [name, *(row['path'] for row in manifests)]
        lots.append({**shell, 'state': 'LIVRÉ PARTIEL', 'summary': value['summary'], 'advances': advances,
            'remaining': remaining, 'manifests': manifests, 'resources': resources,
            'identities': list(identities.values()), 'taskUpdates': updates, 'counts': value.get('counts', {})})
    if pending and not allow_pending:
        raise ValueError('R33 lots are unfinished: ' + ', '.join(pending))
    return lots, inputs, pending


def validation(root=ROOT, allow_pending=False):
    root = Path(root)
    index = read(REPORT_INDEX, root) if (root / REPORT_INDEX).is_file() else {'reports': []}
    pending = [] if index.get('reports') else [REPORT_INDEX]
    checks, failed, totals, names = [], [], Counter(), set()
    for item in index.get('reports', []):
        name = item['path']
        if name in names:
            raise ValueError('An executed report cannot be counted twice')
        names.add(name)
        if not (root / name).is_file():
            pending.append(name)
            continue
        value = read(name, root)
        counts = value.get('counts', {})
        passed, failures = value.get('passed', counts.get('passed')), value.get('failed', counts.get('failed'))
        if type(passed) is not int or type(failures) is not int or min(passed, failures) < 0 or passed + failures <= 0:
            raise ValueError('Executed report has no nonempty actual result: ' + name)
        current = failures == 0 and value.get('pass') is not False
        for key in ('sourceFiles', 'inputs', 'sources', 'executedAdapterInputs'):
            for proof in value.get(key, []) if isinstance(value.get(key), list) else []:
                if isinstance(proof, dict) and 'path' in proof and 'sha256' in proof:
                    try:
                        checked(proof, root)
                    except ValueError:
                        current = False
        if not current:
            failed.append(name)
        kind = item.get('kind', 'checks')
        totals[kind] += passed if current else 0
        checks.append({'label': item.get('label', name), 'path': name, 'sha256': sha(root / name), 'kind': kind,
            'passed': passed, 'failed': failures, 'source_current': current,
            'result': f'{passed} réussis, {failures} échec(s)' if current else 'Résultat non courant ou en échec',
            'scope': item.get('scope', 'Ajouts R33 dans le périmètre réellement exécuté de ce rapport.')})
    if not allow_pending and (pending or failed):
        raise ValueError('R33 validation is unfinished: ' + ', '.join(pending + failed))
    return {'schema': 're.bow.validation-r33/1', 'release': 'R33', 'complete': not pending and not failed,
        'checks': checks, 'totals': dict(totals), 'pending_reports': pending, 'failed_reports': failed,
        'canonical_fidelity_certified': 0, 'historical_results': binding('docs/R31_VALIDATION.json', root)}


def build(root=ROOT, allow_pending=False):
    root = Path(root).resolve()
    prior = read(PRIOR, root)
    known = {row['id'] for row in read('data/roster.json', root)['catalog']}
    if len(known) != 389 or {row['id'] for row in prior['identity_updates']} != known:
        raise ValueError('The frozen catalogue must retain 389 exact identities')
    lots, lot_inputs, pending = collect_lots(root, allow_pending)
    checks = validation(root, allow_pending)
    checks['pending_reports'] += pending
    checks['complete'] = not checks['pending_reports'] and not checks['failed_reports']
    by_uid = {uid: [] for uid in known}
    artifacts, sources = [], []
    for lot in lots:
        for proof in lot['manifests']:
            sources.append([lot['id'], lot['taskIds'], '', 'Source liée au lot', proof['path'], lot['summary'], proof['sha256']])
        for row in lot['identities']:
            by_uid[row['id']].append((lot, row))
            for item in row['artifacts']:
                artifacts.append([lot['id'], lot['owner'], row['id'], item['kind'], item['label'], item['sourceEdition'], item['path'], item['sha256'], item['href']])
                sources.append([lot['id'], lot['taskIds'], row['id'], item['kind'], item['path'], item['sourceEdition'] or row['summary'], item['sha256']])
    identities = []
    for old in prior['identity_updates']:
        rows, row = by_uid[old['id']], copy.deepcopy(old)
        row.update(r33_lots=[lot['id'] for lot, item in rows],
            r33_workstreams=sorted({task for lot, item in rows for task in lot['taskIds']}),
            r33_summary=[item['summary'] for lot, item in rows],
            r33_artifacts=[{**proof, 'lot': lot['id']} for lot, item in rows for proof in item['artifacts']],
            r33_source_editions=sorted({proof['sourceEdition'] for lot, item in rows for proof in item['artifacts'] if proof['sourceEdition']}),
            r33_has_additions=bool(rows), r33_limits='Preuve, référence, rendu généré, dérivation native, geste observé et idle original qualifié restent distincts ; fidélité globale 1:1 non certifiée.')
        identities.append(row)
    owners = {task: lot for lot in lots for task in lot['taskIds']}
    if len(owners) + len(TRACKING_TASKS) != 17 or {row['id'] for row in prior['tasks']} != set(owners) | set(TRACKING_TASKS):
        raise ValueError('All 17 open workstreams need their separate explicit owner')
    tasks = []
    for old in prior['tasks']:
        row = copy.deepcopy(old)
        row['status'] = 'EN COURS'
        row['evidence'] = [{'href': '../fidelity-r31/index.html', 'label': 'Acquis antérieurs et critères R31'}]
        if row['id'] in owners:
            lot = owners[row['id']]
            update = lot['taskUpdates'].get(row['id'], {})
            row.update(owner=lot['owner'], lotId=lot['id'], deliveryState=lot['state'], r33_new_implementation=lot['state'] != 'EN ATTENTE')
            row['advances'] = ['Lot ' + lot['id'] + ' · responsable : ' + lot['owner'] + '.', *update.get('advances', lot['advances'])]
            row['remaining'] = list(dict.fromkeys([*old['remaining'], *update.get('remaining', lot['remaining'])]))
            if lot['state'] != 'EN ATTENTE':
                row['evidence'].append({'href': href(lot['path']), 'label': 'Livraison et limites du lot ' + lot['id']})
                row['evidence'] += [{'href': href(item['path']), 'label': item['label']} for item in lot['resources'][:4]]
        else:
            row.update(owner='r33_excel_tracking', lotId='tracking', deliveryState='LIVRÉ PARTIEL', r33_new_implementation=True)
            row['advances'] = ['Les 17 chantiers sont attribués à six lots, avec portée, preuves et critères ouverts.',
                'Les 63 feuilles R31 et leurs relations sont conservées ; sept feuilles R33 distinguent les ajouts par UID et nature.',
                'La recette ne crédite que les rapports réellement exécutés avec empreintes courantes ; les agrégats sont des totaux.']
            row['remaining'] = list(old['remaining'])
            row['evidence'].append({'href': '../../docs/R33_VALIDATION.json', 'label': 'Recette R33 par périmètre'})
        tasks.append(row)
    available = sum(lot['state'] != 'EN ATTENTE' for lot in lots)
    lot_rows = [[lot['id'], lot['owner'], lot['taskIds'], lot['state'], lot['summary'], lot['counts'], lot['remaining'], lot['path']] for lot in lots]
    lot_rows.append(['tracking', 'r33_excel_tracking', list(TRACKING_TASKS), 'LIVRÉ PARTIEL', 'Attribution, projection exacte, recette et export conservateur.',
        {'identities': 389, 'workstreams': 17, 'historicalSheets': 63}, ['Recette technique et fidélité artistique sont distinctes.'], 'docs/R33_TRACKING.json'])
    resources = [{'title': 'Lots et responsables', 'description': 'Tous les critères ouverts conservent leur responsable et leur portée.',
        'href': '../../docs/R33_LOTS.json', 'label': 'Examiner les six lots'},
        {'title': 'Historique R31', 'description': 'Les preuves antérieures restent conservées sans devenir de nouveaux médias.', 'href': '../fidelity-r31/index.html', 'label': 'Consulter R31'}]
    resources += [{'title': lot['id'], 'description': lot['summary'], 'href': href(lot['resources'][0]['path'] if lot['resources'] else lot['path']),
        'label': 'Examiner le lot ' + lot['id']} for lot in lots if lot['state'] != 'EN ATTENTE']
    count = sum(row['r33_has_additions'] for row in identities)
    stats = [{'label': 'chantiers ouverts attribués', 'value': 17, 'scope': 'Tous les critères R31 restent suivis.'},
        {'label': 'lots livrés dans leur périmètre', 'value': available + 1, 'scope': 'Cinq lots de ressources/fonctions et un lot de suivi.'},
        {'label': 'incarnations avec ajouts R33', 'value': count, 'scope': 'Une preuve ou un audit ne certifie pas un nouveau corps ou un idle.'},
        {'label': 'objets de preuve ou d’audit au total', 'value': len(artifacts), 'scope': 'Total agrégé des liens exacts aux 389 UID, pas un nombre par personnage.'},
        {'label': 'feuilles historiques conservées', 'value': 63, 'scope': 'XML et relations R31 préservés octet par octet.'},
        {'label': 'refus initiaux conservés', 'value': 22, 'scope': 'Le refus de révision Tyrant reste conservé séparément.'},
        {'label': 'chantiers clos par fidélité globale 1:1', 'value': 0, 'scope': 'La recette ne clôt pas les critères artistiques non prouvés.'}]
    inputs = list(dict.fromkeys([BASELINE, PRIOR, 'docs/R31_VALIDATION.json', 'data/roster.json', *UI_INPUTS,
        *lot_inputs, *([REPORT_INDEX] if (root / REPORT_INDEX).is_file() else []), *(item['path'] for item in checks['checks'])]))
    value = {'schema': 're.bow.fidelity-tracking-r33/1', 'release': 'R33', 'canonical_fidelity_certified': 0,
        'summary': f'{available + 1}/6 lots livrés dans leur périmètre ; 17 chantiers attribués et toujours ouverts ; {count} incarnations avec ajouts R33. Fidélité globale 1:1 non certifiée.',
        'statistics': stats, 'tasks': tasks, 'lots': lots, 'lot_rows': lot_rows, 'identity_updates': identities,
        'artifact_rows': artifacts, 'source_rows': sources, 'resources': resources, 'validation': checks['checks'],
        'validation_complete': checks['complete'], 'validation_gaps': checks['pending_reports'] + checks['failed_reports'],
        'generation_preference': prior.get('generation_preference', 'Conserver les refus ; fidélité prioritaire.'),
        'inputs': [binding(name, root) for name in inputs]}
    return checks, value


def validate(value, root=ROOT):
    if (value.get('release') != 'R33' or type(value.get('canonical_fidelity_certified')) is not int
            or value['canonical_fidelity_certified'] != 0):
        raise ValueError('Uncertified R33 release required')
    _, actual = build(root, allow_pending=not value.get('validation_complete'))
    if value != actual:
        raise ValueError('R33 projection differs from current lot proofs or task ownership')
    return value


def progress(value):
    return {**{key: value[key] for key in ('summary', 'statistics', 'resources', 'tasks')}, 'schema': 're.bow.fidelity-progress/1', 'release': 'R33'}


def dossier(value):
    result = {'schema': 're.bow.dossier-additions-r33/1', 'canonicalFidelityCertified': False,
        'identities': [{'id': row['id'], 'lots': row['r33_lots'], 'workstreams': row['r33_workstreams'],
            'summaries': row['r33_summary'], 'artifacts': row['r33_artifacts'], 'sourceEditions': row['r33_source_editions'],
            'hasAdditions': row['r33_has_additions']} for row in value['identity_updates']]}
    if len(raw(result)) > 768 * 1024:
        raise ValueError('Dossier proof index exceeds its bounded transport')
    return result


def export(value, root=ROOT, destination=None, progress_path=None):
    root = Path(root).resolve()
    validate(value, root)
    baseline = root / BASELINE
    destination = UTIL.checked_path(root, destination or root / 'docs/BOW_FIDELITE_R33.xlsx')
    progress_path = UTIL.checked_path(root, progress_path or root / MODULE / 'progress.json')
    protected = {local(item['path'], root) for item in value['inputs']}
    if destination == progress_path or destination in protected or progress_path in protected:
        raise ValueError('Outputs cannot overwrite historical inputs')
    if destination.suffix != '.xlsx' or progress_path.suffix != '.json':
        raise ValueError('Outputs must retain their workbook and progress formats')
    for output in (destination, progress_path):
        relative = output.relative_to(root)
        if relative.parts[0] != 'docs' and not relative.parts[0].startswith('qa-') and output != root / MODULE / 'progress.json':
            raise ValueError('Outputs must stay in R33 publication or isolated QA locations')
    if destination.exists():
        book = load_workbook(destination, read_only=True)
        creator = book.properties.creator
        book.close()
        if creator != 'BOW fidelity progress R33':
            raise ValueError('Refusing to overwrite another author’s workbook')
    if progress_path.exists():
        try:
            previous = json.loads(progress_path.read_text())
        except (UnicodeError, json.JSONDecodeError) as error:
            raise ValueError('Refusing to overwrite an unrelated progress file') from error
        if (not isinstance(previous, dict) or previous.get('schema') != 're.bow.fidelity-progress/1'
                or previous.get('release') != 'R33' or not isinstance(previous.get('tasks'), list) or len(previous['tasks']) != 17):
            raise ValueError('Refusing to overwrite another release’s progress file')
    book = load_workbook(baseline)
    if book.properties.creator != 'BOW fidelity progress R31' or len(book.sheetnames) != 63 or any(name in book.sheetnames for name in SHEETS):
        raise ValueError('Expected the preserved 63-sheet R31 workbook')
    original = list(book.sheetnames)
    old_catalogue = list(book['Catalogue R31'].values)
    if len(old_catalogue) != 390 or {row[0] for row in old_catalogue[1:]} != {row['id'] for row in value['identity_updates']}:
        raise ValueError('Historical catalogue must preserve 389 exact identities')
    book.properties.creator = 'BOW fidelity progress R33'
    book.properties.title = 'B.O.W. Protocol — ajouts et preuves R33'
    UTIL.sheet(book, SHEETS[0], ['Indicateur', 'Valeur', 'Portée'], [[row['label'], row['value'], row['scope']] for row in value['statistics']]
        + [['Recette R33 complète', value['validation_complete'], 'Périmètre technique sans clôture canonique 1:1.']])
    UTIL.sheet(book, SHEETS[1], ['ID', 'Chantier', 'Responsable', 'Lot', 'Livraison', 'Statut', 'Acquis R33', 'Critères ouverts', 'Preuves'],
        [[row['id'], row['title'], row['owner'], row['lotId'], row['deliveryState'], row['status'], row['advances'], row['remaining'], row['evidence']] for row in value['tasks']])
    updates = {row['id']: row for row in value['identity_updates']}
    UTIL.sheet(book, SHEETS[2], list(old_catalogue[0]) + list(FIELDS), [list(row) + [updates[row[0]][key] for key in FIELDS] for row in old_catalogue[1:]])
    UTIL.sheet(book, SHEETS[3], ['Lot', 'Responsable', 'Chantiers', 'État', 'Résumé', 'Compteurs du lot', 'Critères ouverts', 'Preuve'], value['lot_rows'])
    UTIL.sheet(book, SHEETS[4], ['Lot', 'Responsable', 'UID', 'Nature', 'Description', 'Édition source', 'Fichier', 'SHA-256', 'Route par incarnation'], value['artifact_rows'])
    UTIL.sheet(book, SHEETS[5], ['Contrôle', 'Résultat', 'Portée', 'Rapport', 'SHA-256'],
        [[row['label'], row['result'], row['scope'], row['path'], row['sha256']] for row in value['validation']]
        + [['Rapport ou lot manquant/non courant', 'NON VALIDÉ', 'Résultat exclu du cumul R33', name, ''] for name in value['validation_gaps']])
    UTIL.sheet(book, SHEETS[6], ['Lot', 'Chantiers', 'UID', 'Nature', 'Fichier', 'Portée', 'SHA-256'], value['source_rows'])
    book.active = book.sheetnames.index('Chantiers R33')
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=destination.parent, suffix='.xlsx', delete=False) as handle:
        temporary = Path(handle.name)
    try:
        book.save(temporary)
        book.close()
        PREVIOUS.PREVIOUS.OLD.canonical_zip(baseline, temporary)
        with ZipFile(baseline) as before, ZipFile(temporary) as after:
            for name in before.namelist():
                if name.startswith('xl/worksheets/') and before.read(name) != after.read(name):
                    raise ValueError('Historical worksheet XML or relationships changed')
        check = load_workbook(temporary)
        try:
            if check.sheetnames[:63] != original or check['Catalogue R33'].max_row != 390 or check['Chantiers R33'].max_row != 18:
                raise ValueError('New sheets omitted a historical identity or workstream')
            if any(cell.data_type == 'f' for name in SHEETS for row in check[name] for cell in row):
                raise ValueError('New evidence sheets cannot contain executable formulas')
        finally:
            check.close()
        os.replace(temporary, destination)
        write(progress_path, progress(value))
    finally:
        temporary.unlink(missing_ok=True)
    return {'workbook': destination.relative_to(root).as_posix(), 'sha256': sha(destination), 'baselineSha256': sha(baseline),
        'historical_worksheets_preserved': 63, 'worksheets': 70, 'identities': 389, 'open_workstreams': 17,
        'lots': 6, 'artifact_rows': len(value['artifact_rows']), 'source_rows': len(value['source_rows']), 'canonical_fidelity_certified': 0}


def overview(value, checks):
    return f'''# R33 — Lots parallèles et critères ouverts

{value['summary']}

Le [classeur R33](BOW_FIDELITE_R33.xlsx) conserve les 63 feuilles R31 et leurs relations octet par octet. Sept nouvelles feuilles suivent les responsables, les 389 UID, les preuves et leurs éditions, puis la recette. Les ajouts R32 au moteur et à l’interface restent conservés dans le dépôt courant.

Les objets de preuve ou d’audit sont un total agrégé des liens exacts aux incarnations. Ils ne comptent pas des personnages terminés, des corps natifs supplémentaires ou des idles originaux. Les refus de génération initiaux et la révision Tyrant restent conservés.

La recette est {'complète' if checks['complete'] else 'provisoire'} dans son périmètre exécuté : {json.dumps(checks['totals'], ensure_ascii=False)}. Les résultats après export et les exécutions d’archives sont séparés pour éviter les cycles d’empreintes et les doubles comptes. Les critères sans preuve restent ouverts.

[Suivi central](../modules/fidelity-r33/index.html) · [Lots](R33_LOTS.json) · [Suivi structuré](R33_TRACKING.json) · [Recette](R33_VALIDATION.json) · [Export](R33_EXPORT.json) · [Reproduction](R33_REPRODUCTION.json)

```sh
python3 scripts/fidelity-progress-r33.py build
python3 scripts/fidelity-progress-r33.py check
python3 scripts/fidelity-progress-r33.py export
python3 scripts/fidelity-progress-r33.py reproduce
```
'''.encode()


def reproduce(value, root=ROOT):
    root = Path(root).resolve()
    checks = []
    try:
        for seed in ('19', '79'):
            command = [sys.executable, 'scripts/fidelity-progress-r33.py', 'check']
            if not value['validation_complete']:
                command.append('--allow-pending')
            completed = subprocess.run(command, cwd=root, env={**os.environ, 'PYTHONHASHSEED': seed}, capture_output=True, text=True)
            if completed.returncode:
                raise ValueError(completed.stderr)
        checks.append({'name': 'Tracking stable across independent Python hash seeds', 'pass': True})
        folder = root / 'qa-r33-reproduction'
        folder.mkdir(exist_ok=True)
        baseline = sha(root / BASELINE)
        with tempfile.TemporaryDirectory(dir=folder) as name:
            temporary = Path(name)
            result = export(value, root, temporary / 'reproduced.xlsx', temporary / 'progress.json')
            if result['sha256'] != sha(root / 'docs/BOW_FIDELITE_R33.xlsx'):
                raise ValueError('Actual R33 workbook bytes do not reproduce')
            checks.append({'name': 'Actual R33 workbook reproduces exactly', 'pass': True, 'sha256': result['sha256']})
            if (temporary / 'progress.json').read_bytes() != (root / MODULE / 'progress.json').read_bytes() or sha(root / BASELINE) != baseline:
                raise ValueError('Progress or preserved R31 baseline changed')
            checks.append({'name': 'Progress matches and R31 history remains byte-exact', 'pass': True})
    except Exception as error:
        checks.append({'name': 'Reproduction failure', 'pass': False, 'error': str(error)})
    return {'schema': 're.bow.fidelity-reproduction-r33/1', 'passed': sum(row['pass'] for row in checks), 'failed': sum(not row['pass'] for row in checks), 'checks': checks}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('build', 'check', 'export', 'reproduce'))
    parser.add_argument('--allow-pending', action='store_true')
    args = parser.parse_args()
    if args.action in ('build', 'check'):
        checks, value = build(allow_pending=args.allow_pending)
        outputs = {'docs/R33_VALIDATION.json': raw(checks), 'docs/R33_TRACKING.json': raw(value),
            'docs/R33_WORKSTREAMS.json': raw({key: value[key] for key in ('release', 'summary', 'tasks', 'generation_preference')}),
            'docs/R33_LOTS.json': raw({'schema': 're.bow.fidelity-lots-r33/1', 'release': 'R33', 'lots': value['lot_rows']}),
            str(MODULE / 'progress.json'): raw(progress(value)), str(MODULE / 'dossier-additions.json'): raw(dossier(value)),
            'docs/FIDELITE_R33.md': overview(value, checks)}
        for name, content in outputs.items():
            if args.action == 'check':
                if (ROOT / name).read_bytes() != content:
                    raise ValueError('R33 output differs from current lot evidence: ' + name)
            else:
                write(ROOT / name, content)
        print(json.dumps({'complete': checks['complete'], 'totals': checks['totals'], 'lots': len(value['lots']) + 1,
            'identitiesWithAdditions': sum(row['r33_has_additions'] for row in value['identity_updates'])}))
    elif args.action == 'export':
        result = export(read('docs/R33_TRACKING.json'))
        write(ROOT / 'docs/R33_EXPORT.json', result)
        print(json.dumps(result))
    else:
        result = reproduce(read('docs/R33_TRACKING.json'))
        write(ROOT / 'docs/R33_REPRODUCTION.json', result)
        print(json.dumps(result))
        return int(bool(result['failed']))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
