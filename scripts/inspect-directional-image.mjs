/** Prepare a measured descriptor for an artist's actual file. Never auto-approve art. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';import {dimensions} from './directional-image-metadata.mjs';
const R=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),[file,direction]=process.argv.slice(2);
if(!file||!['left','right'].includes(direction)){console.error('Usage: npm run inspect:directional-image -- assets/lateral/<uid>/left.png left');process.exit(2);}
const relative=path.relative(R,path.resolve(R,file)).replaceAll('\\','/');if(!/^assets\/lateral\/[\w./-]+\.(png|webp)$/.test(relative)||relative.split('/').includes('..'))throw Error('Use an existing local file under assets/lateral/');
const real=fs.realpathSync(path.join(R,relative));if(!real.startsWith(fs.realpathSync(path.join(R,'assets'))+path.sep))throw Error('Image escapes project');
const bytes=fs.readFileSync(real),{width,height}=dimensions(bytes);
console.log(JSON.stringify({path:relative,facing:direction,projection:'side',reviewed:false,width,height,anchor:[.5,1],sha256:crypto.createHash('sha256').update(bytes).digest('hex')},null,2));
console.error('Descriptor only. Review exact incarnation, opposite anatomical side, full body and feet before setting reviewed:true. No files were changed.');
