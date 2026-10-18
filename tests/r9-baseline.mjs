import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
export function r9Expected(root,file,previous){const p=path.join(root,'docs/AUDIT_R9_CHANGES.json');if(!fs.existsSync(p))return previous;const e=JSON.parse(fs.readFileSync(p,'utf8')).changed[file];if(!e)return previous;assert.equal(e.before,previous,'Unexpected R9 predecessor '+file);return e.after;}
