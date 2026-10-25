import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function mainEnvironment(options = {}) {
  const {loadGame} = createRequire(import.meta.url)('./engine-vm.cjs');
  let html = path.join(root, 'modules/versus.html');
  if (options.historical) {
    const snapshot = path.join(root, 'modules/fidelity-r24/persistence/historical/pre-r13');
    const manifest = JSON.parse(fs.readFileSync(path.join(snapshot, 'manifest.json'), 'utf8'));
    const runtime = path.join(root, 'qa-persistence-r24-fixtures/legacy-runtime');
    fs.mkdirSync(path.join(runtime, 'modules'), {recursive: true}); fs.mkdirSync(path.join(runtime, 'src'), {recursive: true});
    for (const entry of manifest.scripts) {
      const bytes = fs.readFileSync(path.join(snapshot, entry.snapshot_path));
      if (createHash('sha256').update(bytes).digest('hex') !== entry.sha256) throw Error('Historical fixture source hash mismatch.');
      fs.writeFileSync(path.join(runtime, entry.source_path), bytes);
    }
    html = path.join(runtime, 'modules/versus.html'); fs.writeFileSync(html, fs.readFileSync(path.join(snapshot, manifest.original_html.path)));
    if (!fs.existsSync(path.join(runtime, 'assets'))) fs.symlinkSync(path.join(root, 'assets'), path.join(runtime, 'assets'), 'dir');
  }
  const environment = await loadGame(html);
  if (options.historical) environment.eval(fs.readFileSync(path.join(root, 'src/replay-vault-r13.js'), 'utf8'));
  environment.eval(fs.readFileSync(path.join(root, 'modules/fidelity-r24/persistence/verifier.js'), 'utf8'));
  return environment;
}
export async function mainFixture(options = {}) {
  const environment = await mainEnvironment(options);
  try {
    const api = environment.api();
    api.startExternal({p1: 're3r-nemesis', p2: 're1-hunter', mode: 'local', rounds: 1, seconds: 1, p2Life: 1, finishers: 'off', seed: 24824, ...options});
    if (options.excerpt) { api.advance(250); return JSON.parse(JSON.stringify(api.captureReplay())); }
    for (let n = 0; n < 2000 && !api.getState().finished; n++) api.advance(250);
    if (!api.getState().finished) throw Error('Real fixture match failed to terminate.');
    return JSON.parse(JSON.stringify(api.getLastReplay()));
  } finally { environment.dispose(); }
}
export function catalogEnvironment() {
  const context = {TextEncoder}; context.globalThis = context; context.window = context; vm.createContext(context);
  for (const file of ['re-data', 'catalog-expansion-data', 'catalog-trial-adapter', 'spatial-weakpoints-v072', 'combat-foundation-v060', 'catalog-replay-contract', 'catalog-replay-r7']) vm.runInContext(fs.readFileSync(path.join(root, 'src/' + file + '.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'modules/fidelity-r24/persistence/verifier.js'), 'utf8'), context);
  return context;
}
export function catalogFixture(options = {}) {
  const context = catalogEnvironment(), D = context.RE_DATA;
  const {frameCount = 360, ...configuration} = options;
  const recorder = context.RE_CATALOG_REPLAY.create({uid: 're3r-nemesis', target: 're3r-stage-2-nemesis', stage: D.stages[0].id, mode: 'human', seed: 24824, ...configuration});
  for (let frame = 0; frame < frameCount && !recorder.getState().finished; frame++) recorder.step({right: frame % 230 < 90, left: frame % 230 > 180, guard: frame % 130 > 105, jump: frame % 181 === 0, slot: frame % 39 === 0 ? 'light' : frame % 77 === 0 ? 'special' : null});
  return JSON.parse(JSON.stringify(recorder.exportValue()));
}
