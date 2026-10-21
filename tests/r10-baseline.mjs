import {r11Expected} from './r11-baseline.mjs';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
export function r10Expected(root,file,previous){const p=path.join(root,'docs/DELIVERY_R10_CHANGES.json');if(!fs.existsSync(p))return r11Expected(root,file,previous);const e=JSON.parse(fs.readFileSync(p,'utf8')).changed[file];if(!e)return r11Expected(root,file,previous);assert.equal(e.before,previous,'Unexpected R10 predecessor '+file);return r11Expected(root,file,e.after);}
