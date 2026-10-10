import http from 'node:http';
import {stat,readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.RE_BOW_PORT||5173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.md':'text/plain; charset=utf-8'};
http.createServer(async(req,res)=>{
 try{const url=new URL(req.url,'http://localhost');let rel=decodeURIComponent(url.pathname);if(rel.endsWith('/'))rel+='index.html';const file=path.resolve(root,'.'+rel);if(!file.startsWith(root+path.sep))throw Error('Path outside root');if(!(await stat(file)).isFile())throw Error('Not a file');res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(await readFile(file));}
 catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Dossier introuvable. Revenez au menu principal.');}
}).listen(port,'127.0.0.1',()=>console.log(`Resident Evil — B.O.W. Protocol : http://localhost:${port}`));
