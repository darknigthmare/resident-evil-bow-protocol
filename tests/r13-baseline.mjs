import {r14Expected} from './r14-baseline.mjs';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
export function r13Expected(root,key,previous){const file=path.join(root,'docs/REPLAY_R13_CHANGES.json');if(!fs.existsSync(file))return r14Expected(root,key,previous);const d=JSON.parse(fs.readFileSync(file,'utf8')).changed[key];if(!d)return r14Expected(root,key,previous);assert.equal(d.before,previous,'Unexpected R13 predecessor '+key);return r14Expected(root,key,d.after);}
