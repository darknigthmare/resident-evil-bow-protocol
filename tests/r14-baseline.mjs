import {r15Expected} from './r15-baseline.mjs';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
export function r14Expected(root,key,previous){const p=path.join(root,'docs/BAKER_R14_CHANGES.json');if(!fs.existsSync(p))return r15Expected(root,key,previous);const e=JSON.parse(fs.readFileSync(p,'utf8')).changed[key];if(!e)return r15Expected(root,key,previous);assert.equal(e.before,previous,'Unexpected R14 predecessor '+key);return r15Expected(root,key,e.after);}
