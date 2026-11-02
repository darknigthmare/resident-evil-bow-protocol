/** Project new source bodies and full native clips without manufacturing animation. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lot = 'modules/fidelity-r33/native', pack = path.join(root, lot);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const bound = name => {const raw = fs.readFileSync(path.join(root, name)); return {path: name, bytes: raw.length, sha256: sha(raw)};};
const inputs = bound(lot + '/inputs.json'), input = JSON.parse(fs.readFileSync(path.join(root, inputs.path)));
const renderers = ['modules/fidelity-r30/native/revelations/renderer.js', 'modules/fidelity-r30/native/other-games/renderer.js', lot + '/renderer.js'].map(bound);
const target = path.join(pack, 'manifest.json');
const previous = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target)) : null;
const records = previous && previous.inputs.sha256 === inputs.sha256 && JSON.stringify(previous.renderers) === JSON.stringify(renderers) ? previous.entries : [];
for (const entry of records) for (const frame of [...entry.frames, ...(entry.endpoint ? [entry.endpoint] : [])]) {
  const raw = fs.readFileSync(path.join(root, frame.path)); if (raw.length !== frame.bytes || sha(raw) !== frame.sha256) throw Error('Resume frame differs from its native rendering proof');
}
const port = Number(process.env.BOW_NATIVE_R33_PORT || 5841), base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
let browser;
function source(record, job) {
  if (!record) return null;
  const sourceBase = path.resolve(root, path.dirname(job.sourceCatalog.path), job.entry.base);
  return {...record, path: path.relative(root, path.resolve(sourceBase, record.path)).split(path.sep).join('/')};
}
function save(value, relative) {
  const png = Buffer.from(value.png, typeof value.png === 'string' ? 'base64' : undefined);
  fs.mkdirSync(path.dirname(path.join(root, relative)), {recursive: true}); fs.writeFileSync(path.join(root, relative), png);
  const {png: ignored, alphaBounds, ...metadata} = value;
  return {...metadata, ...(alphaBounds ? {bounds: alphaBounds} : {}), path: relative, bytes: png.length, sha256: sha(png)};
}
function write() {
  const sequence = records.filter(row => row.kind === 'native-sequence'), poses = records.filter(row => row.kind === 'native-static-pose');
  const value = {schema: 're.bow.native-library-r33/1', release: 'R33', inputs, renderers,
    counts: {subjects: new Set(records.map(row => row.subjectId)).size, newBodyIdentities: new Set(poses.map(row => row.subjectId)).size,
      sourceBodyVariants: new Set(poses.map(row => row.modelId)).size, nativePoseViews: poses.length,
      newFullSourceClips: new Set(sequence.map(row => row.subjectId + ':' + row.clipId)).size,
      orientedSequences: sequence.length, nativeRenderedFrames: sequence.reduce((n, row) => n + row.frames.length, 0),
      endpointReferenceFrames: sequence.length, newCertifiedOriginalIdles: 0, admittedCombatStates: 0, originalGameFrames: 0},
    sourceFilesRewritten: false, canonicalFidelityCertified: false,
    scope: 'New views of published source bodies, plus full source scenes sampled at sixty native keys per second. No fabricated skeletal motion, mirroring, automatic combat admission or inferred original action labels.', entries: records};
  fs.writeFileSync(target, JSON.stringify(value, null, 2) + '\n');
}
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {try {if ((await fetch(base)).ok) {ready = true; break;}} catch {} await new Promise(resolve => setTimeout(resolve, 75));}
  if (!ready) throw Error('Native R33 render server unavailable');
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader']});
  const page = await browser.newPage(); await page.goto(base + '/' + lot + '/render.html');
  for (const job of input.bodies) {
    if (records.filter(row => row.modelId === job.id && row.kind === 'native-static-pose').length === 4) {console.log('RESUMED ' + job.id); continue;}
    const result = await page.evaluate(async job => {const {renderBody} = await import('./renderer.js'); return renderBody(job.entry, {catalog: job.sourceCatalog, cameraUpAxis: job.cameraUpAxis, cellSize: job.cellSize, materialMode: job.materialMode});}, job);
    for (const view of result.views) {
      const facing = ({0: 'front', 90: 'left', 180: 'back', 270: 'right'})[view.angle];
      const id = job.id + '--' + facing, frame = save(view, lot + '/poses/' + id + '.png');
      frame.seconds = 0;
      records.push({id, subjectId: job.subjectId, modelId: job.id, kind: 'native-static-pose', label: job.entry.label,
        clipId: 'source-pose-' + job.id, game: job.entry.game, sourceEdition: job.entry.sourceEdition || job.entry.game + ' / PC source export',
        sourcePage: job.entry.sourcePage, sourceFacing: facing, canMirror: false, sourcePoseRetained: true,
        admittedTargetEdition: false, admittedCombatStates: [], actionIdentity: 'unassigned-source-pose', actionVerified: false,
        originalGameFrames: false, canonicalFidelityCertified: false, frameCount: 1, sampleRate: 0, durationSeconds: 0,
        fullBodyReviewed: false, fightingPoseReviewed: false, continuityVerified: false,
        knownAppearanceGaps: job.subjectId.startsWith('re5-') ? ['Certains matériaux source sont sans texture ; aucune texture n’a été attribuée au jugé.', 'Arme et pose de combat non assemblées ou inventées ; pose publiée conservée.'] : ['Pose publiée statique : l’attitude, les appuis et les cycles de combat restent non qualifiés.'],
        nativeSource: {catalog: job.sourceCatalog, model: source(job.entry.model, job), materials: source(job.entry.materials, job),
          textures: job.entry.textures.map(item => source(item, job)), archive: source(job.entry.archive, job)},
        pivot: view.pivot, pivotScope: view.pivotScope, referenceBounds: view.bounds, recipe: {...result.recipe, cameraAngle: view.angle},
        frames: [frame], limitations: job.entry.limitations || []});
    }
    write(); console.log('RENDERED ' + job.id + ' four independent source cameras');
  }
  for (const job of input.jobs) {
    if (records.filter(row => row.clipId === job.sourceClip.id && row.subjectId === job.subjectId).length === 2) {console.log('RESUMED ' + job.id); continue;}
    const result = await page.evaluate(async job => {const {renderNative} = await import('./renderer.js'); return renderNative(job);}, job);
    for (const view of result.views) {
      const facing = view.angle === 90 ? 'left' : 'right', id = job.id + '--' + facing, folder = lot + '/sequences/' + id;
      const frames = view.frames.map((frame, index) => save(frame, folder + '/frame-' + String(index).padStart(3, '0') + '.png'));
      records.push({id, subjectId: job.subjectId, modelId: job.entry.id, kind: 'native-sequence', label: job.entry.label,
        clipId: job.sourceClip.id, game: job.entry.game, sourceEdition: job.entry.sourceEdition || 'Publication PC/HD2013 ; équivalence 3DS2012 non vérifiée',
        sourcePage: job.entry.sourcePage, sourceFacing: facing, canMirror: false,
        admittedTargetEdition: false, admittedCombatStates: [], availableCombatStates: [], actionIdentity: 'unassigned', actionVerified: false,
        sourceActionCertified: false, cinematicRole: 'unassigned', originalGameFrames: false, canonicalFidelityCertified: false,
        frameCount: frames.length, sampleRate: 60, durationSeconds: Number(job.sourceClip.keyTimeEnd) / job.sourceClip.ticksPerSecond,
        fullNativeDuration: true, frameDurationSeconds: 1 / 60, fullBodyReviewed: false, fightingPoseReviewed: false, continuityVerified: false,
        ticksPerSecond: job.sourceClip.ticksPerSecond, sourceNativeSampleTicks: job.nativeSampleTicks,
        nativeSource: {catalog: job.sourceCatalog, model: source(job.entry.model, job), clip: job.clipFile,
          publishedClip: {member: job.sourceClip.member, bytes: job.sourceClip.bytes, sha256: job.sourceClip.sha256},
          bindings: source(job.entry.materialBindings, job), textures: job.entry.textures.map(item => source(item, job)), archive: source(job.entry.archive, job)},
        pivot: view.pivot, pivotScope: 'Fixed projection of all-frame source minimum Y; anatomical contacts and original collisions remain unverified.',
        referenceBounds: view.referenceBounds, measurements: result.measurements,
        recipe: {...result.recipe, cameraAngle: view.angle, cameraPosition: view.cameraPosition, sourceOriginPivot: view.sourceOriginPivot},
        frames, endpoint: save(view.endpoint, folder + '/endpoint-reference.png'),
        limitations: ['Courbes, géométrie, textures et poids d’origine conservés ; caméra et lumière dérivées.',
          'Un code BA/DM ne certifie ni attaque, ni idle, ni introduction, ni mort ; aucune commande ou conclusion affectée.',
          'Source PC/HD2013 séparée de la cible 3DS2012 ; pixels, éclairage, timings moteur et échelle physique non certifiés.']});
      write(); console.log('RENDERED ' + id + ' ' + frames.length + ' actual native frames');
    }
  }
} finally {await browser?.close(); server.kill('SIGTERM');}
