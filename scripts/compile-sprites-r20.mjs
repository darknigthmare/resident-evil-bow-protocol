import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/sprites/bow/manifest.json'), 'utf8'));
const file = path.join(root, 'src/bow-sprite-library-r20.js');
const source = fs.readFileSync(file, 'utf8');
const expression = /\/\* SPRITES_R20_START \*\/[\s\S]*?\/\* SPRITES_R20_END \*\//;
if (!expression.test(source)) throw new Error('Sprite registry markers are missing.');
const next = source.replace(expression, '/* SPRITES_R20_START */ ' + JSON.stringify(manifest) + ' /* SPRITES_R20_END */');
if (process.argv.includes('--check')) {
  if (next !== source) throw new Error('Sprite runtime and manifest differ; run node scripts/compile-sprites-r20.mjs.');
  console.log('R20 sprite manifest and runtime registry match.');
} else {
  fs.writeFileSync(file, next);
  console.log(`R20 sprite registry: ${manifest.sprites.length} independent identities.`);
}
