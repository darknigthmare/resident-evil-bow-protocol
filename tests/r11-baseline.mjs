import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
export function r11Expected(root,key,previous){const p=path.join(root,'docs/LUCAS_R11_CHANGES.json');if(!fs.existsSync(p))return previous;const e=JSON.parse(fs.readFileSync(p,'utf8')).changed[key];if(!e)return previous;assert.equal(e.before,previous,'Unexpected R11 predecessor '+key);return e.after;}
