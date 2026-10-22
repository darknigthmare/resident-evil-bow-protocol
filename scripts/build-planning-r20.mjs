/**
 * Build the R20 tracker from checked source records and the sprite manifest.
 * Run a copy from a scratch directory with node_modules linked to the primary runtime.
 * Usage: $CODEX_PRIMARY_RUNTIME_NODE build-planning-r20.mjs /absolute/project/root
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';

const root=path.resolve(process.argv[2]||process.cwd());
const previewDir=path.resolve(process.argv[3]||path.join(process.cwd(),'previews'));
const readJSON=async file=>JSON.parse(await fs.readFile(path.join(root,file),'utf8'));
const tracking=await readJSON('docs/R20_TRACKING.json');
const data=await readJSON('data/roster.json');
const expansion=await readJSON('data/catalog-expansion-v070.json');
const manifest=await readJSON('assets/sprites/bow/manifest.json');
const art=new Map(manifest.sprites.map(x=>[x.id,x]));
const pngById=new Map(await Promise.all(manifest.sprites.map(async item=>{
  const folder=path.posix.dirname(item.image);
  const names=await fs.readdir(path.join(root,folder));
  const files=names.filter(name=>name.toLowerCase().endsWith('.png')).sort().map(name=>folder+'/'+name);
  assert(files.includes(item.image),'Missing primary PNG '+item.id);
  assert.deepEqual(files,[item.image,...(item.variants||[]).map(variant=>variant.image)].sort(),'PNG inventory disagrees with manifest: '+item.id);
  return [item.id,files];
})));
const pngCount=[...pngById.values()].reduce((total,files)=>total+files.length,0);
const fighters=new Map(data.fighters.map(x=>[x.uid,x]));
const extended=new Map(expansion.records.map(x=>[x.id,x]));
assert.equal(new Set(data.catalog.map(x=>x.id)).size,tracking.counts.catalogIdentities);
assert.equal(data.fighters.length,tracking.counts.mainFighters);
assert.equal(expansion.fighters.length,tracking.counts.experimentalFighters);
assert.equal(manifest.sprites.length,tracking.spriteProduction.identities);
assert.equal(pngCount,tracking.spriteProduction.pngFiles);
assert.equal(data.catalog.length-manifest.sprites.length,tracking.spriteProduction.remainingIdentitiesWithoutR20Png);
assert.equal(manifest.sprites.filter(item=>item.integration?.versusSelection).length,tracking.spriteProduction.versusSelectionIdentities);
for(const item of manifest.sprites){
  assert(data.catalog.some(x=>x.id===item.id),'Unknown sprite '+item.id);
  await fs.stat(path.join(root,item.image));
  assert.equal(item.modularParts,false,'Review tracker when modular parts are authored');
}
const ordered=[...data.catalog].sort((a,b)=>(Number(art.has(b.id))-Number(art.has(a.id)))||(Number(fighters.has(b.id))-Number(fighters.has(a.id)))||a.id.localeCompare(b.id));
const spriteRows=ordered.map(item=>{
  const added=art.get(item.id),base=fighters.get(item.id),record=extended.get(item.id);
  const usage=base?'Principal':record?.classification==='contextual'?'Contextuel':'Expérimental';
  const destination=added?(['Menu',...(added.integration?.versusSelection?['Sélection Versus']:[]),'DEV'].join(' · ')):'';
  const files=pngById.get(item.id)||[];
  const remainder=added?'Membres séparés, sens opposé, cycles de mouvement et revue canonique.':'PNG indépendant R20 à produire, puis rig, orientations, mouvements et revue.';
  return [item.id,base?.name||item.name,base?.ep||item.game,usage,added?'PRODUIT':'À PRODUIRE',files.length,added?.modularParts?'OUI':'NON',added?.combatIntegrated?'OUI':'NON',destination,files.join('\n'),remainder,item.sourcePage||record?.source||base?.reference||''];
});

const workbook=Workbook.create();
const suivi=workbook.worksheets.add('Suivi');
const sprites=workbook.worksheets.add('Sprites');
const qa=workbook.worksheets.add('QA');
const palette={ink:'#24282D',muted:'#636B73',red:'#813B48',header:'#343840',line:'#D9DDE2',light:'#F1F3F5',amber:'#FFF0C9',danger:'#FCE4E6'};
const font='Arial';
function base(sheet,range){
  sheet.showGridLines=false;
  sheet.getRange(range).format={font:{name:font,size:10,color:palette.ink},verticalAlignment:'center',rowHeight:22};
  sheet.getRange('A1:K1').format.rowHeight=12;
  sheet.getRange('A2').format.font={name:font,size:16,bold:true,color:palette.ink};
  sheet.getRange('A3').format.font={name:font,size:10,color:palette.muted};
}
function title(sheet,text,note){sheet.getRange('A2').values=[[text]];sheet.getRange('A3').values=[[note]];}
function table(sheet,headers,rows,start,name,widths,heights){
  const end=start+rows.length,last=String.fromCharCode(64+headers.length);
  sheet.getRange(`A${start}:${last}${end}`).values=[headers,...rows];
  const head=sheet.getRange(`A${start}:${last}${start}`);
  head.format={fill:palette.header,font:{name:font,size:10,color:'#FFFFFF',bold:true},horizontalAlignment:'center',verticalAlignment:'center',wrapText:true,rowHeight:34,borders:{insideVertical:{color:'#FFFFFF',style:'thin'}}};
  const body=sheet.getRange(`A${start+1}:${last}${end}`);
  body.format.wrapText=true;body.format.rowHeight=heights;body.format.verticalAlignment='center';
  for(let col=0;col<widths.length;col++)sheet.getRange(`${String.fromCharCode(65+col)}1:${String.fromCharCode(65+col)}${end}`).format.columnWidth=widths[col];
  const t=sheet.tables.add(`A${start}:${last}${end}`,true,name);t.showFilterButton=true;t.style='TableStyleLight1';
  body.format.fill='#FFFFFF';
  for(let row=start+1;row<=end;row++)if((row-start)%2===0)sheet.getRange(`A${row}:${last}${row}`).format.fill='#F3F4F6';
  head.format.fill=palette.header;head.format.font={name:font,size:10,color:'#FFFFFF',bold:true};
  sheet.freezePanes.freezeRows(start);sheet.freezePanes.freezeColumns(1);
  return {start:start+1,end};
}
base(suivi,'A1:G35');suivi.tabColor=palette.red;
title(suivi,'B.O.W. Protocol — interface et sprites R20','22 octobre 2026. Suivi de production. Les lots globaux restent ouverts tant que leur portée complète n’est pas vérifiée.');
const taskRows=tracking.tasks.map(t=>[t.id,t.kind,t.title,t.status,t.delivered,t.remaining,[t.evidence,t.source].filter(Boolean).join('\nSource : ')]);
const taskRange=table(suivi,['ID','Périmètre','Chantier','Statut','Acquis de cette passe','À terminer','Preuve et source'],taskRows,7,'R20Travaux',[23,23,36,18,68,70,68],56);
suivi.getRange('A4').values=[['Travaux R20 validés']];suivi.getRange('C4').values=[['PNG R20 produits']];suivi.getRange('E4').values=[['Lots globaux clos']];suivi.getRange('G4').values=[['Identités suivies']];
suivi.getRange('A5').formulas=[['=COUNTIFS(B8:B1000,"Livraison R20",D8:D1000,"VALIDÉ")']];
suivi.getRange('C5').formulas=[['=SUMIF(\'Sprites\'!E7:E1000,"PRODUIT",\'Sprites\'!F7:F1000)']];
suivi.getRange('E5').formulas=[['=COUNTIFS(B8:B1000,"Lot global",D8:D1000,"CLOS")']];
suivi.getRange('G5').formulas=[['=COUNTA(\'Sprites\'!A7:A1000)']];
for(const col of ['A','C','E','G']){suivi.getRange(`${col}4`).format.font={name:font,size:10,color:palette.muted};suivi.getRange(`${col}5`).format.font={name:font,size:16,bold:true,color:palette.red};suivi.getRange(`${col}5`).format.numberFormat='#,##0';suivi.getRange(`${col}5`).format.horizontalAlignment='left';}
suivi.getRange(`D${taskRange.start}:D${taskRange.end}`).dataValidation={rule:{type:'list',values:['VALIDÉ','EN COURS','À FAIRE','À VÉRIFIER','BLOQUÉ','CLOS']}};
suivi.getRange(`D${taskRange.start}:D${taskRange.end}`).conditionalFormats.add('cellIs',{operator:'equal',formula:'"À FAIRE"',format:{fill:palette.amber,font:{color:'#725014'}}});
suivi.getRange(`D${taskRange.start}:D${taskRange.end}`).conditionalFormats.add('cellIs',{operator:'equal',formula:'"BLOQUÉ"',format:{fill:palette.danger,font:{color:'#8C2732',bold:true}}});

base(sprites,`A1:L${spriteRows.length+6}`);
title(sprites,'Sprites par incarnation',`${manifest.sprites.length} identités couvertes, ${pngCount} PNG statiques ; ${data.catalog.length-manifest.sprites.length} identités sans PNG R20. Rig, orientations et animations restent à produire.`);
const spriteRange=table(sprites,['UID','B.O.W.','Incarnation','Parcours','PNG R20','Fichiers PNG','Rig par membre','En combat','Affichage R20','Fichiers R20','Reste à produire','Référence du catalogue'],spriteRows,6,'R20Sprites',[31,39,39,20,20,12,15,13,35,69,66,79],42);
sprites.getRange(`F${spriteRange.start}:F${spriteRange.end}`).format.numberFormat='#,##0';
sprites.getRange(`F${spriteRange.start}:H${spriteRange.end}`).format.horizontalAlignment='center';
sprites.getRange(`E${spriteRange.start}:E${spriteRange.end}`).dataValidation={rule:{type:'list',values:['PRODUIT','À PRODUIRE']}};
sprites.getRange(`E${spriteRange.start}:E${spriteRange.end}`).conditionalFormats.add('cellIs',{operator:'equal',formula:'"À PRODUIRE"',format:{fill:palette.amber,font:{color:'#725014'}}});
sprites.freezePanes.freezeColumns(2);

base(qa,`A1:G${tracking.qa.length+6}`);
title(qa,'Vérifications exécutées','La base R18/R19 et le candidat R20 sont distingués. Les erreurs injectées et les limites de la recette figurent dans la portée.');
const qaRows=tracking.qa.map(q=>[q.id,q.suite,q.status,q.passed,q.failed,q.scope,q.evidence]);
const qaRange=table(qa,['ID','Contrôle','État','Réussis','Échecs','Portée','Preuve'],qaRows,6,'R20Verification',[24,48,20,12,12,80,69],46);
qa.getRange(`D${qaRange.start}:E${qaRange.end}`).format.numberFormat='#,##0';
qa.getRange(`D${qaRange.start}:E${qaRange.end}`).format.horizontalAlignment='center';
qa.getRange(`E${qaRange.start}:E${qaRange.end}`).conditionalFormats.add('cellIs',{operator:'greaterThan',formula:0,format:{fill:palette.danger,font:{color:'#8C2732',bold:true}}});

// Prove the summaries react to edited task and sprite records, then restore source data.
const firstTask=tracking.tasks.findIndex(t=>t.kind==='Livraison R20')+8;
const beforeTasks=Number(suivi.getRange('A5').values[0][0]);
const oldStatus=suivi.getRange(`D${firstTask}`).values[0][0];
suivi.getRange(`D${firstTask}`).values=[[oldStatus==='VALIDÉ'?'EN COURS':'VALIDÉ']];
assert.equal(Number(suivi.getRange('A5').values[0][0]),beforeTasks+(oldStatus==='VALIDÉ'?-1:1));
suivi.getRange(`D${firstTask}`).values=[[oldStatus]];
const beforeArt=Number(suivi.getRange('C5').values[0][0]);
const oldArt=sprites.getRange('E7').values[0][0];
sprites.getRange('E7').values=[[oldArt==='PRODUIT'?'À PRODUIRE':'PRODUIT']];
assert.equal(Number(suivi.getRange('C5').values[0][0]),beforeArt+(oldArt==='PRODUIT'?-1:1)*Number(sprites.getRange('F7').values[0][0]));
sprites.getRange('E7').values=[[oldArt]];
workbook.recalculate();
assert.equal(Number(suivi.getRange('C5').values[0][0]),pngCount);
assert.equal(Number(suivi.getRange('E5').values[0][0]),0);
assert.equal(Number(suivi.getRange('G5').values[0][0]),data.catalog.length);
const overview=await workbook.inspect({kind:'table',range:'Suivi!A4:G8',include:'values,formulas',tableMaxRows:5,tableMaxCols:7,maxChars:4500});
const errors=await workbook.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:80},summary:'Final R20 formula error scan'});
assert(errors.ndjson.includes('Cell search matched 0 entries.'),'Unexpected spreadsheet formula error: '+errors.ndjson);
await fs.mkdir(previewDir,{recursive:true});
for(const [sheetName,range]of[['Suivi',`A1:G${taskRange.end}`],['Sprites','A1:L12'],['QA',`A1:G${qaRange.end}`]]){
  const png=await workbook.render({sheetName,range,scale:1,format:'png'});
  await fs.writeFile(path.join(previewDir,sheetName.toLowerCase()+'.png'),new Uint8Array(await png.arrayBuffer()));
}
const output=path.join(root,'docs/planning/BOW_INTERFACE_SPRITES_R20.xlsx');
await fs.mkdir(path.dirname(output),{recursive:true});
const temporaryExport=path.join(previewDir,'BOW_INTERFACE_SPRITES_R20.xlsx');
const xlsx=await SpreadsheetFile.exportXlsx(workbook);await xlsx.save(temporaryExport);
const staging=path.join(root,'docs','R20_WORKBOOK_BUILD.tmp');
await fs.copyFile(temporaryExport,staging);await fs.rename(staging,output);
await fs.rm(temporaryExport+'.inspect.ndjson',{force:true});
const stats={schema:'re.bow.workbook-validation/1',release:'R20',output:'docs/planning/BOW_INTERFACE_SPRITES_R20.xlsx',sheets:['Suivi','Sprites','QA'],tasks:tracking.tasks.length,catalogIdentities:spriteRows.length,generatedPoseAssets:pngCount,generatedIdentities:manifest.sprites.length,versusSelectionIdentities:manifest.sprites.filter(item=>item.integration?.versusSelection).length,combatIntegratedIdentities:manifest.sprites.filter(item=>item.combatIntegrated).length,globallyClosed:0,formulaRecalculation:'Task status and generated-sprite status changed, dependency values checked, then restored.',formulaErrors:errors.ndjson,overview:overview.ndjson,sha256:crypto.createHash('sha256').update(await fs.readFile(output)).digest('hex'),qaRows:tracking.qa.length};
await fs.writeFile(path.join(root,'docs/R20_WORKBOOK_VALIDATION.json'),JSON.stringify(stats,null,2)+'\n');
console.log(JSON.stringify({output,...Object.fromEntries(Object.entries(stats).filter(([k])=>['tasks','catalogIdentities','generatedPoseAssets','globallyClosed','qaRows','sha256'].includes(k)))}));
