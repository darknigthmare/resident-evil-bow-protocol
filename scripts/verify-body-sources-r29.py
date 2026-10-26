#!/usr/bin/env python3
"""Execute R29 native-body/import tests and bind the result to their actual inputs."""
import hashlib
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
suite = unittest.defaultTestLoader.discover(str(ROOT / 'tests'), pattern='test_body_sources_r29.py')
result = unittest.TextTestRunner(verbosity=2).run(suite)
paths = [
    'tests/test_body_sources_r29.py', 'scripts/import-body-sprites-r29.py',
    'scripts/import-native-body-models-r29.py', 'scripts/render-source-body-rasters-r29.mjs',
    'scripts/capture-body-sprite-review-r29.mjs',
    'modules/fidelity-r29/sources/body-rasters/renderer.js',
    'modules/fidelity-r29/sources/body-rasters/manifest.json',
    'modules/fidelity-r29/sources/body-rasters/online-evidence.json',
    'modules/fidelity-r29/sources/native-models/catalog.json',
    'docs/R29_BODY_RENDER_REQUEST.json', 'docs/R29_NATIVE_BODY_IMPORT_REQUEST.json',
    'modules/fidelity-r29/sprites/revision-failures/re1r-tyrant.json',
]
for uid in ('re0-zombie', 're0-mimicry-marcus'):
    paths.extend(['modules/fidelity-r29/sprites/records/' + uid + '.json',
                  'modules/fidelity-r29/sources/generation-requests/' + uid + '.json',
                  'docs/R29_BODY_VISUAL_EVIDENCE/' + uid + '.json'])
failed = len(result.failures) + len(result.errors)
report = {
    'schema':'re.bow.source-body-validation-r29/1',
    'complete':result.testsRun > 0 and result.wasSuccessful(),
    'passed':result.testsRun - failed - len(result.skipped), 'failed':failed,
    'skipped':len(result.skipped), 'testsRun':result.testsRun,
    'command':'python scripts/verify-body-sources-r29.py',
    'inputs':[{'path':path, 'sha256':hashlib.sha256((ROOT / path).read_bytes()).hexdigest()} for path in paths],
    'counts':{'primarySourceModels':3, 'primarySourceIdentities':3, 'primarySourceReferencePngs':12,
              'newNativeSourceArchives':1, 'freshOnlineCaptures':6,
              'primaryGenerationRequests':3, 'primarySelectedGeneratedFullBodyPngs':2,
              'primaryRevisionToolRefusals':1, 'initial385TargetRefusalsPreserved':22,
              'primaryBodiesAlreadyWholeInR28':2, 'primaryNewlyClosedBodyGaps':0,
              'primaryCombatIdleSpritesAdded':0, 'newTargetIdentities':0,
              'originalGameSprites':0, 'canonicalFidelityCertified':0},
    'scope':'Primary RE0/GameCube source bodies and shared R29 importer/renderer contract: source/model/material/texture/archive bytes;12 camera views and six Internet captures; two actual generation outputs and SHA-bound manual source/output body observations; one actual Tyrant revision refusal; negative admission tests; metadata-only documentary routing and appearance-gap idle gate fixtures. Other workers’ generated bodies and edition variants have separate overlay/source reports; no exact original-game rendering or full animation certification.'
}
(ROOT / 'docs/R29_BODY_SOURCES_TESTS.json').write_text(json.dumps(report, indent=2) + '\n')
raise SystemExit(0 if report['complete'] else 1)
