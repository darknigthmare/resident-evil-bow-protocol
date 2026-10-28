/** Render complete preserved source clips, rather than synthesize an action from a still. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pack = path.join(root, 'modules/fidelity-r31/motion');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const bound = name => {const raw = fs.readFileSync(path.join(root, name)); return {path: name, bytes: raw.length, sha256: hash(raw)};};
const inputs = bound('modules/fidelity-r31/motion/inputs.json');
const jobs = JSON.parse(fs.readFileSync(path.join(root, inputs.path))).jobs;
const renderer = bound('modules/fidelity-r31/motion/renderer.js');
const sourceRenderer = bound('modules/fidelity-r30/native/revelations/renderer.js');
const priorPath = path.join(pack, 'manifest.json');
const prior = fs.existsSync(priorPath) ? JSON.parse(fs.readFileSync(priorPath)) : null;
const records = prior && prior.inputs.sha256 === inputs.sha256 && prior.renderer.sha256 === renderer.sha256
  && prior.sourceRenderer.sha256 === sourceRenderer.sha256 ? prior.entries : [];
for (const entry of records) for (const frame of [...entry.frames, entry.endpoint]) {
  const raw = fs.readFileSync(path.join(root, frame.path)); if (raw.length !== frame.bytes || hash(raw) !== frame.sha256) throw Error('Resume source frame changed');
}
const port = Number(process.env.BOW_R31_MOTION_PORT || 5811), base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
let browser;
function sourceRecord(record, job) {
  const source = path.resolve(root, path.dirname(job.sourceCatalog.path), job.entry.base);
  return {...record, path: path.relative(root, path.resolve(source, record.path)).split(path.sep).join('/')};
}
function saveManifest() {
  const value = {schema: 're.bow.motion-library-r31/1', release: 'R31', inputs, renderer, sourceRenderer,
    counts: {subjects: new Set(records.map(row => row.subjectId)).size, nativeClips: new Set(records.map(row => row.subjectId + ':' + row.clipId)).size,
      orientedSequences: records.length, nativeRenderedFrames: records.reduce((total, row) => total + row.frames.length, 0),
      endpointReferences: records.length, canonicalActionAssignments: 0, certifiedIntroClips: 0, certifiedOutroClips: 0,
      admittedCombatStates: 0, originalGameFrames: 0},
    sourceFilesRewritten: false, canonicalFidelityCertified: false,
    scope: 'Full native-body scenes at sixtyHz from retained PC/HD2013 source rigs, textures and curves. Published opaque clip codes do not assign attacks, intros, deaths or outcomes.', entries: records};
  fs.writeFileSync(priorPath, JSON.stringify(value, null, 2) + '\n');
}
try {
  for (let n = 0; n < 80; n++) {try {if ((await fetch(base)).ok) break;} catch {} await new Promise(resolve => setTimeout(resolve, 75));}
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader']});
  const page = await browser.newPage(); await page.goto(base + '/modules/fidelity-r31/motion/render.html');
  for (const job of jobs) {
    if (records.filter(row => row.subjectId === job.subjectId && row.clipId === job.sourceClip.id).length === 2) {console.log('RESUMED ' + job.id); continue;}
    const output = await page.evaluate(async job => {const {renderNative} = await import('./renderer.js'); return renderNative(job);}, job);
    for (const view of output.views) {
      const side = view.angle === 90 ? 'left' : 'right', id = job.id + '--' + side;
      const folder = 'modules/fidelity-r31/motion/sequences/' + id;
      fs.mkdirSync(path.join(root, folder), {recursive: true});
      function save(frame, name) {
        const png = Buffer.from(frame.png, 'base64'), target = folder + '/' + name;
        fs.writeFileSync(path.join(root, target), png);
        const {png: ignored, alphaBounds, ...metadata} = frame;
        return {...metadata, bounds: alphaBounds, path: target, bytes: png.length, sha256: hash(png)};
      }
      const frames = view.frames.map((frame, index) => save(frame, 'frame-' + String(index).padStart(3, '0') + '.png'));
      records.push({id, subjectId: job.subjectId, kind: 'native-sequence', label: job.entry.label,
        game: job.entry.game, sourceEdition: job.entry.sourceEdition || job.entry.game,
        targetIncarnation: 'Nintendo3DS2012 catalogue identity; PC/HD2013 native source observation remains separate.',
        admittedTargetEdition: false, modelId: job.entry.id, modelRole: job.entry.modelRole, clipId: job.sourceClip.id,
        sourcePage: job.entry.sourcePage, sourceFacing: side, facingScope: 'Actual opposing camera side; the character can turn within a native scene.', canMirror: false,
        actionIdentity: 'unassigned', actionVerified: false, sourceActionCertified: false,
        admittedCombatStates: [], availableCombatStates: [], continuityVerified: false, cinematicRole: 'unassigned',
        originalGameFrames: false, canonicalFidelityCertified: false,
        frameCount: frames.length, sampleRate: 60, frameDurationSeconds: 1 / 60,
        durationSeconds: Number(job.sourceClip.keyTimeEnd) / job.sourceClip.ticksPerSecond, fullNativeDuration: true,
        nativeSource: {catalog: job.sourceCatalog, model: sourceRecord(job.entry.model, job), clip: job.clipFile,
          publishedClip: {member: job.sourceClip.member, bytes: job.sourceClip.bytes, sha256: job.sourceClip.sha256},
          bindings: sourceRecord(job.entry.materialBindings, job), textures: job.entry.textures.map(row => sourceRecord(row, job)),
          archive: {sha256: job.entry.archive.sha256, bytes: job.entry.archive.bytes}},
        ticksPerSecond: job.sourceClip.ticksPerSecond, sourceNativeSampleTicks: job.nativeSampleTicks,
        pivot: view.pivot, pivotScope: 'Fixed projection of source bounds floor proxy; independent anatomical contact and physical game collision are unverified.',
        referenceBounds: view.referenceBounds,
        recipe: {...output.recipe, cameraAngle: view.angle, cameraPosition: view.cameraPosition, sourceOriginPivot: view.sourceOriginPivot},
        measurements: output.measurements, frames, endpoint: save(view.endpoint, 'endpoint-reference.png'),
        limitations: ['Original action/phase names are not inferred from archive codes.',
          'No input command, attack event, hitbox, victory, defeat or cinematic transition is assigned by this render.',
          'All source geometry, weights, textures, curves and time values remain unchanged; new lighting and orthographic camera are explicitly derived.',
          'PC/HD2013 source is distinct from the original3DS2012 target; game material/lighting, original frames and physical units are not certified.']});
      saveManifest(); console.log('RENDERED ' + id + ' ' + frames.length + ' native frames');
    }
  }
} finally {await browser?.close(); server.kill('SIGTERM');}
