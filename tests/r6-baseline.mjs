/** Historical presentation-only baselines remain immutable. R6 explicitly edits
 * four gameplay paths; check their reviewed successor hashes rather than silently
 * claiming combat remained unchanged. New R6 tests inspect each changed profile. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
export function r6Expected(root,key,previous){
 const file=path.join(root,'docs/COMBAT_STAGE_R6_BASELINES.json');if(!fs.existsSync(file))return previous;
 const edit=JSON.parse(fs.readFileSync(file,'utf8')).changed[key];if(!edit)return previous;
 assert.equal(edit.before,previous,'Unexpected historical baseline '+key);return edit.after;
}
