import {r13Expected} from './r13-baseline.mjs';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
export function r12Expected(root,key,previous){const file=path.join(root,'docs/FLIGHT_R12_CHANGES.json');if(!fs.existsSync(file))return r13Expected(root,key,previous);const x=JSON.parse(fs.readFileSync(file,'utf8')).changed[key];if(!x)return r13Expected(root,key,previous);assert.equal(x.before,previous,'Unexpected R12 predecessor '+key);return r13Expected(root,key,x.after);}
