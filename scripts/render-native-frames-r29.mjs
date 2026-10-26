/** Render the selected published FBX curves into reproducible alpha PNG frames. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pack = path.join(root, 'modules/fidelity-r29/motion');
const sha = raw => crypto.createHash('sha256').update(raw).digest('hex');
const inputPath = path.join(pack, 'inputs.json'), input = JSON.parse(fs.readFileSync(inputPath));
const jobs = input.jobs.slice().sort((a, b) => Number(b.sourcePoseViews) - Number(a.sourcePoseViews));
const port = Number(process.env.BOW_NATIVE_FRAMES_R29_PORT || 5785), base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['scripts/dev.mjs'], {cwd: root, env: {...process.env, RE_BOW_PORT: String(port)}, stdio: 'ignore'});
const resolveRecord = (record, job) => {
  const sourceBase = path.resolve(root, path.dirname(job.sourceCatalog.path), job.entry.base);
  return {...record, path: path.relative(root, path.resolve(sourceBase, record.path)).split(path.sep).join('/')};
};
const records = [];
let browser;
function writeManifest() {
  const manifest = {schema: 're.bow.native-frame-library-r29/1', release: 'R29',
    inputs: {path: 'inputs.json', sha256: sha(fs.readFileSync(inputPath))},
    renderer: {path: 'renderer.js', sha256: sha(fs.readFileSync(path.join(pack, 'renderer.js')))},
    counts: {subjects: new Set(records.map(record => record.subjectId)).size, nativeScenes: records.length,
      nativeRenderedFrames: records.reduce((sum, record) => sum + record.frames.length, 0),
      nativePoseReferenceViews: records.reduce((sum, record) => sum + record.poseViews.length, 0),
      actionAssignedScenes: 0, admittedCombatCycles: 0, originalGameFrames: 0},
    sourceFilesRewritten: false, canonicalFidelityCertified: false,
    scope: 'Derived rendering of preserved native FBX curves and textures. Source key samples, fixed camera; action labels, original-game appearance, physical scale and gameplay timing remain uncertified.',
    entries: records};
  fs.writeFileSync(path.join(pack, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}
try {
  for (let attempt = 0; attempt < 80; attempt++) {try {if ((await fetch(base)).ok) break;} catch {} await new Promise(resolve => setTimeout(resolve, 75));}
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader']});
  const page = await browser.newPage(); await page.goto(base + '/modules/fidelity-r29/motion/render.html');
  for (const job of jobs) {
    const result = await page.evaluate(async job => {const {renderNative} = await import('./renderer.js'); return renderNative(job);}, job);
    const folder = 'sequences/' + job.id; fs.mkdirSync(path.join(pack, folder), {recursive: true});
    const save = (view, relative) => {const png = Buffer.from(view.png); fs.writeFileSync(path.join(pack, relative), png); const {png: ignored, ...metadata} = view; return {...metadata, path: relative, bytes: png.length, sha256: sha(png)};};
    const frames = result.frames.map((frame, index) => save(frame, folder + '/frame-' + String(index).padStart(2, '0') + '.png'));
    const poseViews = result.poseViews.map(view => save(view, folder + '/pose-' + view.angle + '.png'));
    const record = {id: job.id, subjectId: job.subjectId, modelId: job.entry.id, modelRole: job.entry.modelRole, clipId: job.sourceClip.id,
      label: job.entry.label, game: job.entry.game, sourceEdition: job.entry.sourceEdition || job.entry.game,
      platform: job.entry.platform, sourcePage: job.entry.sourcePage, frameCount: frames.length,
      nativeSource: {catalog: job.sourceCatalog, model: resolveRecord(job.entry.model, job),
        clip: job.clipFile, publishedClip: {member: job.sourceClip.member, bytes: job.sourceClip.bytes, sha256: job.sourceClip.sha256},
        bindings: resolveRecord(job.entry.materialBindings, job), textures: job.entry.textures.map(texture => resolveRecord(texture, job)),
        archive: {sha256: job.entry.archive.sha256, bytes: job.entry.archive.bytes}},
      ticksPerSecond: job.sourceClip.ticksPerSecond, sourceNativeSampleTicks: job.nativeSampleTicks,
      sourceKeyTimeCount: job.sourceClip.nativeKeyTimesTicks.length,
      sourceMinimumPositiveKeyIntervalSeconds: Math.min(...job.sourceClip.nativeKeyTimesTicks.filter(tick => Number(tick) >= 0).map(Number).slice(1).map((tick, index) => (tick - Number(job.sourceClip.nativeKeyTimesTicks.filter(tick => Number(tick) >= 0)[index])) / job.sourceClip.ticksPerSecond)),
      sourceGameFpsCertified: false,
      actionIdentity: 'unassigned', availableCombatStates: [], originalGameFrames: false, canonicalFidelityCertified: false,
      recipe: result.recipe, measurements: result.measurements, frames, poseViews,
      limitations: ['Opaque clip codes BA/DM/UZ are retained without guessing an action.',
        'Native-key samples at sixteen instants are a sparse source observation, not a complete original-game animation cycle.',
        'The fixed 384pixel camera, lighting and renderer are this derivation recipe, not the game engine; Three.js does not apply the unsupported FBX SpecularFactor texture channel.',
        'PC/HD publication remains distinct from the original Nintendo3DS edition.',
        'No opposite view is mirrored; no gameplay state, hitbox or timing is assigned.']};
    records.push(record); writeManifest();
    console.log('RENDERED ' + record.id + ' frames=' + frames.length + ' poseViews=' + poseViews.length + ' nonrigid=' + record.measurements.maximumPairwiseDistanceDelta);
  }
  console.log(JSON.stringify({subjects: new Set(records.map(record => record.subjectId)).size, nativeScenes: records.length, frames: records.reduce((sum, record) => sum + record.frames.length, 0)}));
} finally {await browser?.close(); server.kill('SIGTERM');}
