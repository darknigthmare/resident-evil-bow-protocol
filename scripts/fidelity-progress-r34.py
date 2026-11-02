#!/usr/bin/env python3
"""Track the three R34 deliveries and append four sheets without rewriting R33 history."""
import argparse
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
import xml.etree.ElementTree as ET
from zipfile import ZipFile

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
BASELINE = 'docs/BOW_FIDELITE_R33.xlsx'
PRIOR = 'docs/R33_TRACKING.json'
ASSETS = 'modules/fidelity-r34/assets/manifest.json'
FLOW = 'docs/R34_SELECTION.json'
TRACKING = 'docs/R34_TRACKING.json'
VALIDATION = 'docs/R34_VALIDATION.json'
WORKBOOK = 'docs/BOW_FIDELITE_R34.xlsx'
SHEETS = ('Synthèse R34', 'Sorties R34', 'Preuves R34', 'Validation R34')
TERMINAL = {'GENERATED', 'BLOCKED_HISTORICAL_REFUSAL', 'BLOCKED_BY_TOOL', 'BLOCKED_BY_TOOL_PRIOR_PHASE', 'HELD_REFERENCE'}
REPORTS = (
    ('docs/R34_ASSETS_TESTS.json', 'Intégrité des ressources', 'unit'),
    ('docs/R34_ASSETS_BROWSER.json', 'Galerie et vrais PNG', 'browser'),
    ('docs/R34_SELECTION_BROWSER.json', 'Personnages puis stage', 'browser'),
    ('docs/R34_ROSTER_RUNTIME_TESTS.json', 'Lecture des portraits et poses', 'unit'),
    ('docs/R34_ROSTER_RUNTIME_BROWSER.json', 'Intégration du roster', 'browser'),
    ('docs/R34_CURRENT_GUARD_TESTS.json', 'Garde courant R34', 'guard'),
    ('docs/R34_CI_VALIDATION.json', 'Intégration continue R34', 'ci'),
)
# Pure frozen helpers: safe spreadsheet cells/tables and deterministic ZIP metadata.
SPEC = importlib.util.spec_from_file_location('r34_frozen_export_helpers', ROOT / 'scripts/fidelity-progress-r33.py')
OLD = importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(OLD)
UTIL = OLD.UTIL
canonical_zip = OLD.PREVIOUS.PREVIOUS.OLD.canonical_zip


def raw(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()


def read(name, root=ROOT):
    return json.loads((Path(root) / name).read_text())


def local(name, root=ROOT):
    if (not isinstance(name, str) or not name or re.search(r'[\\%?#:\x00-\x1f\x7f]', name)
            or name.startswith('/') or any(part in ('', '.', '..') for part in name.split('/'))):
        raise ValueError('Evidence must be a local checkout path')
    path = (Path(root) / name).resolve()
    if not path.is_relative_to(Path(root).resolve()) or not path.is_file():
        raise ValueError('Missing or external evidence: ' + name)
    return path


def binding(name, root=ROOT):
    path = local(name, root); data = path.read_bytes()
    return {'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


def checked(record, root=ROOT):
    actual = binding(record.get('path', record.get('image')), root)
    if actual['sha256'] != record.get('sha256') or 'bytes' in record and actual['bytes'] != record['bytes']:
        raise ValueError('Evidence hash or size mismatch: ' + actual['path'])
    return actual


def output_path(name, root=ROOT):
    root = Path(root).resolve(); path = Path(name)
    if not path.is_absolute(): path = root / path
    path = path.resolve()
    if not path.is_relative_to(root) or path == root:
        raise ValueError('Output must stay inside the checkout')
    relative = path.relative_to(root)
    if relative.parts[0] != 'docs' and not relative.parts[0].startswith('qa-'):
        raise ValueError('Output must stay in R34 publication or an isolated QA directory')
    return path


def write_json(name, value, root=ROOT):
    path = output_path(name, root)
    if path.exists():
        old = json.loads(path.read_text())
        if not isinstance(old, dict) or old.get('release') != 'R34' or old.get('schema') != value['schema']:
            raise ValueError('Refusing to overwrite an unrelated JSON output: ' + name)
    UTIL.atomic_write(path, raw(value))


def validation(root=ROOT, preview=False):
    rows, pending, invalid, totals = [], [], [], {}
    for name, label, kind in REPORTS:
        if not (Path(root) / name).is_file():
            pending.append(name); continue
        value = read(name, root); counts = value.get('counts', {})
        passed, failed = value.get('passed', counts.get('passed')), value.get('failed', counts.get('failed'))
        if type(passed) is not int or type(failed) is not int or min(passed, failed) < 0 or passed + failed <= 0:
            raise ValueError('Executed report needs a nonempty actual result: ' + name)
        stale, evidence_count = [], 0
        for key in ('sourceFiles', 'inputs', 'sources', 'executedAdapterInputs'):
            for proof in value.get(key, []) if isinstance(value.get(key), list) else []:
                if isinstance(proof, dict) and 'path' in proof and 'sha256' in proof:
                    evidence_count += 1
                    try: checked(proof, root)
                    except ValueError: stale.append(proof['path'])
        current = (evidence_count > 0 and failed == 0 and value.get('pass') is not False
                   and value.get('preview') is not True and not value.get('skipped')
                   and not stale and not value.get('staleExecutedSources'))
        if not current: invalid.append(name)
        if current: totals[kind] = totals.get(kind, 0) + passed
        rows.append({**binding(name, root), 'label': label, 'kind': kind, 'passed': passed, 'failed': failed,
                     'sourceCurrent': current, 'sourceBindings': evidence_count, 'staleSources': sorted(set(stale)),
                     'scope': value.get('scope', 'Périmètre exécuté du rapport R34, sans certification artistique globale.')})
    complete = not pending and not invalid
    if not preview and not complete:
        raise ValueError('R34 validation is unfinished: ' + ', '.join(pending + invalid))
    return {'schema': 're.bow.validation-r34/1', 'release': 'R34', 'complete': complete,
            'checks': rows, 'totals': totals, 'pendingReports': pending, 'invalidReports': invalid,
            'historicalResults': {'binding': binding('docs/R33_VALIDATION.json', root), 'includedInR34Totals': False},
            'excludedFromAggregate': ['Post-export integration', 'Core 723', 'Historical/current compatibility runs', 'Export/reproduction checks'],
            'canonicalFidelityCertified': False}


def build(root=ROOT, preview=False):
    root = Path(root); old = read(PRIOR, root); assets = read(ASSETS, root); plan = read('modules/fidelity-r34/assets/jobs.json', root)
    flow = read(FLOW, root) if (root / FLOW).is_file() else {}
    checks = validation(root, preview)
    jobs = {row['uid']: row for row in plan['jobs']}; entries = assets['entries']
    if (len(entries) != 346 or {row['id'] for row in entries} != set(jobs)
            or len(old['tasks']) != 17 or any(row['status'] != 'EN COURS' for row in old['tasks'])):
        raise ValueError('All 346 combatants and all 17 unaltered historical open workstreams are required')
    source_names = [BASELINE, PRIOR, ASSETS, 'modules/fidelity-r34/assets/jobs.json', 'scripts/fidelity-progress-r34.py',
                    'scripts/fidelity-progress-r33.py', 'scripts/export-fidelity-progress-r28.py', 'scripts/export-fidelity-progress-r27.py']
    if flow: source_names.append(FLOW)
    sources = {name: binding(name, root) for name in source_names}
    for value in [assets, flow]:
        for proof in value.get('sourceFiles', []):
            actual = checked(proof, root); sources[actual['path']] = actual
    for row in checks['checks']: sources[row['path']] = {key: row[key] for key in ('path', 'bytes', 'sha256')}
    outputs, proofs, unsettled = [], [], []
    for entry in entries:
        job = jobs[entry['id']]
        for kind in ('portrait', 'idle'):
            value = entry[kind]; status = value['status']; generated = status == 'GENERATED'
            if status not in TERMINAL: unsettled.append({'uid': entry['id'], 'kind': kind, 'status': status})
            if generated:
                image = checked(value, root); receipt = checked(value['receipt'], root)
                sources[image['path']], sources[receipt['path']] = image, receipt
            fallback = entry.get('fallbacks', {}).get(kind)
            outputs.append({'uid': entry['id'], 'label': entry['label'], 'incarnation': entry['incarnation'],
                            'fighterCategory': entry['fighterCategory'], 'lotId': entry['lotId'], 'kind': kind, 'status': status,
                            'newGenerated': generated, 'admitted': generated and value.get('defaultAdmission') is True,
                            'retainedFallbackAvailable': bool(fallback), 'fallbackStatus': 'REUSED' if fallback else None,
                            'image': value.get('image'), 'sha256': value.get('sha256'), 'bytes': value.get('bytes'),
                            'receipt': value.get('receipt', {}).get('path'), 'receiptSha256': value.get('receipt', {}).get('sha256'),
                            'sourceEdition': value.get('sourceEdition'), 'sourceFacing': value.get('sourceFacing'),
                            'fullBodyVisible': value.get('fullBodyVisible') is True, 'fullBodyReviewed': value.get('fullBodyReviewed') is True,
                            'completeBodyReferenceVerified': value.get('completeBodyReferenceVerified') is True,
                            'fightingPoseReviewed': value.get('fightingPoseReviewed') is True,
                            'availableStates': value.get('availableStates', []), 'crop': value.get('crop'),
                            'reason': value.get('reason'), 'knownAppearanceGaps': value.get('knownAppearanceGaps', []),
                            'canonicalFidelityCertified': False, 'originalIdleAnimationCertified': False})
            if value.get('receipt'):
                record = read(value['receipt']['path'], root)
                for source in record.get('references', []):
                    actual = checked(source, root); sources[actual['path']] = actual
                    proofs.append({'uid': entry['id'], 'kind': kind, 'nature': 'REFERENCE_REUSED', **actual,
                                   'sourceUrl': source.get('sourceUrl'), 'notes': 'Source documentaire ; ne compte pas comme nouveau média.'})
                proofs.append({'uid': entry['id'], 'kind': kind, 'nature': 'RECEIPT', **checked(value['receipt'], root),
                               'notes': status, 'sourceUrl': ''})
            if generated:
                proofs.append({'uid': entry['id'], 'kind': kind, 'nature': 'NEW_GENERATED_OUTPUT', **checked(value, root),
                               'sourceUrl': '', 'notes': 'PNG image_gen brut ; adaptation générée, sans certificat de pixels originaux.'})
    if not preview and unsettled:
        raise ValueError('Every requested output needs a terminal production status; remaining: ' + str(len(unsettled)))
    # Actual source inspection/research records are documentary evidence, never artistic completions.
    lot_root = root / 'modules/fidelity-r34/assets/lots'
    research = sorted(lot_root.glob('*/*body*review*.json'))
    research += sorted(lot_root.glob('*/source-research/*.json'))
    research += sorted(lot_root.glob('*/research/**/*.json'))
    research += sorted((root / 'modules/fidelity-r34/assets/source-research-extra').rglob('*.json'))
    research += [root / 'modules/fidelity-r34/assets/source-research/search-attempts.json']
    research += [root / 'modules/fidelity-r34/assets' / name for name in ('body-source-inspections.json', 'body-source-research.json', 'reference-admissions.json')]
    for path in research:
        if path.is_file():
            name = path.relative_to(root).as_posix(); sources[name] = binding(name, root)
            proofs.append({'uid': '', 'kind': 'research', 'nature': 'DOCUMENTARY_REVIEW', **sources[name],
                           'sourceUrl': '', 'notes': 'Revue réelle et réserves de sources ; aucune image nouvelle comptée.'})
    counts = copy.deepcopy(assets['counts']); counts.update(requestedOutputs=692, terminalOutputs=692-len(unsettled), pendingOutputs=len(unsettled),
                                                          preservedHistoricalSheets=70, addedSheets=4, worksheets=74, historicalOpenWorkstreams=17)
    by_kind = {kind: [row for row in outputs if row['kind'] == kind] for kind in ('portrait', 'idle')}
    for kind, generated_key, admitted_key in [('portrait', 'newGeneratedPortraits', 'generatedPortraitsAdmittedForSelection'),
                                              ('idle', 'newGeneratedIdlePoses', 'newCombatEligibleStaticPoses')]:
        if (counts[generated_key] != sum(row['newGenerated'] for row in by_kind[kind])
                or counts[admitted_key] != sum(row['admitted'] for row in by_kind[kind])):
            raise ValueError('Manifest counters must equal actual generated and admitted output rows')
    objectives = []
    for kind, title in [('portrait', 'Miniatures portrait des 346 BOW combattants'), ('idle', 'Poses de base de combat entières des 346 BOW combattants')]:
        rows = by_kind[kind]; admitted = sum(row['admitted'] for row in rows); generated = sum(row['newGenerated'] for row in rows)
        objectives.append({'id': 'R34-PORTRAITS' if kind == 'portrait' else 'R34-CORPS', 'title': title,
                           'status': 'DONE' if admitted == 346 else 'PARTIAL' if generated else 'OPEN',
                           'requested':346, 'newGenerated':generated, 'admitted':admitted,
                           'blockedOrHeld':sum(row['status'] in TERMINAL-{'GENERATED'} for row in rows),
                           'pending':sum(row['status'] not in TERMINAL for row in rows),
                           'remaining':'Fournir les sorties manquantes avec références vérifiables, respecter les refus ; une pose fixe ne remplit pas une boucle idle originale.'})
    flow_check = next((row for row in checks['checks'] if row['path'] == 'docs/R34_SELECTION_BROWSER.json'), {})
    flow_done = (flow.get('playerPhases') == ['characters','stages','combat'] and flow.get('counts', {}).get('currentPlayerDocuments') == 3
                 and flow.get('counts', {}).get('stages') == 52 and flow.get('arenaConfirmationStartsCombat') is True
                 and flow_check.get('sourceCurrent') is True and flow_check.get('passed') == 16)
    objectives.append({'id':'R34-SELECTION', 'title':'Choisir les personnages puis le stage avant de lancer le combat',
                       'status':'DONE' if flow_done else 'OPEN', 'routes':3, 'stages':52, 'browserGroups':flow_check.get('passed',0),
                       'remaining':'Périmètre limité au parcours dans les trois routes courantes ; sans ajout de stage ni règle de simulation.'})
    summary = f"{counts['newGeneratedPortraits']}/346 portraits générés ({objectives[0]['admitted']} admis), {counts['newGeneratedIdlePoses']}/346 poses générées ({objectives[1]['admitted']} admises). Parcours personnages→stage : {objectives[2]['status']}. Les 17 chantiers historiques restent ouverts ; fidélité globale 1:1 et animations originales non certifiées."
    value = {'schema':'re.bow.fidelity-tracking-r34/1','release':'R34','projection':preview,'canonicalFidelityCertified':False,
             'summary':summary,'counts':counts,'objectives':objectives,'tasks':copy.deepcopy(old['tasks']),
             'outputs':outputs,'proofs':proofs,'validation':checks,'validationComplete':checks['complete'],'productionStatusesComplete':not unsettled,
             'unsettledOutputs':unsettled,'inputs':[sources[name] for name in sorted(sources)],
             'limits':['Les anciens chantiers/feuilles R33 ne sont ni modifiés ni clos.','Les références de secours conservées sont REUSED et ne s’ajoutent pas aux PNG nouvellement générés.','Les poses fixes ne certifient pas une animation idle fluide ni les pixels/géométries des jeux originaux.','Les refus historiques et nouveaux ne sont pas réessayés.']}
    return checks, value


def validate(value, root=ROOT):
    if value.get('schema') != 're.bow.fidelity-tracking-r34/1' or value.get('release') != 'R34' or value.get('canonicalFidelityCertified') is not False:
        raise ValueError('Unexpected R34 tracking identity or unsupported fidelity certificate')
    if value['tasks'] != read(PRIOR, root)['tasks'] or len(value['outputs']) != 692:
        raise ValueError('Historical workstreams must stay exact and all 692 outputs must be present')
    if {(row['uid'],row['kind']) for row in value['outputs']} != {(row['id'],kind) for row in read(ASSETS, root)['entries'] for kind in ('portrait','idle')}:
        raise ValueError('Every 346 UID needs exactly its two requested output rows')
    for proof in value['inputs']: checked(proof, root)
    return value


def history_parts(baseline, generated):
    with ZipFile(baseline) as before, ZipFile(generated) as after:
        names = [name for name in before.namelist() if name.startswith('xl/worksheets/')]
        if any(name not in after.namelist() or before.read(name) != after.read(name) for name in names):
            raise ValueError('Historical worksheet XML or relationships changed')
        ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        old_sheets=ET.fromstring(before.read('xl/workbook.xml')).find('s:sheets',ns)
        new_sheets=ET.fromstring(after.read('xl/workbook.xml')).find('s:sheets',ns)
        if [dict(row.attrib) for row in old_sheets] != [dict(row.attrib) for row in new_sheets][:70]:
            raise ValueError('Historical sheet names, IDs or workbook relationships changed')
        relns={'r':'http://schemas.openxmlformats.org/package/2006/relationships'}
        oldrels=ET.fromstring(before.read('xl/_rels/workbook.xml.rels'))
        newrels={row.attrib['Id']:row.attrib for row in ET.fromstring(after.read('xl/_rels/workbook.xml.rels'))}
        for row in oldrels:
            if row.attrib['Type'].endswith('/worksheet') and newrels.get(row.attrib['Id']) != row.attrib:
                raise ValueError('Historical worksheet target relationship changed')
        return len(names)


def export(value, root=ROOT, destination=None):
    root=Path(root).resolve(); validate(value,root); baseline=root/BASELINE
    destination=output_path(destination or WORKBOOK,root)
    if destination.suffix!='.xlsx' or destination in {local(row['path'],root) for row in value['inputs']}:
        raise ValueError('Workbook output cannot overwrite a bound input')
    if destination.exists():
        prior=load_workbook(destination,read_only=True)
        try:
            if prior.properties.creator!='BOW fidelity progress R34': raise ValueError('Refusing to overwrite another author’s workbook')
        finally: prior.close()
    book=load_workbook(baseline)
    if len(book.sheetnames)!=70 or book.properties.creator!='BOW fidelity progress R33' or any(name in book.sheetnames for name in SHEETS):
        raise ValueError('Expected the preserved 70-sheet R33 workbook')
    oldnames=list(book.sheetnames); book.properties.creator='BOW fidelity progress R34'; book.properties.title='B.O.W. Protocol — portraits, corps entiers et sélection R34'
    UTIL.sheet(book,SHEETS[0],['Objectif','Demande','Statut','Demandé','Nouveaux PNG','Admis','Bloqués/réservés','En attente','Critère restant'],
               [[r['id'],r['title'],r['status'],r.get('requested'),r.get('newGenerated'),r.get('admitted'),r.get('blockedOrHeld'),r.get('pending'),r['remaining']] for r in value['objectives']]
               +[['PROJECTION','Production en cours ; aucun PENDING ne compte comme livré',value['projection'],None,None,None,None,None,'70 feuilles et 17 chantiers historiques conservés ; aucun certificat global 1:1.']])
    fields=['uid','label','incarnation','fighterCategory','lotId','kind','status','newGenerated','admitted','retainedFallbackAvailable','fallbackStatus','image','sha256','bytes','receipt','receiptSha256','sourceEdition','sourceFacing','fullBodyVisible','fullBodyReviewed','completeBodyReferenceVerified','fightingPoseReviewed','availableStates','crop','reason','knownAppearanceGaps','canonicalFidelityCertified','originalIdleAnimationCertified']
    UTIL.sheet(book,SHEETS[1],fields,[[row.get(key) for key in fields] for row in value['outputs']])
    fields=['uid','kind','nature','path','sourceUrl','bytes','sha256','notes']
    UTIL.sheet(book,SHEETS[2],fields,[[row.get(key) for key in fields] for row in value['proofs']])
    checks=value['validation']
    UTIL.sheet(book,SHEETS[3],['Contrôle','Réussis','Échecs','Sources courantes','Nature','Fichier','SHA-256','Portée'],
               [[row['label'],row['passed'],row['failed'],row['sourceCurrent'],row['kind'],row['path'],row['sha256'],row['scope']] for row in checks['checks']]
               +[['Rapport attendu',None,None,False,None,name,None,'Exclu du cumul tant que non exécuté/courant.'] for name in checks['pendingReports']])
    book.active=70;destination.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=destination.parent,suffix='.xlsx',delete=False) as handle: temporary=Path(handle.name)
    try:
        book.save(temporary);book.close();canonical_zip(baseline,temporary);parts=history_parts(baseline,temporary)
        check=load_workbook(temporary,read_only=True)
        try:
            if check.sheetnames[:70]!=oldnames or len(check.sheetnames)!=74 or check[SHEETS[1]].max_row!=693:
                raise ValueError('Export omitted a sheet or requested output')
            if any(cell.data_type=='f' for name in SHEETS for row in check[name] for cell in row):
                raise ValueError('New evidence sheets cannot contain executable formulas')
        finally:check.close()
        validate(value,root)
        os.replace(temporary,destination)
    finally:temporary.unlink(missing_ok=True)
    return {'schema':'re.bow.fidelity-export-r34/1','release':'R34','workbook':destination.relative_to(root).as_posix(),
            **binding(destination.relative_to(root).as_posix(),root),'baseline':binding(BASELINE,root),
            'historicalWorksheetsPreserved':70,'historicalWorksheetPartsPreserved':parts,'worksheets':74,'outputs':692,
            'historicalOpenWorkstreams':17,'projection':value['projection'],'canonicalFidelityCertified':False}


def overview(value,checks):
    return f"""# R34 — portraits, poses entières et sélection

{value['summary']}

Le [classeur R34](BOW_FIDELITE_R34.xlsx) conserve exactement les 70 feuilles R33 et leurs relations XML ; quatre feuilles suivent les 3 objectifs, les 692 sorties demandées, leurs preuves et la validation. Les refus restent documentés. Les corps générés sont des poses fixes ; ils ne valident pas les anciens chantiers d’animations originales.

Projection : {value['projection']}. États de production tous renseignés : {value['productionStatusesComplete']}. Validation technique courante : {checks['complete']}. Les références de secours conservées sont distinctes des nouveaux PNG et des sorties admises.

[Suivi](R34_TRACKING.json) · [Validation](R34_VALIDATION.json) · [Export](R34_EXPORT.json) · [Reproduction](R34_REPRODUCTION.json)

```sh
python3 scripts/fidelity-progress-r34.py build
python3 scripts/fidelity-progress-r34.py check
python3 scripts/fidelity-progress-r34.py export
python3 scripts/fidelity-progress-r34.py reproduce
```

Pendant la production, ajouter `--preview` à ces commandes pour conserver explicitement les états en attente. Les tests après export, les 723 tests core, les résultats historiques et les compatibilités restent hors du cumul R34 afin d’éviter les cycles de preuves.
""".encode()


def reproduce(value,root=ROOT):
    root=Path(root).resolve();checks=[]
    try:
        baseline=binding(BASELINE,root)
        published=binding(WORKBOOK,root)
        if read('docs/R34_EXPORT.json',root).get('sha256')!=published['sha256']:
            raise ValueError('The post-export report does not bind the current workbook')
        for seed in ('19','79'):
            command=[sys.executable,'scripts/fidelity-progress-r34.py','check']+(['--preview'] if value['projection'] else [])
            done=subprocess.run(command,cwd=root,env={**os.environ,'PYTHONHASHSEED':seed},capture_output=True,text=True)
            if done.returncode:raise ValueError(done.stderr or done.stdout)
        checks.append({'name':'Tracking stable across independent Python hash seeds','pass':True})
        folder=root/'qa-r34-reproduction';folder.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=folder) as name:
            result=export(value,root,Path(name)/'reproduced.xlsx')
            if result['sha256']!=binding(WORKBOOK,root)['sha256']:raise ValueError('Actual R34 workbook bytes do not reproduce')
            checks.append({'name':'Actual R34 workbook reproduces byte-exactly','pass':True,'sha256':result['sha256']})
        if binding(BASELINE,root)!=baseline:raise ValueError('Preserved R33 workbook changed')
        checks.append({'name':'All 70 R33 sheets and relationships remain byte-exact','pass':True,
                       'historicalWorksheetPartsPreserved':result['historicalWorksheetPartsPreserved']})
    except Exception as error:checks.append({'name':'Reproduction failure','pass':False,'error':str(error)})
    return {'schema':'re.bow.fidelity-reproduction-r34/1','release':'R34','passed':sum(row['pass'] for row in checks),'failed':sum(not row['pass'] for row in checks),'checks':checks,
            'includedInR34Aggregate':False,
            'sourceFiles':[binding(name,root) for name in (TRACKING,VALIDATION,WORKBOOK,'docs/R34_EXPORT.json','scripts/fidelity-progress-r34.py') if (root/name).is_file()]}


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('action',choices=('build','check','export','reproduce'));parser.add_argument('--preview',action='store_true');args=parser.parse_args()
    if args.action in ('build','check'):
        checks,value=build(preview=args.preview)
        outputs={TRACKING:raw(value),VALIDATION:raw(checks),'docs/FIDELITE_R34.md':overview(value,checks)}
        for name,data in outputs.items():
            path=output_path(name)
            if args.action=='check':
                if path.read_bytes()!=data:raise ValueError('R34 evidence projection is stale: '+name)
            elif name.endswith('.json'):write_json(name,json.loads(data))
            else:
                if path.exists() and not path.read_text().startswith('# R34 — portraits, poses entières et sélection'):raise ValueError('Refusing unrelated markdown overwrite')
                UTIL.atomic_write(path,data)
        print(json.dumps({'projection':args.preview,'statusesComplete':value['productionStatusesComplete'],'validationComplete':checks['complete'],'counts':value['counts']}))
    elif args.action=='export':
        value=read(TRACKING)
        if value['projection']!=args.preview:raise ValueError('Export projection must match the reviewed tracking')
        result=export(value);write_json('docs/R34_EXPORT.json',result);print(json.dumps(result))
    else:
        value=read(TRACKING)
        if value['projection']!=args.preview:raise ValueError('Reproduction projection must match tracking')
        result=reproduce(value);write_json('docs/R34_REPRODUCTION.json',result);print(json.dumps(result));return int(bool(result['failed']))
    return 0


if __name__=='__main__':raise SystemExit(main())
