import {r16Expected} from './r16-baseline.mjs';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
export function r15Expected(root,key,previous){const p=path.join(root,'docs/BAKER_AUDIO_R15_CHANGES.json');if(!fs.existsSync(p))return r16Expected(root,key,previous);const x=JSON.parse(fs.readFileSync(p,'utf8')).changed[key];if(!x)return r16Expected(root,key,previous);assert.equal(x.before,previous,'Unexpected R15 predecessor '+key);return r16Expected(root,key,x.after);}
