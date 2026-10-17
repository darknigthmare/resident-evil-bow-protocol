/* Historical expectations are preserved; only the documented R8 successor pair
 * may replace a known digest. No blanket skip of preservation checks. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
export function r8Expected(root,file,previous){const p=path.join(root,'docs/SEQUENCES_R8_CHANGES.json');if(!fs.existsSync(p))return previous;const e=JSON.parse(fs.readFileSync(p,'utf8')).changed[file];if(!e)return previous;assert.equal(e.before,previous,'Unexpected R8 baseline '+file);return e.after;}
