import {r17Expected} from './r17-baseline.mjs';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
export function r16Expected(root,key,previous){const p=path.join(root,'docs/TRIAL_AUDIO_R16_CHANGES.json');if(!fs.existsSync(p))return r17Expected(root,key,previous);const x=JSON.parse(fs.readFileSync(p,'utf8')).changed[key];if(!x)return r17Expected(root,key,previous);assert.equal(x.before,previous,'Unexpected R16 predecessor '+key);return r17Expected(root,key,x.after);}
