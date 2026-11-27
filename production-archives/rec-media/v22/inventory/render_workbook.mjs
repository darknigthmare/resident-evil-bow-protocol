import fs from 'node:fs/promises';
import path from 'node:path';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
const base=process.argv[2],out=process.argv[3],only=new Set((process.argv[4]||'').split(',').filter(Boolean));
const qa=JSON.parse(await fs.readFile(path.join(base,'reports/WORKBOOK_QA_V22.json'),'utf8'));
const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(qa.target));
const rows=qa.preview_plan.filter(p=>only.size===0||only.has(p.sheetName));
for(const p of rows){
 const image=await wb.render({sheetName:p.sheetName,range:p.range,scale:1,format:'png'});
 await fs.writeFile(path.join(out,p.file),new Uint8Array(await image.arrayBuffer()));
 console.log(JSON.stringify({rendered:p.file,sheet:p.sheetName}),);
}

